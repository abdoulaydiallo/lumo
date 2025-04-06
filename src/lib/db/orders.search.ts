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
  dynamicDeliveryFees,
  storeOrders
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
export type StoreOrder = InferSelectModel<typeof storeOrders>;

// Structure complète d'une commande (adaptée pour les vendeurs, payment global retiré ou laissé vide)
export interface OrderWithDetails extends Order {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    phoneNumber: string;
  };
  storeOrders: Array<StoreOrder & {
    store: {
      id: number;
      name: string;
    };
    originAddress?: {
      id: number;
      userId: number;
      recipient: string;
      location: any;
      region: string;
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
      region: string;
      formattedAddress: string;
      postalCode: string | null;
      latitude: number | null;
      longitude: number | null;
      deliveryInstructions: string | null;
      photoUrl: string | null;
    };
    items: Array<OrderItem & {
      product: {
        id: number;
        name: string;
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
    deliveryFeeBreakdown?: {
      baseFee: number;
      distanceFee: number;
      weightSurcharge?: number;
    };
  }>;
  payment?: { // Conservé dans l'interface pour compatibilité, mais sera undefined pour les vendeurs
    id: number;
    totalAmount: number;
    status: string;
    paymentMethod: string;
    transactionId: string | null;
    createdAt: Date;
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
  } | undefined;
}
export type OrderStatusType = "pending" | "in_progress" | "delivered" | "cancelled";

export interface OrderDetails {
  id: string | number; // Identifiant de la commande
  status: OrderStatusType; // Statut de la commande
  createdAt: Date; // Date de création
  estimatedDeliveryDate?: Date | null; // Date de livraison estimée (optionnelle)
  elapsedMinutes?: number; // Temps écoulé en minutes (optionnel)
  isDelayed?: boolean; // Indicateur de retard (optionnel)
  user: {
    name?: string | null; // Nom de l'utilisateur (optionnel)
    email?: string | null; // Email de l'utilisateur (optionnel)
    phoneNumber?: string; // Numéro de téléphone (optionnel)
  };
  originAddress?: {
    recipient?: string; // Nom du destinataire
    formattedAddress?: string; // Adresse formatée
    deliveryInstructions?: string | null; // Instructions de livraison (optionnelles)
    latitude?: number | null; // Latitude (optionnelle)
    longitude?: number | null; // Longitude (optionnelle)
    region?: string; // Région (optionnelle)
  };
  destinationAddress?: {
    recipient?: string; // Nom du destinataire
    formattedAddress?: string; // Adresse formatée
    deliveryInstructions?: string | null; // Instructions de livraison (optionnelles)
    latitude?: number | null; // Latitude (optionnelle)
    longitude?: number | null; // Longitude (optionnelle)
    region?: string; // Région (optionnelle)
  };
  items: Array<{
    id: string | number; // Identifiant de l'article
    product: {
      name: string; // Nom du produit
      currentStock?: number; // Stock actuel (optionnel)
    };
    quantity: number; // Quantité
    price: number; // Prix unitaire
  }>;
  driver?: {
    name: string; // Nom du livreur
    phoneNumber: string; // Numéro de téléphone
    vehicleType: string; // Type de véhicule
    currentLocation?: {
      lat: number; // Latitude
      lng: number; // Longitude
    };
  };
  deliveryFeeBreakdown?: {
    baseFee: number; // Frais de base
    distanceFee: number; // Frais de distance
    weightSurcharge?: number; // Surcharge pour le poids (optionnelle)
  };
  payment?: {
    status: string; // Statut du paiement (ex. "paid", "pending")
    paymentMethod: string; // Méthode de paiement
    createdAt: Date; // Date de création du paiement
    transactionId?: string | null; // ID de transaction (optionnel)
    amount: number; // Montant payé
  };
  statusHistory?: Array<{
    status: OrderStatusType; // Statut dans l'historique
    changedAt: Date; // Date du changement
    changedBy?: {
      name: string; // Nom de la personne ayant effectué le changement
    };
  }>;
  supportTicket?: {
    id: string | number; // Numéro du ticket
    status: string; // Statut du ticket (ex. "resolved", "pending")
    lastUpdate: Date; // Date de dernière mise à jour
  };
}
export interface OrderPagination {
  page: number;
  per_page: number;
}

export interface OrderFiltersBase {
  payment_method?: PaymentMethod[];
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
  userRole: "store", // Restreint au rôle "store" pour cette version
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

  // Vérification du rôle et récupération du magasin du vendeur
  const [store] = await db.select({ id: stores.id })
    .from(stores)
    .where(eq(stores.userId, userId))
    .limit(1);
  if (!store) {
    throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin non trouvé pour cet utilisateur");
  }

  // Conditions de base : limiter aux commandes liées au magasin du vendeur
  const conditions: SQL[] = [
    sql`${orders.id} IN (
      SELECT ${storeOrders.orderId}
      FROM ${storeOrders}
      WHERE ${storeOrders.storeId} = ${store.id}
    )`
  ];

  // Appliquer les filtres (basés sur payments, pas orderPayments)
  if (filters.status?.length) {
    conditions.push(sql`${orders.status} IN (${sql.join(filters.status, sql`, `)})`);
  }
  if (filters.payment_status?.length) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${storeOrders.orderId}
        FROM ${storeOrders}
        JOIN ${payments} p ON p.store_order_id = ${storeOrders.id}
        WHERE ${storeOrders.storeId} = ${store.id}
        AND p.status IN (${sql.join(filters.payment_status, sql`, `)})
      )`
    );
  }
  if (filters.payment_method?.length) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${storeOrders.orderId}
        FROM ${storeOrders}
        JOIN ${payments} p ON p.store_order_id = ${storeOrders.id}
        WHERE ${storeOrders.storeId} = ${store.id}
        AND p.payment_method IN (${sql.join(filters.payment_method, sql`, `)})
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
        SELECT ${storeOrders.orderId}
        FROM ${storeOrders}
        JOIN ${payments} p ON p.store_order_id = ${storeOrders.id}
        WHERE ${storeOrders.storeId} = ${store.id}
        AND p.created_at BETWEEN ${filters.payment_date_range.start} AND ${filters.payment_date_range.end}
      )`
    );
  }
  if (filters.min_amount !== undefined) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${storeOrders.orderId}
        FROM ${storeOrders}
        JOIN ${payments} p ON p.store_order_id = ${storeOrders.id}
        WHERE ${storeOrders.storeId} = ${store.id}
        AND p.amount >= ${filters.min_amount}
      )`
    );
  }
  if (filters.max_amount !== undefined) {
    conditions.push(
      sql`${orders.id} IN (
        SELECT ${storeOrders.orderId}
        FROM ${storeOrders}
        JOIN ${payments} p ON p.store_order_id = ${storeOrders.id}
        WHERE ${storeOrders.storeId} = ${store.id}
        AND p.amount <= ${filters.max_amount}
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

  // Récupérer les commandes avec les détails pertinents pour le vendeur
  const ordersQuery = await db
    .select({
      order: {
        ...orders,
        estimatedDeliveryDate: orders.estimatedDeliveryDate,
      },
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
      },
      storeOrders: sql`(
        SELECT COALESCE(json_agg(json_build_object(
          'id', so.id,
          'orderId', so.order_id,
          'storeId', so.store_id,
          'subtotal', so.subtotal,
          'deliveryFee', so.delivery_fee,
          'total', so.total,
          'status', so.status,
          'shipmentId', so.shipment_id,
          'createdAt', so.created_at,
          'updatedAt', so.updated_at,
          'store', json_build_object(
            'id', s.id,
            'name', s.name
          ),
          'originAddress', (
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
            WHERE sh.store_order_id = so.id
            LIMIT 1
          ),
          'destinationAddress', (
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
          ),
          'items', (
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
            WHERE oi.store_order_id = so.id
          ),
          'payment', (
            SELECT json_build_object(
              'id', p.id,
              'amount', p.amount,
              'status', p.status,
              'paymentMethod', p.payment_method,
              'transactionId', p.transaction_id,
              'createdAt', p.created_at
            )
            FROM ${payments} p
            WHERE p.store_order_id = so.id
            LIMIT 1
          ),
          'driver', (
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
            WHERE sh.store_order_id = so.id
            LIMIT 1
          ),
          'deliveryFeeBreakdown', (
            SELECT json_build_object(
              'baseFee', ddf.base_fee,
              'distanceFee', 0, -- À ajuster si calcul dynamique disponible
              'weightSurcharge', 0 -- À ajuster si calcul dynamique disponible
            )
            FROM ${dynamicDeliveryFees} ddf
            JOIN ${shipments} sh ON sh.store_order_id = so.id
            JOIN ${addresses} a ON a.id = sh.origin_address_id
            WHERE ddf.region = a.region
            LIMIT 1
          )
        )), '[]'::json)
        FROM ${storeOrders} so
        JOIN ${stores} s ON so.store_id = s.id
        WHERE so.order_id = ${orders.id}
        AND so.store_id = ${store.id} -- Limiter aux sous-commandes du vendeur
      )`.as("store_orders"),
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
        AND (osh.store_order_id IS NULL OR osh.store_order_id IN (
          SELECT id FROM ${storeOrders} WHERE store_id = ${store.id} AND order_id = ${orders.id}
        ))
      )`.as("status_history"),
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

    const storeOrders = Array.isArray(row.storeOrders) ? row.storeOrders.map((so: any) => ({
      ...so,
      originAddress: so.originAddress && typeof so.originAddress === "object" ? {
        id: so.originAddress.id,
        userId: so.originAddress.userId,
        recipient: so.originAddress.recipient,
        location: so.originAddress.location,
        region: so.originAddress.region ?? null,
        formattedAddress: so.originAddress.formattedAddress,
        postalCode: so.originAddress.postalCode ?? null,
        latitude: typeof so.originAddress.latitude === 'number' ? so.originAddress.latitude : null,
        longitude: typeof so.originAddress.longitude === 'number' ? so.originAddress.longitude : null,
        deliveryInstructions: so.originAddress.deliveryInstructions ?? null,
        photoUrl: so.originAddress.photoUrl ?? null,
      } : undefined,
      destinationAddress: so.destinationAddress && typeof so.destinationAddress === "object" ? {
        id: so.destinationAddress.id,
        userId: so.destinationAddress.userId,
        recipient: so.destinationAddress.recipient,
        location: so.destinationAddress.location,
        region: so.destinationAddress.region ?? null,
        formattedAddress: so.destinationAddress.formattedAddress,
        postalCode: so.destinationAddress.postalCode ?? null,
        latitude: typeof so.destinationAddress.latitude === 'number' ? so.destinationAddress.latitude : null,
        longitude: typeof so.destinationAddress.longitude === 'number' ? so.destinationAddress.longitude : null,
        deliveryInstructions: so.destinationAddress.deliveryInstructions ?? null,
        photoUrl: so.destinationAddress.photoUrl ?? null,
      } : undefined,
      items: Array.isArray(so.items) ? so.items : [],
      payment: so.payment && typeof so.payment === "object" ? {
        id: so.payment.id,
        amount: so.payment.amount,
        status: so.payment.status,
        paymentMethod: so.payment.paymentMethod,
        transactionId: so.payment.transactionId ?? null,
        createdAt: new Date(so.payment.createdAt)
      } : undefined,
      driver: so.driver && typeof so.driver === "object" ? {
        id: so.driver.id,
        name: so.driver.name,
        phoneNumber: so.driver.phoneNumber,
        vehicleType: so.driver.vehicleType,
        currentLocation: so.driver.currentLocation && typeof so.driver.currentLocation === "object" ? {
          lat: so.driver.currentLocation.lat,
          lng: so.driver.currentLocation.lng
        } : undefined
      } : undefined,
      deliveryFeeBreakdown: so.deliveryFeeBreakdown && typeof so.deliveryFeeBreakdown === "object" ? {
        baseFee: so.deliveryFeeBreakdown.baseFee,
        distanceFee: so.deliveryFeeBreakdown.distanceFee,
        weightSurcharge: so.deliveryFeeBreakdown.weightSurcharge
      } : undefined
    })) : [];

    return {
      ...row.order,
      user: {
        id: row.user.id,
        name: row.user.name ?? null,
        email: row.user.email ?? null,
        phoneNumber: row.user.phoneNumber,
      },
      storeOrders,
      payment: undefined, // Pas de paiement global pour les vendeurs
      statusHistory: Array.isArray(row.statusHistory) ? row.statusHistory.map((item: any) => ({
        status: item.status,
        changedAt: new Date(item.changedAt),
        changedBy: item.changedBy ? { id: item.changedBy.id, name: item.changedBy.name } : undefined
      })) : undefined,
      elapsedMinutes: row.order.createdAt ? Math.floor((now.getTime() - row.order.createdAt.getTime()) / (1000 * 60)) : undefined,
      isDelayed,
      supportTicket: row.supportTicket && typeof row.supportTicket === "object" ? {
        id: (row.supportTicket as { id: number }).id,
        status: (row.supportTicket as { status: string }).status,
        lastUpdate: new Date((row.supportTicket as { lastUpdate: string }).lastUpdate)
      } : undefined
    };
  });

  // Calcul des statistiques enrichies (basées sur payments pour le magasin)
  const statsQuery = await db
    .select({
      total_amount: sql<number>`COALESCE(SUM(p.amount), 0)`,
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
        EXTRACT(EPOCH FROM (${shipments.createdAt} - ${orders.createdAt})) / 60
      ), 0)`,
      on_time_percentage: sql<number>`COALESCE(
        100.0 * COUNT(*) FILTER (
          WHERE ${shipments.createdAt} <= ${orders.estimatedDeliveryDate}
          AND ${orders.status} = 'delivered'
        ) / NULLIF(COUNT(*) FILTER (WHERE ${orders.status} = 'delivered'), 0),
        0
      )`
    })
    .from(orders)
    .leftJoin(storeOrders, eq(orders.id, storeOrders.orderId))
    .leftJoin(payments, eq(storeOrders.id, payments.storeOrderId))
    .leftJoin(shipments, eq(storeOrders.id, shipments.storeOrderId))
    .where(and(...conditions, eq(storeOrders.storeId, store.id)));

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