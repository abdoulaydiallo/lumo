import { and, desc, eq, inArray, sql, SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";
import {
  shipments,
  drivers,
  storeOrders,
  orders,
  stores,
  users,
  addresses,
  tracking,
  geolocations,
  orderItems,
  products,
  supportTickets,
  shipmentStatuses,
  orderStatuses,
} from "@/lib/db/schema";

// Types basés sur les enums du schéma
export type ShipmentStatus = typeof shipmentStatuses.enumValues[number];
export type OrderStatus = typeof orderStatuses.enumValues[number];

// Interface pour les détails d'une expédition, alignée sur le schéma
export interface ShipmentWithDetails {
  id: number;
  storeOrderId: number;
  originAddressId: number;
  driverId: number | null;
  status: ShipmentStatus;
  priorityLevel: string | null;
  deliveryNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  storeOrder: {
    id: number;
    orderId: number;
    storeId: number;
    subtotal: number;
    deliveryFee: number;
    total: number;
    status: OrderStatus;
  };
  order: {
    id: number;
    userId: number;
    destinationAddressId: number;
    estimatedDeliveryDate: Date | null;
  };
  store: {
    id: number;
    name: string;
  };
  customer: {
    id: number;
    name: string | null;
    phoneNumber: string;
    email: string | null;
  };
  driver?: {
    id: number;
    name: string | null;
    phoneNumber: string;
    vehicleType: string;
    currentLocation?: { lat: number; lng: number } | null;
  };
  originAddress: {
    id: number;
    formattedAddress: string | null;
    coordinates: { lat: number; lng: number } | null;
  };
  destinationAddress: {
    id: number;
    formattedAddress: string | null;
    coordinates: { lat: number; lng: number } | null;
    deliveryInstructions: string | null;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
    variantId: number | null;
    product: {
      id: number;
      name: string;
      weight: number;
    };
  }>;
  trackingHistory?: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  }>;
  estimatedDeliveryTime?: number;
  isDelayed?: boolean;
  supportTicket?: {
    id: number;
    status: string;
    description: string;
    lastUpdate: Date;
  };
}

// Interface pour les filtres
export interface ShipmentFilters {
  status?: ShipmentStatus[];
  driverId?: number;
  priorityLevel?: string[];
  dateRange?: { start: Date; end: Date };
  storeId?: number;
  minEstimatedDeliveryTime?: number;
  maxEstimatedDeliveryTime?: number;
  hasSupportTicket?: boolean;
}

// Interface pour les statistiques
export interface ShipmentStats {
  totalShipments: number;
  avgDeliveryTime: number;
  onTimePercentage: number;
  totalDeliveryFees: number;
  statusDistribution: {
    [key in ShipmentStatus]: number;
  };
}

export const emptyShipmentStats: ShipmentStats = {
  totalShipments: 0,
  avgDeliveryTime: 0,
  onTimePercentage: 0,
  totalDeliveryFees: 0,
  statusDistribution: {
    pending: 0,
    in_progress: 0,
    delivered: 0,
    failed: 0,
  },
};

// Interface pour le résultat de la recherche
export interface ShipmentSearchResult {
  shipments: ShipmentWithDetails[];
  total: number;
  page: number;
  totalPages: number;
  stats: ShipmentStats;
}

// Fonction utilitaire pour parser les coordonnées JSONB
function parseCoordinates(coords: unknown): { lat: number; lng: number } | null {
  if (coords && typeof coords === "object" && "lat" in coords && "lng" in coords) {
    const { lat, lng } = coords as any;
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
  }
  return null;
}

// Fonction de recherche pour les expéditions
export async function searchShipments(
  userId: number,
  params: {
    filters?: ShipmentFilters;
    pagination?: { page: number; perPage: number };
  }
): Promise<ShipmentSearchResult> {
  const { filters = {} as ShipmentFilters } = params;
  const pagination = {
    page: Math.max(1, params.pagination?.page || 1),
    perPage: Math.min(Math.max(params.pagination?.perPage || 20, 1), 100),
  };

  // Vérification du rôle et des permissions
  const [user] = await db
    .select({ role: users.role, storeId: stores.id })
    .from(users)
    .leftJoin(stores, eq(stores.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new ServiceError(ERROR_CODES.NOT_FOUND, "Utilisateur non trouvé");
  }

  // Conditions de base selon le rôle
  const conditions: SQL[] = [];
  if (user.role === "driver") {
    const [driver] = await db
      .select({ id: drivers.id })
      .from(drivers)
      .where(eq(drivers.userId, userId))
      .limit(1);
    if (!driver) throw new ServiceError(ERROR_CODES.NOT_FOUND, "Conducteur non trouvé");
    conditions.push(eq(shipments.driverId, driver.id));
  } else if (user.role === "store" && user.storeId) {
    conditions.push(
      sql`${shipments.storeOrderId} IN (
        SELECT ${storeOrders.id} FROM ${storeOrders} WHERE ${storeOrders.storeId} = ${user.storeId}
      )`
    );
  } else if (user.role !== "admin" && user.role !== "manager") {
    throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Accès non autorisé");
  }

  // Appliquer les filtres
  if (filters.status?.length) {
    conditions.push(inArray(shipments.status, filters.status));
  }
  if (filters.driverId) {
    conditions.push(eq(shipments.driverId, filters.driverId));
  }
  if (filters.priorityLevel?.length) {
    conditions.push(inArray(shipments.priorityLevel, filters.priorityLevel));
  }
  if (filters.dateRange) {
    conditions.push(
      sql`${shipments.createdAt} BETWEEN ${filters.dateRange.start} AND ${filters.dateRange.end}`
    );
  }
  if (filters.storeId) {
    conditions.push(
      sql`${shipments.storeOrderId} IN (
        SELECT ${storeOrders.id} FROM ${storeOrders} WHERE ${storeOrders.storeId} = ${filters.storeId}
      )`
    );
  }
  if (filters.minEstimatedDeliveryTime !== undefined) {
    conditions.push(
      sql`EXTRACT(EPOCH FROM (${orders.estimatedDeliveryDate} - ${shipments.createdAt})) / 60 >= ${filters.minEstimatedDeliveryTime}`
    );
  }
  if (filters.maxEstimatedDeliveryTime !== undefined) {
    conditions.push(
      sql`EXTRACT(EPOCH FROM (${orders.estimatedDeliveryDate} - ${shipments.createdAt})) / 60 <= ${filters.maxEstimatedDeliveryTime}`
    );
  }
  if (filters.hasSupportTicket) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${supportTickets} st 
        WHERE st.id = ${shipments.id}
      )`
    );
  }

  // Compter le total
  const totalQuery = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${shipments.id})` })
    .from(shipments)
    .where(and(...conditions));
  const total = Number(totalQuery[0]?.count ?? 0);

  // Calculer la pagination
  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.perPage);
  const page = total === 0 ? 1 : Math.min(pagination.page, totalPages);
  const offset = (page - 1) * pagination.perPage;

  // Récupérer les expéditions avec détails
  const shipmentsQuery = total === 0
    ? []
    : await db
        .select({
          shipment: shipments,
          storeOrder: storeOrders,
          order: orders,
          store: stores,
          customer: {
            id: users.id,
            name: users.name,
            phoneNumber: users.phoneNumber,
            email: users.email,
          },
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
            FROM ${drivers} d
            JOIN ${users} u ON d.user_id = u.id
            WHERE d.id = ${shipments.driverId}
            LIMIT 1
          )`.as("driver"),
          originAddress: {
            id: addresses.id,
            formattedAddress: addresses.formattedAddress,
            coordinates: addresses.coordinates,
          },
          destinationAddress: sql<any>`(
            SELECT json_build_object(
              'id', a.id,
              'formattedAddress', a.formatted_address,
              'coordinates', a.coordinates,
              'deliveryInstructions', a.delivery_instructions
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
              'variantId', oi.variant_id,
              'product', json_build_object(
                'id', p.id,
                'name', p.name,
                'weight', p.weight
              )
            )), '[]'::json)
            FROM ${orderItems} oi
            JOIN ${products} p ON oi.product_id = p.id
            WHERE oi.store_order_id = ${storeOrders.id}
          )`.as("items"),
          trackingHistory: sql<any>`(
            SELECT COALESCE(json_agg(json_build_object(
              'latitude', t.latitude::float,
              'longitude', t.longitude::float,
              'timestamp', t.timestamp
            ) ORDER BY t.timestamp DESC), '[]'::json)
            FROM ${tracking} t
            WHERE t.shipment_id = ${shipments.id}
          )`.as("tracking_history"),
          supportTicket: sql<any>`(
            SELECT json_build_object(
              'id', st.id,
              'status', st.status,
              'description', st.description,
              'lastUpdate', st.updated_at
            )
            FROM ${supportTickets} st
            WHERE st.id = ${shipments.id}
            ORDER BY st.created_at DESC
            LIMIT 1
          )`.as("support_ticket"),
        })
        .from(shipments)
        .innerJoin(storeOrders, eq(shipments.storeOrderId, storeOrders.id))
        .innerJoin(orders, eq(storeOrders.orderId, orders.id))
        .innerJoin(stores, eq(storeOrders.storeId, stores.id))
        .innerJoin(users, eq(orders.userId, users.id))
        .innerJoin(addresses, eq(shipments.originAddressId, addresses.id))
        .where(and(...conditions))
        .orderBy(desc(shipments.createdAt))
        .limit(pagination.perPage)
        .offset(offset);

  const now = new Date();

  // Formatage des résultats
  const formattedShipments: ShipmentWithDetails[] = shipmentsQuery.map((row) => {
    const shipment = row.shipment;
    const storeOrder = row.storeOrder;
    const order = row.order;
    const store = row.store;
    const customer = row.customer;

    if (!shipment || !storeOrder || !order || !store || !customer) {
      throw new ServiceError(
        ERROR_CODES.DATABASE_ERROR,
        `Expédition ${shipment?.id ?? "inconnue"} manque de données critiques`
      );
    }

    if (!shipment.createdAt || !shipment.updatedAt) {
      throw new ServiceError(
        ERROR_CODES.DATABASE_ERROR,
        `Expédition ${shipment.id} a des champs createdAt ou updatedAt manquants`
      );
    }

    const estimatedDeliveryTime = order.estimatedDeliveryDate
      ? Math.floor((order.estimatedDeliveryDate.getTime() - shipment.createdAt.getTime()) / (1000 * 60))
      : undefined;

    const isDelayed =
      order.estimatedDeliveryDate && now > order.estimatedDeliveryDate && shipment.status !== "delivered"
        ? true
        : undefined;

    return {
      id: shipment.id,
      storeOrderId: shipment.storeOrderId,
      originAddressId: shipment.originAddressId,
      driverId: shipment.driverId,
      status: shipment.status,
      priorityLevel: shipment.priorityLevel,
      deliveryNotes: shipment.deliveryNotes,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
      storeOrder: {
        id: storeOrder.id,
        orderId: storeOrder.orderId,
        storeId: storeOrder.storeId,
        subtotal: storeOrder.subtotal,
        deliveryFee: storeOrder.deliveryFee,
        total: storeOrder.total,
        status: storeOrder.status,
      },
      order: {
        id: order.id,
        userId: order.userId,
        destinationAddressId: order.destinationAddressId,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
      },
      store: {
        id: store.id,
        name: store.name,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        email: customer.email,
      },
      driver: row.driver && typeof row.driver === "object" && "id" in row.driver
        ? {
            id: row.driver.id as number,
            name: row.driver.name as string | null,
            phoneNumber: row.driver.phoneNumber as string,
            vehicleType: row.driver.vehicleType as string,
            currentLocation: parseCoordinates(row.driver.currentLocation),
          }
        : undefined,
      originAddress: {
        id: row.originAddress.id,
        formattedAddress: row.originAddress.formattedAddress,
        coordinates: parseCoordinates(row.originAddress.coordinates),
      },
      destinationAddress: {
        id: row.destinationAddress.id as number,
        formattedAddress: row.destinationAddress.formattedAddress as string | null,
        coordinates: parseCoordinates(row.destinationAddress.coordinates),
        deliveryInstructions: row.destinationAddress.deliveryInstructions as string | null,
      },
      items: Array.isArray(row.items)
        ? row.items.map((item: any) => ({
            id: item.id as number,
            productId: item.productId as number,
            quantity: item.quantity as number,
            price: item.price as number,
            variantId: item.variantId as number | null,
            product: {
              id: item.product.id as number,
              name: item.product.name as string,
              weight: item.product.weight as number,
            },
          }))
        : [],
      trackingHistory: Array.isArray(row.trackingHistory)
        ? row.trackingHistory.map((track: any) => ({
            latitude: track.latitude as number,
            longitude: track.longitude as number,
            timestamp: new Date(track.timestamp as string | Date),
          }))
        : undefined,
      estimatedDeliveryTime,
      isDelayed,
      supportTicket: row.supportTicket && typeof row.supportTicket === "object" && "id" in row.supportTicket
        ? {
            id: row.supportTicket.id as number,
            status: row.supportTicket.status as string,
            description: row.supportTicket.description as string,
            lastUpdate: new Date(row.supportTicket.lastUpdate as string | Date),
          }
        : undefined,
    };
  });

  // Calcul des statistiques
  const statsQuery = await db
    .select({
      totalShipments: sql<number>`COUNT(DISTINCT ${shipments.id})`,
      pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'pending')`,
      inProgressCount: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'in_progress')`,
      deliveredCount: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'delivered')`,
      failedCount: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'failed')`,
      avgDeliveryTime: sql<number>`COALESCE(AVG(
        CASE WHEN ${shipments.status} = 'delivered'
        THEN EXTRACT(EPOCH FROM (${shipments.updatedAt} - ${shipments.createdAt})) / 60
        ELSE NULL END
      ), 0)`,
      onTimePercentage: sql<number>`COALESCE(
        100.0 * COUNT(*) FILTER (
          WHERE ${shipments.updatedAt} <= ${orders.estimatedDeliveryDate}
          AND ${shipments.status} = 'delivered'
        ) / NULLIF(COUNT(*) FILTER (WHERE ${shipments.status} = 'delivered'), 0),
        0
      )`,
      totalDeliveryFees: sql<number>`COALESCE(SUM(${storeOrders.deliveryFee}), 0)`,
    })
    .from(shipments)
    .innerJoin(storeOrders, eq(shipments.storeOrderId, storeOrders.id))
    .innerJoin(orders, eq(storeOrders.orderId, orders.id))
    .where(and(...conditions));

  const stats = statsQuery[0] || {
    totalShipments: 0,
    pendingCount: 0,
    inProgressCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    avgDeliveryTime: 0,
    onTimePercentage: 0,
    totalDeliveryFees: 0,
  };

  return {
    shipments: formattedShipments,
    total,
    page,
    totalPages,
    stats: {
      totalShipments: Number(stats.totalShipments),
      avgDeliveryTime: Number(stats.avgDeliveryTime),
      onTimePercentage: Number(stats.onTimePercentage),
      totalDeliveryFees: Number(stats.totalDeliveryFees),
      statusDistribution: {
        pending: Number(stats.pendingCount),
        in_progress: Number(stats.inProgressCount),
        delivered: Number(stats.deliveredCount),
        failed: Number(stats.failedCount),
      },
    },
  };
}