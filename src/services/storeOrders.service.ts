import { db } from "@/lib/db";
import {
  storeOrders,
  orders,
  stores,
  shipments,
  storeDrivers,
  users,
  orderStatusHistory,
  notifications,
  auditLogs,
} from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ServiceError, ERROR_CODES } from "./orders.errors";

// Enums validés (alignés avec le schéma existant)
export const validOrderStatuses = ["pending", "in_progress", "delivered", "cancelled"] as const;
export const validShipmentStatuses = ["pending", "in_progress", "delivered", "failed"] as const;
export type ValidOrderStatus = typeof validOrderStatuses[number];
export type ValidShipmentStatus = typeof validShipmentStatuses[number];

// Interface pour les détails d'une storeOrder
export interface StoreOrderWithDetails {
  id: number;
  orderId: number;
  storeId: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: ValidOrderStatus;
  shipmentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  order: {
    id: number;
    userId: number;
    status: ValidOrderStatus;
  };
  store: {
    id: number;
    name: string;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
    product: {
      id: number;
      name: string;
    };
  }>;
  payment: {
    id: number;
    amount: number;
    status: string;
    paymentMethod: string;
  } | null;
  shipment: {
    id: number;
    driverId: number | null;
    status: ValidShipmentStatus;
  } | null;
}

// Validation des enums
function validateEnum<T>(value: any, validValues: readonly T[], fieldName: string): T {
  if (!validValues.includes(value)) {
    throw new ServiceError(
      ERROR_CODES.VALIDATION_ERROR,
      `Valeur invalide pour ${fieldName}: ${value}. Valeurs attendues: ${validValues.join(", ")}`
    );
  }
  return value;
}

// Vérification des rôles
async function checkUserRole(userId: number, requiredRole: string): Promise<void> {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.role !== requiredRole) {
    throw new ServiceError(
      ERROR_CODES.AUTHORIZATION_ERROR,
      `Utilisateur ${userId} n'a pas le rôle requis: ${requiredRole}`
    );
  }
}

// Fonctions utilitaires
async function logAuditAction(tx: any, userId: number, action: string, details: Record<string, any>) {
  await tx.insert(auditLogs).values({
    userId,
    action,
    details: JSON.parse(JSON.stringify(details)),
    createdAt: new Date(),
  });
}

async function createNotification(tx: any, orderId: number, message: string, type: string) {
  const [order] = await tx.select({ userId: orders.userId }).from(orders).where(eq(orders.id, orderId)).limit(1);
  await tx.insert(notifications).values({
    userId: order.userId,
    message,
    type,
    priority: "normal",
    status: "unread",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function logOrderStatusChange(tx: any, orderId: number, status: ValidOrderStatus, changedBy: number, storeOrderId?: number) {
  await tx.insert(orderStatusHistory).values({
    orderId,
    storeOrderId,
    status,
    changedAt: new Date(),
    changedBy,
  });
}

// Service pour gérer les storeOrders
export const storeOrderService = {
  // Récupérer les storeOrders d'un vendeur avec filtrage et pagination
  async getSellerStoreOrders(
    sellerUserId: number,
    filters: {
      status?: ValidOrderStatus[];
      page: number;
      perPage: number;
    }
  ): Promise<{ storeOrders: StoreOrderWithDetails[]; total: number }> {
    await checkUserRole(sellerUserId, "store");

    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.userId, sellerUserId))
      .limit(1);

    if (!store) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
    }

    const conditions = [eq(storeOrders.storeId, store.id)];
    if (filters.status?.length) {
      conditions.push(inArray(storeOrders.status, filters.status));
    }

    const totalQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(storeOrders)
      .where(and(...conditions));
    const total = Number(totalQuery[0].count);

    const storeOrdersQuery = await db
      .select({
        storeOrder: storeOrders,
        order: orders,
        store: stores,
        items: sql<any>`(
          SELECT COALESCE(json_agg(json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product', json_build_object(
              'id', p.id,
              'name', p.name
            )
          )), '[]'::json)
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.store_order_id = store_orders.id
        )`.as("items"),
        payment: sql<any>`(
          SELECT json_build_object(
            'id', pm.id,
            'amount', pm.amount,
            'status', pm.status,
            'paymentMethod', pm.payment_method
          )
          FROM payments pm
          WHERE pm.store_order_id = store_orders.id
          LIMIT 1
        )`.as("payment"),
        shipment: sql<any>`(
          SELECT json_build_object(
            'id', sh.id,
            'driverId', sh.driver_id,
            'status', sh.status
          )
          FROM shipments sh
          WHERE sh.store_order_id = store_orders.id
          LIMIT 1
        )`.as("shipment"),
      })
      .from(storeOrders)
      .innerJoin(orders, eq(storeOrders.orderId, orders.id))
      .innerJoin(stores, eq(storeOrders.storeId, stores.id))
      .where(and(...conditions))
      .orderBy(storeOrders.createdAt.desc())
      .limit(filters.perPage)
      .offset((filters.page - 1) * filters.perPage);

    const formattedStoreOrders: StoreOrderWithDetails[] = storeOrdersQuery.map((row) => ({
      ...row.storeOrder,
      order: row.order,
      store: row.store,
      items: Array.isArray(row.items) ? row.items : [],
      payment: row.payment && row.payment.id ? row.payment : null,
      shipment: row.shipment && row.shipment.id ? row.shipment : null,
    }));

    return { storeOrders: formattedStoreOrders, total };
  },

  // Récupérer les détails d'une storeOrder spécifique
  async getStoreOrderDetails(storeOrderId: number, sellerUserId: number): Promise<StoreOrderWithDetails> {
    await checkUserRole(sellerUserId, "store");

    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.userId, sellerUserId))
      .limit(1);

    if (!store) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
    }

    const [storeOrder] = await db
      .select({
        storeOrder: storeOrders,
        order: orders,
        store: stores,
        items: sql<any>`(
          SELECT COALESCE(json_agg(json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product', json_build_object(
              'id', p.id,
              'name', p.name
            )
          )), '[]'::json)
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.store_order_id = store_orders.id
        )`.as("items"),
        payment: sql<any>`(
          SELECT json_build_object(
            'id', pm.id,
            'amount', pm.amount,
            'status', pm.status,
            'paymentMethod', pm.payment_method
          )
          FROM payments pm
          WHERE pm.store_order_id = store_orders.id
          LIMIT 1
        )`.as("payment"),
        shipment: sql<any>`(
          SELECT json_build_object(
            'id', sh.id,
            'driverId', sh.driver_id,
            'status', sh.status
          )
          FROM shipments sh
          WHERE sh.store_order_id = store_orders.id
          LIMIT 1
        )`.as("shipment"),
      })
      .from(storeOrders)
      .innerJoin(orders, eq(storeOrders.orderId, orders.id))
      .innerJoin(stores, eq(storeOrders.storeId, stores.id))
      .where(and(eq(storeOrders.id, storeOrderId), eq(storeOrders.storeId, store.id)))
      .limit(1);

    if (!storeOrder) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Sous-commande ${storeOrderId} non trouvée pour ce vendeur`);
    }

    return {
      ...storeOrder.storeOrder,
      order: storeOrder.order,
      store: storeOrder.store,
      items: Array.isArray(storeOrder.items) ? storeOrder.items : [],
      payment: storeOrder.payment && storeOrder.payment.id ? storeOrder.payment : null,
      shipment: storeOrder.shipment && storeOrder.shipment.id ? storeOrder.shipment : null,
    };
  },

  // Mettre à jour le statut d'une storeOrder
  async updateStoreOrderStatus(
    storeOrderId: number,
    status: ValidOrderStatus,
    sellerUserId: number
  ): Promise<void> {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(sellerUserId, "store");
        validateEnum(status, validOrderStatuses, "status");

        const [store] = await tx
          .select({ id: stores.id })
          .from(stores)
          .where(eq(stores.userId, sellerUserId))
          .limit(1);

        if (!store) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
        }

        const [storeOrder] = await tx
          .select({ id: storeOrders.id, orderId: storeOrders.orderId })
          .from(storeOrders)
          .where(and(eq(storeOrders.id, storeOrderId), eq(storeOrders.storeId, store.id)))
          .limit(1);

        if (!storeOrder) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Sous-commande ${storeOrderId} non trouvée pour ce vendeur`);
        }

        await tx
          .update(storeOrders)
          .set({ status, updatedAt: new Date() })
          .where(eq(storeOrders.id, storeOrderId));

        await logOrderStatusChange(tx, storeOrder.orderId, status, sellerUserId, storeOrderId);

        // Vérifier si toutes les sous-commandes sont terminées
        const [{ count }] = await tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(storeOrders)
          .where(
            and(
              eq(storeOrders.orderId, storeOrder.orderId),
              inArray(storeOrders.status, ["pending", "in_progress"])
            )
          );

        if (count === 0) {
          const newOrderStatus = status === "delivered" ? "delivered" : "cancelled";
          await tx
            .update(orders)
            .set({ status: newOrderStatus, updatedAt: new Date() })
            .where(eq(orders.id, storeOrder.orderId));
          await logOrderStatusChange(tx, storeOrder.orderId, newOrderStatus, sellerUserId);
        }

        await createNotification(
          tx,
          storeOrder.orderId,
          `Sous-commande #${storeOrderId} mise à jour: ${status}`,
          "store_order_status"
        );
        await logAuditAction(tx, sellerUserId, "update_store_order_status", { storeOrderId, newStatus: status });
      } catch (error) {
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur lors de la mise à jour du statut",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },

  // Assigner un livreur à une expédition
  async assignDriverToShipment(
    shipmentId: number,
    driverId: number,
    sellerUserId: number
  ): Promise<void> {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(sellerUserId, "store");

        const [store] = await tx
          .select({ id: stores.id })
          .from(stores)
          .where(eq(stores.userId, sellerUserId))
          .limit(1);

        if (!store) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
        }

        const [shipment] = await tx
          .select({ id: shipments.id, storeOrderId: shipments.storeOrderId })
          .from(shipments)
          .innerJoin(storeOrders, eq(shipments.storeOrderId, storeOrders.id))
          .where(and(eq(shipments.id, shipmentId), eq(storeOrders.storeId, store.id)))
          .limit(1);

        if (!shipment) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Expédition ${shipmentId} non trouvée pour ce vendeur`);
        }

        const [driver] = await tx
          .select({ id: storeDrivers.driverId })
          .from(storeDrivers)
          .where(and(eq(storeDrivers.storeId, store.id), eq(storeDrivers.driverId, driverId)))
          .limit(1);

        if (!driver) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, "Le livreur n'est pas associé à ce magasin");
        }

        await tx
          .update(shipments)
          .set({ driverId, status: "in_progress", updatedAt: new Date() })
          .where(eq(shipments.id, shipmentId));

        await createNotification(
          tx,
          shipment.storeOrderId,
          `Livreur assigné à l'expédition #${shipmentId}`,
          "shipment_status"
        );
        await logAuditAction(tx, sellerUserId, "assign_driver_to_shipment", { shipmentId, driverId });
      } catch (error) {
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur lors de l'assignation du livreur",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },

  // Créer une expédition pour une storeOrder
  async createShipmentForStoreOrder(
    storeOrderId: number,
    sellerUserId: number
  ): Promise<void> {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(sellerUserId, "store");

        const [store] = await tx
          .select({ id: stores.id, addressId: stores.addressId })
          .from(stores)
          .where(eq(stores.userId, sellerUserId))
          .limit(1);

        if (!store) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
        }

        const [storeOrder] = await tx
          .select({ id: storeOrders.id, orderId: storeOrders.orderId })
          .from(storeOrders)
          .where(and(eq(storeOrders.id, storeOrderId), eq(storeOrders.storeId, store.id)))
          .limit(1);

        if (!storeOrder) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Sous-commande ${storeOrderId} non trouvée pour ce vendeur`);
        }

        const [existingShipment] = await tx
          .select({ id: shipments.id })
          .from(shipments)
          .where(eq(shipments.storeOrderId, storeOrderId))
          .limit(1);

        if (existingShipment) {
          throw new ServiceError(ERROR_CODES.ALREADY_EXISTS, "Une expédition existe déjà pour cette sous-commande");
        }

        await tx.insert(shipments).values({
          storeOrderId,
          originAddressId: store.addressId!,
          status: "pending",
          isManagedByStore: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await createNotification(
          tx,
          storeOrder.orderId,
          `Expédition créée pour la sous-commande #${storeOrderId}`,
          "shipment_created"
        );
        await logAuditAction(tx, sellerUserId, "create_shipment_for_store_order", { storeOrderId });
      } catch (error) {
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur lors de la création de l'expédition",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },

  // Mettre à jour le statut d'une expédition
  async updateShipmentStatus(
    shipmentId: number,
    status: ValidShipmentStatus,
    sellerUserId: number
  ): Promise<void> {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(sellerUserId, "store");
        validateEnum(status, validShipmentStatuses, "status");

        const [store] = await tx
          .select({ id: stores.id })
          .from(stores)
          .where(eq(stores.userId, sellerUserId))
          .limit(1);

        if (!store) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
        }

        const [shipment] = await tx
          .select({ id: shipments.id, storeOrderId: shipments.storeOrderId })
          .from(shipments)
          .innerJoin(storeOrders, eq(shipments.storeOrderId, storeOrders.id))
          .where(and(eq(shipments.id, shipmentId), eq(storeOrders.storeId, store.id)))
          .limit(1);

        if (!shipment) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Expédition ${shipmentId} non trouvée pour ce vendeur`);
        }

        await tx
          .update(shipments)
          .set({ status, updatedAt: new Date() })
          .where(eq(shipments.id, shipmentId));

        if (status === "delivered") {
          await tx
            .update(storeOrders)
            .set({ status: "delivered", updatedAt: new Date() })
            .where(eq(storeOrders.id, shipment.storeOrderId));
          await logOrderStatusChange(tx, shipment.storeOrderId, "delivered", sellerUserId, shipment.storeOrderId);
        }

        await createNotification(
          tx,
          shipment.storeOrderId,
          `Statut de l'expédition #${shipmentId} mis à jour: ${status}`,
          "shipment_status"
        );
        await logAuditAction(tx, sellerUserId, "update_shipment_status", { shipmentId, newStatus: status });
      } catch (error) {
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur lors de la mise à jour du statut de l'expédition",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },
};

export default storeOrderService;