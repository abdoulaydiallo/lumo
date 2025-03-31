import { and, desc, eq, sql, SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";
import { InferSelectModel } from "drizzle-orm";
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
  dynamicDeliveryFees
} from "@/lib/db/schema";

// Types basés sur les enums du schéma
export type OrderStatus = typeof orderStatuses.enumValues[number];
export type PaymentStatus = typeof paymentStatuses.enumValues[number];
export type PaymentMethod = typeof paymentMethods.enumValues[number];
export type ShipmentStatus = typeof shipmentStatuses.enumValues[number];

// Types des tables
export type Order = InferSelectModel<typeof orders>;
export type OrderItem = InferSelectModel<typeof orderItems>;
export type Payment = InferSelectModel<typeof payments>;
export type Shipment = InferSelectModel<typeof shipments>;

// Structure complète d'une commande avec les nouvelles informations
export interface OrderWithDetails extends Order {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    phoneNumber: string;
    contactPreferences?: {
      sms: boolean;
      email: boolean;
      whatsapp: boolean;
    };
  };
  originAddress?: {
    id: number;
    recipient: string;
    region: string;
    formattedAddress: string;
    postalCode: string | null;
    latitude: string | null;
    longitude: string | null;
    deliveryInstructions: string | null;
    photoUrl: string | null;
  };
  destinationAddress?: {
    id: number;
    recipient: string;
    region: string;
    formattedAddress: string;
    postalCode: string | null;
    latitude: string | null;
    longitude: string | null;
    deliveryInstructions: string | null;
    photoUrl: string | null;
  };
  items: Array<OrderItem & {
    product: {
      id: number;
      name: string;
      store: {
        id: number;
        name: string;
      };
      currentStock?: number;
    };
  }>;
  payment?: {
    id: number;
    amount: number;
    status: string;
    paymentMethod: string;
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
  statusHistory?: Array<{
    status: OrderStatus;
    changedAt: Date;
    changedBy?: { id: number; name: string };
  }>;
  deliveryFeeBreakdown?: {
    baseFee: number;
    distanceFee: number;
    weightSurcharge?: number;
  };
  elapsedMinutes?: number;
  isDelayed?: boolean;
  supportTicket?: {
    id: number;
    status: string;
    lastUpdate: Date;
  };
}

export interface OrderPagination {
  page: number;
  per_page: number;
}

export interface OrderFiltersBase {
  payment_method: any;
  status?: OrderStatus[];
  payment_status?: PaymentStatus[];
  date_range?: { start: Date; end: Date };
  payment_date_range?: { start: Date; end: Date };
  min_amount?: number;
  max_amount?: number;
}

export interface OrderStats {
  total_amount: number;
  avg_delivery_time: number;
  avg_preparation_time: number;
  on_time_percentage: number;
  status_distribution: {
    [key in OrderStatus]: number;
  };
}

export const emptyOrderStats: OrderStats = {
  total_amount: 0,
  avg_delivery_time: 0,
  avg_preparation_time: 0,
  on_time_percentage: 0,
  status_distribution: {
    pending: 0,
    in_progress: 0,
    delivered: 0,
    cancelled: 0
  }
};

export interface OrderSearchResult {
  orders: OrderWithDetails[];
  total: number;
  page: number;
  total_pages: number;
  stats?: OrderStats;
}

export async function searchOrders(
  userId: number,
  userRole: "user" | "store" | "driver" | "admin" | "manager",
  params: {
    filters?: OrderFiltersBase;
    pagination?: OrderPagination;
  }
): Promise<OrderSearchResult> {
  const { filters = {} as OrderFiltersBase } = params;
  const pagination = {
    page: Math.max(1, params.pagination?.page || 1),
    per_page: Math.min(Math.max(params.pagination?.per_page || 20, 1), 100),
  };

  // Conditions de base en fonction du rôle
  const conditions: SQL[] = [];
  if (userRole === "user") {
    conditions.push(eq(orders.userId, userId));
  } else if (userRole === "store") {
    const [store] = await db.select({ id: stores.id })
      .from(stores)
      .where(eq(stores.userId, userId))
      .limit(1);
    if (!store) {
      return emptyResult(pagination);
    }
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${orderItems.orderId}
        FROM ${orderItems}
        JOIN ${products} ON ${orderItems.productId} = ${products.id}
        WHERE ${products.storeId} = ${store.id}
      )`
    );
  } else if (!["admin", "manager"].includes(userRole)) {
    throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Rôle non autorisé à lister les commandes");
  }

  // Appliquer les filtres
  if (filters.status?.length) {
    conditions.push(sql`${orders.status} IN (${sql.join(filters.status, sql`, `)})`);
  }
  if (filters.payment_status?.length) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${payments.orderId}
        FROM ${payments}
        WHERE ${payments.status} IN (${sql.join(filters.payment_status, sql`, `)})
      )`
    );
  }
  if (filters.date_range) {
    conditions.push(
      sql`${orders.createdAt} BETWEEN ${filters.date_range.start} AND ${filters.date_range.end}`
    );
  }
  if (filters.payment_date_range) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${payments.orderId}
        FROM ${payments}
        WHERE ${payments.createdAt} BETWEEN ${filters.payment_date_range.start} AND ${filters.payment_date_range.end}
      )`
    );
  }
  if (filters.min_amount !== undefined) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${payments.orderId}
        FROM ${payments}
        WHERE ${payments.amount} >= ${filters.min_amount}
      )`
    );
  }
  if (filters.max_amount !== undefined) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${payments.orderId}
        FROM ${payments}
        WHERE ${payments.amount} <= ${filters.max_amount}
      )`
    );
  }

  // Compter le total
  const totalQuery = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${orders.id})` })
    .from(orders)
    .where(and(...conditions));
  const total = Number(totalQuery[0]?.count ?? 0);
  if (total === 0) return emptyResult(pagination);

  // Calculer la pagination
  const total_pages = Math.ceil(total / pagination.per_page);
  const page = Math.min(pagination.page, total_pages);
  const offset = (page - 1) * pagination.per_page;

  // Récupérer les commandes avec tous les détails enrichis
  const ordersQuery = await db
    .select({
      order: {
        ...orders,
        totalDeliveryFee: orders.totalDeliveryFee,
        estimatedDeliveryDate: orders.estimatedDeliveryDate,
      },
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
      },
      originAddress: sql`(
        SELECT json_build_object(
          'id', a.id,
          'recipient', a.recipient,
          'region', a.region,
          'formattedAddress', a.formatted_address,
          'postalCode', a.postal_code,
          'latitude', a.latitude,
          'longitude', a.longitude,
          'deliveryInstructions', a.delivery_instructions,
          'photoUrl', a.photo_url
        )
        FROM ${addresses} a
        WHERE a.id = ${orders.originAddressId}
      )`.as("origin_address"),
      destinationAddress: sql`(
        SELECT json_build_object(
          'id', a.id,
          'recipient', a.recipient,
          'region', a.region,
          'formattedAddress', a.formatted_address,
          'postalCode', a.postal_code,
          'latitude', a.latitude,
          'longitude', a.longitude,
          'deliveryInstructions', a.delivery_instructions,
          'photoUrl', a.photo_url
        )
        FROM ${addresses} a
        WHERE a.id = ${orders.destinationAddressId}
      )`.as("destination_address"),
      items: sql`(
        SELECT COALESCE(json_agg(json_build_object(
          'id', oi.id,
          'productId', oi.product_id,
          'quantity', oi.quantity,
          'price', oi.price,
          'product', json_build_object(
            'id', p.id,
            'name', p.name,
            'currentStock', ps.available_stock,
            'store', json_build_object(
              'id', s.id,
              'name', s.name
            )
          )
        )), '[]'::json)
        FROM ${orderItems} oi
        JOIN ${products} p ON oi.product_id = p.id
        JOIN ${stores} s ON p.store_id = s.id
        LEFT JOIN ${productStocks} ps ON p.id = ps.product_id
        WHERE oi.order_id = ${orders.id}
      )`.as("items"),
      payment: sql`(
        SELECT json_build_object(
          'id', p.id,
          'amount', p.amount,
          'status', p.status,
          'paymentMethod', p.payment_method,
          'transactionId', p.transaction_id,
          'createdAt', p.created_at
        )
        FROM ${payments} p
        WHERE p.order_id = ${orders.id}
        LIMIT 1
      )`.as("payment"),
      driver: sql`(
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
        WHERE sh.order_id = ${orders.id}
        LIMIT 1
      )`.as("driver"),
      statusHistory: sql`(
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
        WHERE osh.order_id = ${orders.id}
      )`.as("status_history"),
      deliveryFeeBreakdown: sql`(
        SELECT json_build_object(
          'baseFee', ddf.fee * 0.7,
          'distanceFee', ddf.fee * 0.2,
          'weightSurcharge', ddf.fee * 0.1
        )
        FROM ${dynamicDeliveryFees} ddf
        WHERE ddf.region = (
          SELECT a.region FROM ${addresses} a 
          WHERE a.id = ${orders.originAddressId}
        )
        LIMIT 1
      )`.as("delivery_fee_breakdown"),
      supportTicket: sql`(
        SELECT json_build_object(
          'id', st.id,
          'status', st.status,
          'lastUpdate', st.updated_at
        )
        FROM ${supportTickets} st
        WHERE st.description LIKE '%Commande ' || ${orders.id} || '%'
        ORDER BY st.created_at DESC
        LIMIT 1
      )`.as("support_ticket")
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(pagination.per_page)
    .offset(offset);

  const now = new Date();

  const formattedOrders: OrderWithDetails[] = ordersQuery.map((row) => {
    if (!row.user) {
      throw new ServiceError(
        ERROR_CODES.DATABASE_ERROR,
        `Commande ${row.order.id} n'a pas d'utilisateur associé`
      );
    }
  
    const isDelayed = row.order.estimatedDeliveryDate && 
                      now > row.order.estimatedDeliveryDate && 
                      row.order.status !== 'delivered' ? true : undefined;
  
    // Transformation sécurisée de deliveryFeeBreakdown
    const deliveryFeeBreakdown = (() => {
      if (!row.deliveryFeeBreakdown || typeof row.deliveryFeeBreakdown !== 'object') {
        return undefined;
      }
      const dfb = row.deliveryFeeBreakdown as Record<string, unknown>;
      return {
        baseFee: typeof dfb.baseFee === 'number' ? dfb.baseFee : 0,
        distanceFee: typeof dfb.distanceFee === 'number' ? dfb.distanceFee : 0,
        weightSurcharge: typeof dfb.weightSurcharge === 'number' ? dfb.weightSurcharge : undefined
      };
    })();
  
    // Transformation sécurisée du driver
    const driver = (() => {
      if (!row.driver || typeof row.driver !== 'object') {
        return undefined;
      }
      const d = row.driver as Record<string, unknown>;
      return {
        id: typeof d.id === 'number' ? d.id : 0,
        name: typeof d.name === 'string' ? d.name : '',
        phoneNumber: typeof d.phoneNumber === 'string' ? d.phoneNumber : '',
        vehicleType: typeof d.vehicleType === 'string' ? d.vehicleType : '',
        currentLocation: (() => {
          if (!d.currentLocation || typeof d.currentLocation !== 'object') {
            return undefined;
          }
          const loc = d.currentLocation as Record<string, unknown>;
          return {
            lat: typeof loc.lat === 'number' ? loc.lat : 0,
            lng: typeof loc.lng === 'number' ? loc.lng : 0
          };
        })()
      };
    })();
  
    // Transformation sécurisée de statusHistory
    const statusHistory = (() => {
      if (!Array.isArray(row.statusHistory)) {
        return undefined;
      }
      return row.statusHistory.map((item: unknown) => {
        const i = item as Record<string, unknown>;
        return {
          status: typeof i.status === 'string' ? i.status as OrderStatus : 'pending',
          changedAt: i.changedAt instanceof Date ? i.changedAt : new Date(),
          changedBy: (() => {
            if (!i.changedBy || typeof i.changedBy !== 'object') {
              return undefined;
            }
            const cb = i.changedBy as Record<string, unknown>;
            return {
              id: typeof cb.id === 'number' ? cb.id : 0,
              name: typeof cb.name === 'string' ? cb.name : ''
            };
          })()
        };
      });
    })();
  
    // Transformation sécurisée de supportTicket
    const supportTicket = (() => {
      if (!row.supportTicket || typeof row.supportTicket !== 'object') {
        return undefined;
      }
      const st = row.supportTicket as Record<string, unknown>;
      return {
        id: typeof st.id === 'number' ? st.id : 0,
        status: typeof st.status === 'string' ? st.status : '',
        lastUpdate: st.lastUpdate instanceof Date ? st.lastUpdate : new Date()
      };
    })();
  
    return {
      ...row.order,
      user: {
        id: row.user.id,
        name: row.user.name ?? null,
        email: row.user.email ?? null,
        phoneNumber: row.user.phoneNumber,
      },
      originAddress: row.originAddress && typeof row.originAddress === "object"
        ? {
            id: (row.originAddress as any).id,
            recipient: (row.originAddress as any).recipient,
            region: (row.originAddress as any).region ?? null,
            formattedAddress: (row.originAddress as any).formattedAddress,
            postalCode: (row.originAddress as any).postalCode ?? null,
            latitude: (row.originAddress as any).latitude ?? null,
            longitude: (row.originAddress as any).longitude ?? null,
            deliveryInstructions: (row.originAddress as any).deliveryInstructions ?? null,
            photoUrl: (row.originAddress as any).photoUrl ?? null,
          }
        : undefined,
      destinationAddress: row.destinationAddress && typeof row.destinationAddress === "object"
        ? {
            id: (row.destinationAddress as any).id,
            recipient: (row.destinationAddress as any).recipient,
            region: (row.destinationAddress as any).region ?? null,
            formattedAddress: (row.destinationAddress as any).formattedAddress,
            postalCode: (row.destinationAddress as any).postalCode ?? null,
            latitude: (row.destinationAddress as any).latitude ?? null,
            longitude: (row.destinationAddress as any).longitude ?? null,
            deliveryInstructions: (row.destinationAddress as any).deliveryInstructions ?? null,
            photoUrl: (row.destinationAddress as any).photoUrl ?? null,
          }
        : undefined,
      items: Array.isArray(row.items) ? row.items : [],
      payment: row.payment && typeof row.payment === "object"
        ? {
            id: (row.payment as any).id,
            amount: (row.payment as any).amount,
            status: (row.payment as any).status,
            paymentMethod: (row.payment as any).paymentMethod,
            transactionId: (row.payment as any).transactionId,
            createdAt: new Date((row.payment as any).createdAt)
          }
        : undefined,
      driver,
      statusHistory,
      deliveryFeeBreakdown,
      elapsedMinutes: row.order.createdAt ? Math.floor((now.getTime() - row.order.createdAt.getTime()) / (1000 * 60)) : undefined,
      isDelayed,
      supportTicket
    };
  });

  // Calcul des statistiques enrichies
  const statsQuery = await db
    .select({
      total_amount: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
      pending_count: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'pending')`,
      in_progress_count: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'in_progress')`,
      delivered_count: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'delivered')`,
      cancelled_count: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'cancelled')`,
      avg_delivery_time: sql<number>`COALESCE(AVG(
        CASE WHEN ${orders.status} = 'delivered'
        THEN EXTRACT(EPOCH FROM (${orders.updatedAt} - ${orders.createdAt})) / 60
        ELSE NULL END
      ), 0)`,
      avg_preparation_time: sql<number>`COALESCE(AVG(
        EXTRACT(EPOCH FROM (shipments.created_at - orders.created_at)) / 60
      ), 0)`,
      on_time_percentage: sql<number>`COALESCE(
        100.0 * COUNT(*) FILTER (
          WHERE shipments.created_at <= orders.estimated_delivery_date
          AND orders.status = 'delivered'
        ) / NULLIF(COUNT(*) FILTER (WHERE orders.status = 'delivered'), 0),
        0
      )`
    })
    .from(orders)
    .leftJoin(payments, eq(orders.id, payments.orderId))
    .leftJoin(shipments, eq(orders.id, shipments.orderId))
    .where(and(...conditions));

  const stats = statsQuery[0];
  return {
    orders: formattedOrders,
    total,
    page,
    total_pages,
    stats: {
      total_amount: Number(stats.total_amount ?? 0),
      avg_delivery_time: Number(stats.avg_delivery_time ?? 0),
      avg_preparation_time: Number(stats.avg_preparation_time ?? 0),
      on_time_percentage: Number(stats.on_time_percentage ?? 0),
      status_distribution: {
        pending: Number(stats.pending_count ?? 0),
        in_progress: Number(stats.in_progress_count ?? 0),
        delivered: Number(stats.delivered_count ?? 0),
        cancelled: Number(stats.cancelled_count ?? 0),
      },
    },
  };
}

function emptyResult(pagination: OrderPagination): OrderSearchResult {
  return {
    orders: [],
    total: 0,
    page: pagination.page,
    total_pages: 0,
    stats: emptyOrderStats,
  };
}