import { and, desc, eq, inArray, sql, SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";
import { 
  shipments, 
  orderStatuses,
  paymentStatuses,
  paymentMethods,
  shipmentStatuses,
  orders,
  orderItems,
  products,
  stores,
  payments,
  users,
  addresses,
  drivers,
  geolocations,
  orderStatusHistory,
  supportTickets,
  productStocks,
  dynamicDeliveryFees,
  storeOrders
} from "@/lib/db/schema";

// Types basés sur les enums du schéma
export type OrderStatus = typeof orderStatuses.enumValues[number];
export type PaymentStatus = typeof paymentStatuses.enumValues[number];
export type PaymentMethod = typeof paymentMethods.enumValues[number];
export type ShipmentStatus = typeof shipmentStatuses.enumValues[number];

// Interface pour les détails d'une sous-commande
export interface StoreOrderWithDetails {
  id: number;
  orderId: number;
  storeId: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  shipmentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  order: {
    id: number;
    userId: number;
    destinationAddressId: number;
    status: OrderStatus;
    estimatedDeliveryDate: Date | null;
  };
  store: {
    id: number;
    name: string;
  };
  user: { // Ajout des informations de l'utilisateur
    id: number;
    name: string;
    email: string;
    phoneNumber: string | null;
  };
  originAddress?: {
    id: number;
    userId: number;
    recipient: string;
    location: any;
    region: string | null;
    formattedAddress: string;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    deliveryInstructions: string | null;
    photoUrl: string | null;
  };
  destinationAddress?: {
    id: number;
    userId: number;
    recipient: string;
    location: any;
    region: string | null;
    formattedAddress: string;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    deliveryInstructions: string | null;
    photoUrl: string | null;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
    product: {
      id: number;
      name: string;
      currentStock?: number;
    };
  }>;
  payment?: {
    id: number;
    amount: number;
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    transactionId: string | null;
    createdAt: Date;
  };
  driver?: {
    id: number;
    name: string;
    phoneNumber: string;
    vehicleType: string;
    currentLocation?: { lat: number; lng: number };
  };
  deliveryFeeBreakdown?: {
    baseFee: number;
    distanceFee: number;
    weightSurcharge?: number;
  };
  statusHistory?: Array<{
    status: OrderStatus;
    changedAt: Date;
    changedBy?: { id: number; name: string };
  }>;
  elapsedMinutes?: number;
  isDelayed?: boolean;
  supportTicket?: {
    id: number;
    status: string;
    lastUpdate: Date;
  };
}

// Interface pour les filtres
export interface StoreOrderFilters {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  paymentMethod?: PaymentMethod[];
  dateRange?: { start: Date; end: Date };
  paymentDateRange?: { start: Date; end: Date };
  minAmount?: number;
  maxAmount?: number;
  shipmentStatus?: ShipmentStatus[];
}

// Interface pour les statistiques
export interface StoreOrderStats {
  totalAmount: number;
  avgDeliveryTime: number;
  avgPreparationTime: number;
  onTimePercentage: number;
  statusDistribution: {
    [key in OrderStatus]: number;
  };
}

export const emptyStoreOrderStats: StoreOrderStats = {
  totalAmount: 0,
  avgDeliveryTime: 0,
  avgPreparationTime: 0,
  onTimePercentage: 0,
  statusDistribution: {
    pending: 0,
    in_progress: 0,
    delivered: 0,
    cancelled: 0,
  },
};

// Interface pour le résultat de la recherche
export interface StoreOrderSearchResult {
  storeOrders: StoreOrderWithDetails[];
  total: number;
  page: number;
  totalPages: number;
  stats: StoreOrderStats;
}

// Fonction de recherche pour storeOrders
export async function searchStoreOrders(
  sellerUserId: number,
  params: {
    filters?: StoreOrderFilters;
    pagination?: { page: number; perPage: number };
  }
): Promise<StoreOrderSearchResult> {
  const { filters = {} as StoreOrderFilters } = params;
  const pagination = {
    page: Math.max(1, params.pagination?.page || 1),
    perPage: Math.min(Math.max(params.pagination?.perPage || 20, 1), 100),
  };

  // Vérification du magasin du vendeur
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.userId, sellerUserId))
    .limit(1);
  if (!store) {
    throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin non trouvé pour cet utilisateur");
  }

  // Conditions de base : limiter aux sous-commandes du vendeur
  const conditions: SQL[] = [eq(storeOrders.storeId, store.id)];

  // Appliquer les filtres
  if (filters.status?.length) {
    conditions.push(inArray(storeOrders.status, filters.status));
  }
  if (filters.paymentStatus?.length) {
    conditions.push(
      sql`${storeOrders.id} IN (
        SELECT ${payments.storeOrderId}
        FROM ${payments}
        WHERE ${payments.status} IN (${sql.join(filters.paymentStatus, sql`, `)})
      )`
    );
  }
  if (filters.paymentMethod?.length) {
    conditions.push(
      sql`${storeOrders.id} IN (
        SELECT ${payments.storeOrderId}
        FROM ${payments}
        WHERE ${payments.paymentMethod} IN (${sql.join(filters.paymentMethod, sql`, `)})
      )`
    );
  }
  if (filters.dateRange) {
    conditions.push(
      sql`${storeOrders.createdAt} BETWEEN ${filters.dateRange.start} AND ${filters.dateRange.end}`
    );
  }
  if (filters.paymentDateRange) {
    conditions.push(
      sql`${storeOrders.id} IN (
        SELECT ${payments.storeOrderId}
        FROM ${payments}
        WHERE ${payments.createdAt} BETWEEN ${filters.paymentDateRange.start} AND ${filters.paymentDateRange.end}
      )`
    );
  }
  if (filters.minAmount !== undefined) {
    conditions.push(
      sql`${storeOrders.id} IN (
        SELECT ${payments.storeOrderId}
        FROM ${payments}
        WHERE ${payments.amount} >= ${filters.minAmount}
      )`
    );
  }
  if (filters.maxAmount !== undefined) {
    conditions.push(
      sql`${storeOrders.id} IN (
        SELECT ${payments.storeOrderId}
        FROM ${payments}
        WHERE ${payments.amount} <= ${filters.maxAmount}
      )`
    );
  }
  if (filters.shipmentStatus?.length) {
    conditions.push(
      sql`${storeOrders.shipmentId} IN (
        SELECT ${shipments.id}
        FROM ${shipments}
        WHERE ${shipments.status} IN (${sql.join(filters.shipmentStatus, sql`, `)})
      )`
    );
  }

  // Compter le total
  const totalQuery = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${storeOrders.id})` })
    .from(storeOrders)
    .where(and(...conditions));
  const total = Number(totalQuery[0]?.count ?? 0);

  // Calculer la pagination
  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.perPage);
  const page = total === 0 ? 1 : Math.min(pagination.page, totalPages);
  const offset = (page - 1) * pagination.perPage;

  // Récupérer les sous-commandes avec détails, y compris l'utilisateur
  const storeOrdersQuery = total === 0
    ? []
    : await db
        .select({
          storeOrder: storeOrders,
          order: {
            id: orders.id,
            userId: orders.userId,
            destinationAddressId: orders.destinationAddressId,
            status: orders.status,
            estimatedDeliveryDate: orders.estimatedDeliveryDate,
          },
          store: {
            id: stores.id,
            name: stores.name,
          },
          user: sql<any>`(
            SELECT json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'phoneNumber', u.phone_number
            )
            FROM ${users} u
            WHERE u.id = ${orders.userId}
            LIMIT 1
          )`.as("user"),
          originAddress: sql<any>`(
            SELECT json_build_object(
              'id', a.id,
              'userId', a.user_id,
              'recipient', a.recipient,
              'location', a.location,
              'region', a.region,
              'formattedAddress', a.formatted_address,
              'postalCode', a.postal_code,
              'latitude', CASE WHEN jsonb_typeof(a.coordinates) = 'object' THEN (a.coordinates->>'lat')::float ELSE NULL END,
              'longitude', CASE WHEN jsonb_typeof(a.coordinates) = 'object' THEN (a.coordinates->>'lng')::float ELSE NULL END,
              'deliveryInstructions', a.delivery_instructions,
              'photoUrl', a.photo_url
            )
            FROM ${addresses} a
            JOIN ${shipments} sh ON a.id = sh.origin_address_id
            WHERE sh.store_order_id = ${storeOrders.id}
            LIMIT 1
          )`.as("origin_address"),
          destinationAddress: sql<any>`(
            SELECT json_build_object(
              'id', a.id,
              'userId', a.user_id,
              'recipient', a.recipient,
              'location', a.location,
              'region', a.region,
              'formattedAddress', a.formatted_address,
              'postalCode', a.postal_code,
              'latitude', CASE WHEN jsonb_typeof(a.coordinates) = 'object' THEN (a.coordinates->>'lat')::float ELSE NULL END,
              'longitude', CASE WHEN jsonb_typeof(a.coordinates) = 'object' THEN (a.coordinates->>'lng')::float ELSE NULL END,
              'deliveryInstructions', a.delivery_instructions,
              'photoUrl', a.photo_url
            )
            FROM ${addresses} a
            WHERE a.id = ${orders.destinationAddressId}
            LIMIT 1
          )`.as("destination_address"),
          items: sql<any>`(
            SELECT COALESCE(json_agg(json_build_object(
              'id', oi.id,
              'productId', oi.product_id,
              'quantity', oi.quantity,
              'price', oi.price,
              'product', json_build_object(
                'id', p.id,
                'name', p.name,
                'currentStock', ps.available_stock
              )
            )), '[]'::json)
            FROM ${orderItems} oi
            JOIN ${products} p ON oi.product_id = p.id
            LEFT JOIN ${productStocks} ps ON p.id = ps.product_id
            WHERE oi.store_order_id = ${storeOrders.id}
          )`.as("items"),
          payment: sql<any>`(
            SELECT json_build_object(
              'id', p.id,
              'amount', p.amount,
              'status', p.status,
              'paymentMethod', p.payment_method,
              'transactionId', p.transaction_id,
              'createdAt', p.created_at
            )
            FROM ${payments} p
            WHERE p.store_order_id = ${storeOrders.id}
            LIMIT 1
          )`.as("payment"),
          driver: sql<any>`(
            SELECT json_build_object(
              'id', d.id,
              'name', u.name,
              'phoneNumber', u.phone_number,
              'vehicleType', d.vehicle_type,
              'currentLocation', (
                SELECT json_build_object(
                  'lat', gl.latitude::float,
                  'lng', gl.longitude::float
                )
                FROM ${geolocations} gl
                WHERE gl.driver_id = d.id
                ORDER BY gl.created_at DESC
                LIMIT 1
              )
            )
            FROM ${shipments} sh
            JOIN ${drivers} d ON sh.driver_id = d.id
            JOIN ${users} u ON d.user_id = u.id
            WHERE sh.store_order_id = ${storeOrders.id}
            LIMIT 1
          )`.as("driver"),
          deliveryFeeBreakdown: sql<any>`(
            SELECT json_build_object(
              'baseFee', ddf.base_fee,
              'distanceFee', 0,
              'weightSurcharge', 0
            )
            FROM ${dynamicDeliveryFees} ddf
            JOIN ${shipments} sh ON sh.store_order_id = ${storeOrders.id}
            JOIN ${addresses} a ON a.id = sh.origin_address_id
            WHERE ddf.region = a.region
            LIMIT 1
          )`.as("delivery_fee_breakdown"),
          statusHistory: sql<any>`(
            SELECT COALESCE(json_agg(json_build_object(
              'status', osh.status,
              'changedAt', osh.changed_at,
              'changedBy', CASE 
                WHEN u.id IS NULL THEN NULL
                ELSE json_build_object('id', u.id, 'name', u.name)
              END
            ) ORDER BY osh.changed_at DESC), '[]'::json)
            FROM ${orderStatusHistory} osh
            LEFT JOIN ${users} u ON osh.changed_by = u.id
            WHERE osh.store_order_id = ${storeOrders.id}
          )`.as("status_history"),
          supportTicket: sql<any>`(
            SELECT json_build_object(
              'id', st.id,
              'status', st.status,
              'lastUpdate', st.updated_at
            )
            FROM ${supportTickets} st
            WHERE st.description LIKE '%Sous-commande ' || ${storeOrders.id} || '%'
            ORDER BY st.created_at DESC
            LIMIT 1
          )`.as("support_ticket"),
        })
        .from(storeOrders)
        .innerJoin(orders, eq(storeOrders.orderId, orders.id))
        .innerJoin(stores, eq(storeOrders.storeId, stores.id))
        .where(and(...conditions))
        .orderBy(desc(storeOrders.createdAt))
        .limit(pagination.perPage)
        .offset(offset);

  const now = new Date();

  // Formatage des résultats avec types stricts
  const formattedStoreOrders: StoreOrderWithDetails[] = storeOrdersQuery.map((row) => {
    if (!row.storeOrder || !row.order || !row.store || !row.user) {
      throw new ServiceError(
        ERROR_CODES.DATABASE_ERROR,
        `Sous-commande ${row.storeOrder?.id ?? "inconnue"} manque de données critiques (storeOrder, order, store ou user)`
      );
    }

    const isDelayed =
      row.order.estimatedDeliveryDate &&
      now > row.order.estimatedDeliveryDate &&
      row.storeOrder.status !== "delivered"
        ? true
        : undefined;

    return {
      ...row.storeOrder,
      order: row.order,
      store: row.store,
      user: {
        id: row.user.id as number,
        name: row.user.name as string,
        email: row.user.email as string,
        phoneNumber: (row.user.phoneNumber as string) ?? null,
      },
      originAddress: row.originAddress && typeof row.originAddress === "object" && "id" in row.originAddress
        ? {
            id: row.originAddress.id as number,
            userId: row.originAddress.userId as number,
            recipient: row.originAddress.recipient as string,
            location: row.originAddress.location as any,
            region: (row.originAddress.region as string) ?? null,
            formattedAddress: row.originAddress.formattedAddress as string,
            postalCode: (row.originAddress.postalCode as string) ?? null,
            latitude: typeof row.originAddress.latitude === "number" ? row.originAddress.latitude : null,
            longitude: typeof row.originAddress.longitude === "number" ? row.originAddress.longitude : null,
            deliveryInstructions: (row.originAddress.deliveryInstructions as string) ?? null,
            photoUrl: (row.originAddress.photoUrl as string) ?? null,
          }
        : undefined,
      destinationAddress:
        row.destinationAddress && typeof row.destinationAddress === "object" && "id" in row.destinationAddress
          ? {
              id: row.destinationAddress.id as number,
              userId: row.destinationAddress.userId as number,
              recipient: row.destinationAddress.recipient as string,
              location: row.destinationAddress.location as any,
              region: (row.destinationAddress.region as string) ?? null,
              formattedAddress: row.destinationAddress.formattedAddress as string,
              postalCode: (row.destinationAddress.postalCode as string) ?? null,
              latitude: typeof row.destinationAddress.latitude === "number" ? row.destinationAddress.latitude : null,
              longitude: typeof row.destinationAddress.longitude === "number" ? row.destinationAddress.longitude : null,
              deliveryInstructions: (row.destinationAddress.deliveryInstructions as string) ?? null,
              photoUrl: (row.destinationAddress.photoUrl as string) ?? null,
            }
          : undefined,
      items: Array.isArray(row.items)
        ? row.items.map((item: any) => ({
            id: item.id as number,
            productId: item.productId as number,
            quantity: item.quantity as number,
            price: item.price as number,
            product: {
              id: item.product.id as number,
              name: item.product.name as string,
              currentStock: item.product.currentStock as number | undefined,
            },
          }))
        : [],
      payment: row.payment && typeof row.payment === "object" && "id" in row.payment
        ? {
            id: row.payment.id as number,
            amount: row.payment.amount as number,
            status: row.payment.status as PaymentStatus,
            paymentMethod: row.payment.paymentMethod as PaymentMethod,
            transactionId: (row.payment.transactionId as string) ?? null,
            createdAt: new Date(row.payment.createdAt as string | Date),
          }
        : undefined,
      driver: row.driver && typeof row.driver === "object" && "id" in row.driver
        ? {
            id: row.driver.id as number,
            name: row.driver.name as string,
            phoneNumber: row.driver.phoneNumber as string,
            vehicleType: row.driver.vehicleType as string,
            currentLocation:
              row.driver.currentLocation && typeof row.driver.currentLocation === "object"
                ? {
                    lat: row.driver.currentLocation.lat as number,
                    lng: row.driver.currentLocation.lng as number,
                  }
                : undefined,
          }
        : undefined,
      deliveryFeeBreakdown:
        row.deliveryFeeBreakdown && typeof row.deliveryFeeBreakdown === "object" && "baseFee" in row.deliveryFeeBreakdown
          ? {
              baseFee: row.deliveryFeeBreakdown.baseFee as number,
              distanceFee: row.deliveryFeeBreakdown.distanceFee as number,
              weightSurcharge: (row.deliveryFeeBreakdown.weightSurcharge as number) ?? undefined,
            }
          : undefined,
      statusHistory: Array.isArray(row.statusHistory)
        ? row.statusHistory.map((item: any) => ({
            status: item.status as OrderStatus,
            changedAt: new Date(item.changedAt as string | Date),
            changedBy: item.changedBy && typeof item.changedBy === "object"
              ? { id: item.changedBy.id as number, name: item.changedBy.name as string }
              : undefined,
          }))
        : undefined,
      elapsedMinutes: row.storeOrder.createdAt
        ? Math.floor((now.getTime() - row.storeOrder.createdAt.getTime()) / (1000 * 60))
        : undefined,
      isDelayed,
      supportTicket: row.supportTicket && typeof row.supportTicket === "object" && "id" in row.supportTicket
        ? {
            id: row.supportTicket.id as number,
            status: row.supportTicket.status as string,
            lastUpdate: new Date(row.supportTicket.lastUpdate as string | Date),
          }
        : undefined,
    };
  });

  // Calcul des statistiques
  const statsQuery = await db
    .select({
      totalAmount: sql<number>`COALESCE(SUM(${storeOrders.total}), 0)`,
      pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${storeOrders.status} = 'pending')`,
      inProgressCount: sql<number>`COUNT(*) FILTER (WHERE ${storeOrders.status} = 'in_progress')`,
      deliveredCount: sql<number>`COUNT(*) FILTER (WHERE ${storeOrders.status} = 'delivered')`,
      cancelledCount: sql<number>`COUNT(*) FILTER (WHERE ${storeOrders.status} = 'cancelled')`,
      avgDeliveryTime: sql<number>`COALESCE(AVG(
        CASE WHEN ${storeOrders.status} = 'delivered'
        THEN EXTRACT(EPOCH FROM (${storeOrders.updatedAt} - ${storeOrders.createdAt})) / 60
        ELSE NULL END
      ), 0)`,
      avgPreparationTime: sql<number>`COALESCE(AVG(
        EXTRACT(EPOCH FROM (${shipments.createdAt} - ${storeOrders.createdAt})) / 60
      ), 0)`,
      onTimePercentage: sql<number>`COALESCE(
        100.0 * COUNT(*) FILTER (
          WHERE ${shipments.createdAt} <= ${orders.estimatedDeliveryDate}
          AND ${storeOrders.status} = 'delivered'
        ) / NULLIF(COUNT(*) FILTER (WHERE ${storeOrders.status} = 'delivered'), 0),
        0
      )`,
    })
    .from(storeOrders)
    .leftJoin(shipments, eq(storeOrders.id, shipments.storeOrderId))
    .leftJoin(orders, eq(storeOrders.orderId, orders.id))
    .where(and(...conditions));

  const stats = statsQuery[0] || {
    totalAmount: 0,
    pendingCount: 0,
    inProgressCount: 0,
    deliveredCount: 0,
    cancelledCount: 0,
    avgDeliveryTime: 0,
    avgPreparationTime: 0,
    onTimePercentage: 0,
  };

  return {
    storeOrders: formattedStoreOrders,
    total,
    page,
    totalPages,
    stats: {
      totalAmount: Number(stats.totalAmount),
      avgDeliveryTime: Number(stats.avgDeliveryTime),
      avgPreparationTime: Number(stats.avgPreparationTime),
      onTimePercentage: Number(stats.onTimePercentage),
      statusDistribution: {
        pending: Number(stats.pendingCount),
        in_progress: Number(stats.inProgressCount),
        delivered: Number(stats.deliveredCount),
        cancelled: Number(stats.cancelledCount),
      },
    },
  };
}