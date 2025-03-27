// @/lib/db/order.search.engine.ts
// Author: Abdoulaye Diallo
// Description: Moteur de recherche optimisé pour les commandes avec pagination et filtres avancés

import { and, asc, desc, eq, gte, lte, sql, SQL } from "drizzle-orm";
import { db } from "./";
import {
  orders,
  orderItems,
  products,
  users,
  stores,
  addresses,
  payments,
  shipments,
  drivers,
  orderStatuses,
  paymentStatuses,
  paymentMethods,
} from "./schema";
import { redis } from "@/lib/redis";

// Types locaux
export interface Order {
  id: number;
  userId: number;
  originAddressId: number | null;
  destinationAddressId: number | null;
  totalDeliveryFee: number | null;
  status: string;
  estimatedDeliveryDate: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  user: {
    id: number;
    name: string | null;
    email: string | null;
    phoneNumber: string;
  };
  originAddress?: {
    id: number;
    recipient: string;
    region: string;
    formattedAddress: string;
  };
  destinationAddress?: {
    id: number;
    recipient: string;
    region: string;
    formattedAddress: string;
  };
  items: {
    id: number;
    productId: number;
    quantity: number;
    price: number;
    product: {
      id: number;
      name: string;
      storeId: number;
      store: {
        id: number;
        name: string;
      };
    };
  }[];
  payment?: {
    id: number;
    amount: number;
    paymentMethod: string;
    status: string;
    transactionId: string | null;
  };
  shipment?: {
    id: number;
    status: string;
    driver?: {
      id: number;
      userId: number;
      user: {
        name: string | null;
        phoneNumber: string;
      };
      vehicleType: string;
      plateNumber: string;
    };
  };
}

export interface OrderFiltersTypes {
  userId?: number;
  storeId?: number;
  driverId?: number;
  status?: string[];
  paymentStatus?: string[];
  paymentMethod?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  region?: string;
  searchTerm?: string;
  minAmount?: number;
  maxAmount?: number;
}

export type OrderSortOption =
  | "newest"
  | "oldest"
  | "amount_asc"
  | "amount_desc"
  | "delivery_date_asc"
  | "delivery_date_desc";

export interface OrderPagination {
  page: number;
  perPage: number;
}

export interface OrderSearchParams {
  filters?: OrderFiltersTypes;
  sort?: OrderSortOption;
  pagination?: OrderPagination;
  useCache?: boolean;
}

export interface OrderSearchResult {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
  metadata?: {
    filtersApplied: OrderFiltersTypes;
    sortApplied: OrderSortOption;
    paginationApplied: OrderPagination;
  };
}

/**
 * Construit les conditions SQL WHERE en fonction des filtres
 */
function buildOrderWhereConditions(filters: OrderFiltersTypes = {}): SQL[] {
  const conditions: SQL[] = [];

  // Filtre par utilisateur
  if (filters.userId !== undefined) {
    conditions.push(eq(orders.userId, filters.userId));
  }

  // Filtre par boutique
  if (filters.storeId !== undefined) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${orderItems.orderId}
        FROM ${orderItems}
        JOIN ${products} ON ${orderItems.productId} = ${products.id}
        WHERE ${products.storeId} = ${filters.storeId}
      )`
    );
  }

  // Filtre par chauffeur
  if (filters.driverId !== undefined) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${shipments.orderId}
        FROM ${shipments}
        WHERE ${shipments.driverId} = ${filters.driverId}
      )`
    );
  }

  // Filtre par statut de commande
  if (filters.status?.length) {
    conditions.push(sql`${orders.status} IN (${sql.join(filters.status, sql`, `)})`);
  }

  // Filtre par statut de paiement
  if (filters.paymentStatus?.length) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${payments.orderId}
        FROM ${payments}
        WHERE ${payments.status} IN (${sql.join(filters.paymentStatus, sql`, `)})
      )`
    );
  }

  // Filtre par méthode de paiement
  if (filters.paymentMethod?.length) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${payments.orderId}
        FROM ${payments}
        WHERE ${payments.paymentMethod} IN (${sql.join(filters.paymentMethod, sql`, `)})
      )`
    );
  }

     // Filtre par plage de dates
    if (filters.dateRange) {
    const { start, end } = filters.dateRange;
    conditions.push(
        sql`${orders.createdAt} BETWEEN ${start} AND ${end}`
    );
    }

  // Filtre par région
  if (filters.region) {
    conditions.push(
      sql`(${orders.destinationAddressId} IN (
        SELECT ${addresses.id}
        FROM ${addresses}
        WHERE ${addresses.region} = ${filters.region}
      ) OR ${orders.originAddressId} IN (
        SELECT ${addresses.id}
        FROM ${addresses}
        WHERE ${addresses.region} = ${filters.region}
      ))`
    );
  }

  // Filtre par terme de recherche
  if (filters.searchTerm) {
    const searchTerm = `%${filters.searchTerm.toLowerCase()}%`;
    conditions.push(
      sql`(
        ${orders.id}::text LIKE ${searchTerm}
        OR EXISTS (
          SELECT 1 FROM ${users}
          WHERE ${users.id} = ${orders.userId}
          AND (
            ${users.name} ILIKE ${searchTerm}
            OR ${users.email} ILIKE ${searchTerm}
            OR ${users.phoneNumber} ILIKE ${searchTerm}
          )
        )
        OR EXISTS (
          SELECT 1 FROM ${orderItems}
          JOIN ${products} ON ${orderItems.productId} = ${products.id}
          WHERE ${orderItems.orderId} = ${orders.id}
          AND ${products.name} ILIKE ${searchTerm}
        )
      )`
    );
  }

  // Filtre par montant minimum
  if (filters.minAmount !== undefined) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${payments.orderId}
        FROM ${payments}
        WHERE ${payments.amount} >= ${filters.minAmount}
      )`
    );
  }

  // Filtre par montant maximum
  if (filters.maxAmount !== undefined) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${payments.orderId}
        FROM ${payments}
        WHERE ${payments.amount} <= ${filters.maxAmount}
      )`
    );
  }

  return conditions;
}

/**
 * Construit la clause ORDER BY en fonction de l'option de tri
 */
function buildOrderOrderBy(sort: OrderSortOption = "newest"): SQL {
  switch (sort) {
    case "oldest":
      return sql`${orders.createdAt} ASC`;
    case "amount_asc":
      return sql`(
        SELECT ${payments.amount}
        FROM ${payments}
        WHERE ${payments.orderId} = ${orders.id}
        LIMIT 1
      ) ASC`;
    case "amount_desc":
      return sql`(
        SELECT ${payments.amount}
        FROM ${payments}
        WHERE ${payments.orderId} = ${orders.id}
        LIMIT 1
      ) DESC`;
    case "delivery_date_asc":
      return sql`${orders.estimatedDeliveryDate} ASC NULLS LAST`;
    case "delivery_date_desc":
      return sql`${orders.estimatedDeliveryDate} DESC NULLS LAST`;
    case "newest":
    default:
      return sql`${orders.createdAt} DESC`;
  }
}

/**
 * Recherche des commandes avec filtres, tri et pagination
 */
export async function searchOrders({
  filters = {},
  sort = "newest",
  pagination = { page: 1, perPage: 10 },
  useCache = true,
}: OrderSearchParams = {}): Promise<OrderSearchResult> {
  const cacheKey = `orders:search:${JSON.stringify({ filters, sort, pagination })}`;

  try {
    if (useCache) {
      const cachedResult = await redis.get(cacheKey);
      if (cachedResult) {
        return cachedResult as OrderSearchResult;
      }
    }

    // Validation de la pagination
    if (pagination.page < 1) pagination.page = 1;
    if (pagination.perPage < 1 || pagination.perPage > 100) pagination.perPage = 10;

    const whereConditions = buildOrderWhereConditions(filters);
    const orderBy = buildOrderOrderBy(sort);

    // Calcul du total
    const totalQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(...whereConditions));
    const total = Number(totalQuery[0]?.count ?? 0);
    const totalPages = Math.ceil(total / pagination.perPage);

    if (total === 0) {
      return {
        orders: [],
        total: 0,
        page: pagination.page,
        totalPages: 0,
      };
    }

    // Correction de la page si elle dépasse le total
    if (pagination.page > totalPages) {
      pagination.page = totalPages;
    }

    const offset = (pagination.page - 1) * pagination.perPage;

    const ordersQuery = db
      .select({
        order: orders,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
        originAddress: sql`COALESCE((
          SELECT json_build_object(
            'id', oa.id,
            'recipient', oa.recipient,
            'region', oa.region,
            'formattedAddress', oa.formatted_address
          )
          FROM ${addresses} oa
          WHERE oa.id = ${orders.originAddressId}
        ), NULL) AS origin_address`,
        destinationAddress: sql`COALESCE((
          SELECT json_build_object(
            'id', da.id,
            'recipient', da.recipient,
            'region', da.region,
            'formattedAddress', da.formatted_address
          )
          FROM ${addresses} da
          WHERE da.id = ${orders.destinationAddressId}
        ), NULL) AS destination_address`,
        items: sql`(
          SELECT json_agg(json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'storeId', p.store_id,
              'store', json_build_object(
                'id', s.id,
                'name', s.name
              )
            )
          ))
          FROM ${orderItems} oi
          JOIN ${products} p ON oi.product_id = p.id
          JOIN ${stores} s ON p.store_id = s.id
          WHERE oi.order_id = ${orders.id}
        ) AS items`,
        payment: sql`COALESCE((
          SELECT json_build_object(
            'id', p.id,
            'amount', p.amount,
            'paymentMethod', p.payment_method,
            'status', p.status,
            'transactionId', p.transaction_id
          )
          FROM ${payments} p
          WHERE p.order_id = ${orders.id}
          LIMIT 1
        ), NULL) AS payment`,
        shipment: sql`COALESCE((
          SELECT json_build_object(
            'id', s.id,
            'status', s.status,
            'driver', CASE WHEN s.driver_id IS NULL THEN NULL ELSE json_build_object(
              'id', d.id,
              'userId', d.user_id,
              'user', json_build_object(
                'name', u.name,
                'phoneNumber', u.phone_number
              ),
              'vehicleType', d.vehicle_type,
              'plateNumber', d.plate_number
            ) END
          )
          FROM ${shipments} s
          LEFT JOIN ${drivers} d ON s.driver_id = d.id
          LEFT JOIN ${users} u ON d.user_id = u.id
          WHERE s.order_id = ${orders.id}
          LIMIT 1
        ), NULL) AS shipment`,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(pagination.perPage)
      .offset(offset);

    const result = await ordersQuery;

    const formattedOrders: Order[] | any = result.map((row) => ({
      ...row.order,
      user: row.user,
      originAddress: row.originAddress,
      destinationAddress: row.destinationAddress,
      items: row.items || [],
      payment: row.payment,
      shipment: row.shipment,
    }));

    const searchResult: OrderSearchResult = {
      orders: formattedOrders,
      total,
      page: pagination.page,
      totalPages,
      metadata: {
        filtersApplied: filters,
        sortApplied: sort,
        paginationApplied: pagination,
      },
    };

    if (useCache) {
      await redis.set(cacheKey, searchResult, { ex: 180 }); // Cache pendant 3 minutes
    }

    return searchResult;
  } catch (error) {
    console.error("Erreur lors de la recherche des commandes:", error);
    throw new Error("Impossible de récupérer les commandes");
  }
}

/**
 * Récupère une commande spécifique avec toutes ses relations
 */
export async function getOrderWithDetails(orderId: number): Promise<Order | null> {
  const cacheKey = `order:details:${orderId}`;
  try {
    const cachedOrder = await redis.get(cacheKey);
    if (cachedOrder) {
      return cachedOrder as Order;
    }

    const result = await db
      .select({
        order: orders,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
        originAddress: sql`COALESCE((
          SELECT json_build_object(
            'id', oa.id,
            'recipient', oa.recipient,
            'region', oa.region,
            'formattedAddress', oa.formatted_address
          )
          FROM ${addresses} oa
          WHERE oa.id = ${orders.originAddressId}
        ), NULL) AS origin_address`,
        destinationAddress: sql`COALESCE((
          SELECT json_build_object(
            'id', da.id,
            'recipient', da.recipient,
            'region', da.region,
            'formattedAddress', da.formatted_address
          )
          FROM ${addresses} da
          WHERE da.id = ${orders.destinationAddressId}
        ), NULL) AS destination_address`,
        items: sql`(
          SELECT json_agg(json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'storeId', p.store_id,
              'store', json_build_object(
                'id', s.id,
                'name', s.name
              )
            )
          ))
          FROM ${orderItems} oi
          JOIN ${products} p ON oi.product_id = p.id
          JOIN ${stores} s ON p.store_id = s.id
          WHERE oi.order_id = ${orders.id}
        ) AS items`,
        payment: sql`COALESCE((
          SELECT json_build_object(
            'id', p.id,
            'amount', p.amount,
            'paymentMethod', p.payment_method,
            'status', p.status,
            'transactionId', p.transaction_id
          )
          FROM ${payments} p
          WHERE p.order_id = ${orders.id}
          LIMIT 1
        ), NULL) AS payment`,
        shipment: sql`COALESCE((
          SELECT json_build_object(
            'id', s.id,
            'status', s.status,
            'driver', CASE WHEN s.driver_id IS NULL THEN NULL ELSE json_build_object(
              'id', d.id,
              'userId', d.user_id,
              'user', json_build_object(
                'name', u.name,
                'phoneNumber', u.phone_number
              ),
              'vehicleType', d.vehicle_type,
              'plateNumber', d.plate_number
            ) END
          )
          FROM ${shipments} s
          LEFT JOIN ${drivers} d ON s.driver_id = d.id
          LEFT JOIN ${users} u ON d.user_id = u.id
          WHERE s.order_id = ${orders.id}
          LIMIT 1
        ), NULL) AS shipment`,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    const order: Order | any = {
      ...row.order,
      user: row.user,
      originAddress: row.originAddress,
      destinationAddress: row.destinationAddress,
      items: row.items || [],
      payment: row.payment,
      shipment: row.shipment,
    };

    await redis.set(cacheKey, order, { ex: 300 }); // Cache pendant 5 minutes

    return order;
  } catch (error) {
    console.error("Erreur lors de la récupération de la commande:", error);
    throw new Error("Impossible de récupérer la commande");
  }
}

/**
 * Invalide le cache des commandes
 */
export async function invalidateOrderCache(orderId: number) {
  const cacheKeys = [
    `order:details:${orderId}`,
    ...(await redis.keys(`orders:search:*"id":${orderId}*`)),
  ];
  
  if (cacheKeys.length > 0) {
    await redis.del(...cacheKeys);
  }
}