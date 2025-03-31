import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  payments,
  products,
  stores,
  shipments,
  storeDrivers,
  productStocks,
  addresses,
  notifications,
  orderStatusHistory,
  users,
  auditLogs,
} from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ServiceError, ERROR_CODES } from "./orders.errors";

// Enums validés
export const validOrderStatuses = ["pending", "in_progress", "delivered", "cancelled"] as const;
export const validPaymentStatuses = ["pending", "paid", "failed", "refunded"] as const;
export const validShipmentStatuses = ["pending", "in_progress", "delivered", "failed"] as const;
export const validPaymentMethods = ["orange_money", "mobile_money", "cash_on_delivery"] as const;
export const validRoles = ["user", "driver", "store", "manager", "admin"] as const;

export type ValidOrderStatus = typeof validOrderStatuses[number];
export type ValidPaymentStatus = typeof validPaymentStatuses[number];
export type ValidShipmentStatus = typeof validShipmentStatuses[number];
export type ValidPaymentMethod = typeof validPaymentMethods[number];
export type ValidRole = typeof validRoles[number];

// Interfaces pour les données
export interface OrderInsert {
  userId: number;
  originAddressId?: number;
  destinationAddressId?: number;
  totalDeliveryFee?: number;
  totalAmount?: number;
  paymentMethod?: ValidPaymentMethod;
  status?: ValidOrderStatus;
}

export interface OrderItemInsert {
  productId: number;
  quantity: number;
  price: number;
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
async function checkUserRole(userId: number, requiredRole: ValidRole): Promise<void> {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.role !== requiredRole) {
    throw new ServiceError(
      ERROR_CODES.AUTHORIZATION_ERROR,
      `Utilisateur ${userId} n'a pas le rôle requis: ${requiredRole}`
    );
  }
}

// Fonction pour logger les actions dans auditLogs
async function logAuditAction(
  tx: any,
  userId: number | null,
  action: string,
  details: Record<string, any>
) {
  await tx.insert(auditLogs).values({
    userId,
    action,
    details: JSON.parse(JSON.stringify(details)), // Assure une sérialisation propre
    createdAt: new Date(),
  });
}

// Ajout de notification
async function createNotification(tx: any, userId: number, message: string, type: string) {
  await tx.insert(notifications).values({
    userId,
    message,
    type,
    priority: "normal",
    status: "unread",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// Mise à jour de l'historique des statuts
async function logOrderStatusChange(tx: any, orderId: number, status: ValidOrderStatus, changedBy: number) {
  await tx.insert(orderStatusHistory).values({
    orderId,
    status,
    changedAt: new Date(),
    changedBy,
  });
}

// Services
export const orderService = {
  async createOrder(orderData: OrderInsert, items: OrderItemInsert[], callerUserId: number) {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(callerUserId, "user");

        if (!items.length) {
          throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Aucun article fourni pour la commande");
        }
        if (orderData.totalAmount && orderData.totalAmount < 0) {
          throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Le montant total ne peut pas être négatif");
        }
        if (orderData.paymentMethod) {
          validateEnum(orderData.paymentMethod, validPaymentMethods, "paymentMethod");
        }
        validateEnum(orderData.status || "pending", validOrderStatuses, "status");

        if (orderData.originAddressId) {
          const [origin] = await tx.select().from(addresses).where(eq(addresses.id, orderData.originAddressId));
          if (!origin) {
            throw new ServiceError(
              ERROR_CODES.NOT_FOUND,
              `Adresse d'origine ${orderData.originAddressId} non trouvée`
            );
          }
        }
        if (orderData.destinationAddressId) {
          const [dest] = await tx.select().from(addresses).where(eq(addresses.id, orderData.destinationAddressId));
          if (!dest) {
            throw new ServiceError(
              ERROR_CODES.NOT_FOUND,
              `Adresse de destination ${orderData.destinationAddressId} non trouvée`
            );
          }
        }

        for (const item of items) {
          if (item.quantity <= 0 || item.price < 0) {
            throw new ServiceError(
              ERROR_CODES.VALIDATION_ERROR,
              `Quantité ou prix invalide pour le produit ${item.productId}`
            );
          }
          const [stock] = await tx
            .select({ availableStock: productStocks.availableStock })
            .from(productStocks)
            .where(eq(productStocks.productId, item.productId))
            .limit(1);
          if (!stock || stock.availableStock < item.quantity) {
            throw new ServiceError(
              ERROR_CODES.INSUFFICIENT_STOCK,
              `Stock insuffisant pour le produit ${item.productId}`,
              { availableStock: stock?.availableStock || 0, requested: item.quantity }
            );
          }
          await tx
            .update(productStocks)
            .set({
              reservedStock: sql`${productStocks.reservedStock} + ${item.quantity}`,
              availableStock: sql`${productStocks.availableStock} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(productStocks.productId, item.productId));
        }

        const [newOrder] = await tx
          .insert(orders)
          .values({
            ...orderData,
            status: orderData.status || "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const orderItemsData = items.map((item) => ({
          ...item,
          orderId: newOrder.id,
          price: Math.round(item.price),
        }));
        await tx.insert(orderItems).values(orderItemsData);

        if (orderData.paymentMethod && orderData.totalAmount !== undefined) {
          await tx.insert(payments).values({
            amount: Math.round(orderData.totalAmount),
            paymentMethod: orderData.paymentMethod,
            status: "pending",
            orderId: newOrder.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        await createNotification(tx, orderData.userId, `Commande #${newOrder.id} créée`, "order_created");
        await logOrderStatusChange(tx, newOrder.id, newOrder.status, callerUserId);
        await logAuditAction(tx, callerUserId, "create_order", {
          orderId: newOrder.id,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        });

        return newOrder;
      } catch (error: any) {
        if (error instanceof ServiceError) throw error;
        throw new ServiceError(
          ERROR_CODES.DATABASE_ERROR,
          "Erreur lors de la création de la commande",
          { originalError: error instanceof Error ? error.message : String(error) }
        );
      }
    });
    },
    
async updateOrderStatus(orderId: number, status: ValidOrderStatus, callerUserId: number) {
    return db.transaction(async (tx) => {
      try {
        const [caller] = await tx.select({ role: users.role }).from(users).where(eq(users.id, callerUserId));
        if (!caller || !["manager", "admin"].includes(caller.role)) {
          throw new ServiceError(
            ERROR_CODES.AUTHORIZATION_ERROR,
            "Autorisation insuffisante pour modifier le statut"
          );
        }

        validateEnum(status, validOrderStatuses, "status");

        const [updatedOrder] = await tx
          .update(orders)
          .set({ status, updatedAt: new Date() })
          .where(eq(orders.id, orderId))
          .returning();

        if (!updatedOrder) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Commande avec l'ID ${orderId} non trouvée`);
        }

        await createNotification(tx, updatedOrder.userId!, `Commande #${orderId} mise à jour: ${status}`, "order_status");
        await logOrderStatusChange(tx, orderId, status, callerUserId);
        await logAuditAction(tx, callerUserId, "update_order_status", { orderId, newStatus: status });

        return updatedOrder;
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        throw new ServiceError(
          ERROR_CODES.DATABASE_ERROR,
          "Erreur lors de la mise à jour du statut de la commande",
          { originalError: error instanceof Error ? error.message : String(error) }
        );
      }
    });
  },

  async updatePaymentStatus(orderId: number, status: ValidPaymentStatus, transactionId?: string, callerUserId?: number) {
    return db.transaction(async (tx) => {
      try {
        if (callerUserId) {
          await checkUserRole(callerUserId, "admin");
        }

        validateEnum(status, validPaymentStatuses, "status");

        const [updatedPayment] = await tx
          .update(payments)
          .set({
            status,
            transactionId: transactionId ? transactionId.trim() : undefined,
            updatedAt: new Date(),
          })
          .where(eq(payments.orderId, orderId))
          .returning();

        if (!updatedPayment) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Paiement pour la commande ${orderId} non trouvé`);
        }

        const newOrderStatus = status === "paid" ? "in_progress" : status === "failed" ? "cancelled" : undefined;
        if (newOrderStatus) {
          const [updatedOrder] = await tx
            .update(orders)
            .set({ status: newOrderStatus, updatedAt: new Date() })
            .where(eq(orders.id, orderId))
            .returning();
          if (updatedOrder) {
            await createNotification(tx, updatedOrder.userId!, `Statut de paiement: ${status}`, "payment_status");
            await logOrderStatusChange(tx, orderId, newOrderStatus, callerUserId || updatedOrder.userId!);
          }
        }

        await logAuditAction(tx, callerUserId || null, "update_payment_status", {
          orderId,
          newStatus: status,
          transactionId,
        });

        return updatedPayment;
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        throw new ServiceError(
          ERROR_CODES.DATABASE_ERROR,
          "Erreur lors de la mise à jour du statut de paiement",
          { originalError: error instanceof Error ? error.message : String(error) }
        );
      }
    });
  },

  async cancelOrder(orderId: number, callerUserId: number) {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(callerUserId, "user");

        const [order] = await tx
          .select({ status: orders.status, userId: orders.userId })
          .from(orders)
          .where(eq(orders.id, orderId));
        if (!order) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Commande ${orderId} non trouvée`);
        }
        if (order.status === "cancelled") {
          throw new ServiceError(ERROR_CODES.ALREADY_EXISTS, "Commande déjà annulée");
        }

        const [updatedOrder] = await tx
          .update(orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(orders.id, orderId))
          .returning();

        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        for (const item of items) {
          await tx
            .update(productStocks)
            .set({
              reservedStock: sql`${productStocks.reservedStock} - ${item.quantity}`,
              availableStock: sql`${productStocks.availableStock} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(productStocks.productId, item.productId as number));
        }

        const [payment] = await tx
          .select({ status: payments.status })
          .from(payments)
          .where(eq(payments.orderId, orderId))
          .limit(1);
        if (payment && payment.status === "paid") {
          await tx
            .update(payments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(payments.orderId, orderId));
        }

        await createNotification(tx, order.userId!, `Commande #${orderId} annulée`, "order_cancelled");
        await logOrderStatusChange(tx, orderId, "cancelled", callerUserId);
        await logAuditAction(tx, callerUserId, "cancel_order", { orderId });

        return updatedOrder;
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        throw new ServiceError(
          ERROR_CODES.DATABASE_ERROR,
          "Erreur lors de l'annulation de la commande",
          { originalError: error instanceof Error ? error.message : String(error) }
        );
      }
    });
  },

  async sellerUpdateOrderStatus(orderId: number, status: ValidOrderStatus, sellerUserId: number) {
    return db.transaction(async (tx) => {
      await checkUserRole(sellerUserId, "store");
      validateEnum(status, validOrderStatuses, "status");

      const [store] = await tx
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.userId, sellerUserId))
        .limit(1);
      if (!store) throw new Error("Magasin du vendeur non trouvé");

      const storeId = store.id;

      const [{ count }] = await tx
        .select({ count: sql<number>`COUNT(*)` })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(
          and(
            eq(orderItems.orderId, orderId),
            eq(products.storeId, storeId)
          )
        );

      if (count === 0) {
        throw new Error("Le vendeur n'a pas de produits dans cette commande");
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

      if (!updatedOrder) {
        throw new Error(`Commande ${orderId} non trouvée`);
      }

      await createNotification(tx, updatedOrder.userId!, `Commande #${orderId} mise à jour par le vendeur: ${status}`, "order_status");
      await logOrderStatusChange(tx, orderId, status, sellerUserId);

      return updatedOrder;
    });
  },

  async sellerCreateShipment(orderId: number, sellerUserId: number, driverId?: number) {
    return db.transaction(async (tx) => {
      await checkUserRole(sellerUserId, "store");

      const [store] = await tx
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.userId, sellerUserId))
        .limit(1);
      if (!store) throw new Error("Magasin du vendeur non trouvé");

      const storeId = store.id;

      const [{ count }] = await tx
        .select({ count: sql<number>`COUNT(*)` })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(
          and(
            eq(orderItems.orderId, orderId),
            eq(products.storeId, storeId)
          )
        );

      if (count === 0) {
        throw new Error("Le vendeur n'a pas de produits dans cette commande");
      }

      if (driverId) {
        const [driver] = await tx
          .select({ id: storeDrivers.driverId })
          .from(storeDrivers)
          .where(
            and(
              eq(storeDrivers.storeId, storeId),
              eq(storeDrivers.driverId, driverId)
            )
          );
        if (!driver) throw new Error("Chauffeur non associé au magasin");
      }

      const [newShipment] = await tx
        .insert(shipments)
        .values({
          orderId,
          driverId,
          status: "pending",
          isManagedByStore: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const [order] = await tx
        .select({ status: orders.status, userId: orders.userId })
        .from(orders)
        .where(eq(orders.id, orderId));
      if (order.status !== "cancelled") {
        await tx
          .update(orders)
          .set({ status: "in_progress", updatedAt: new Date() })
          .where(eq(orders.id, orderId));
        await logOrderStatusChange(tx, orderId, "in_progress", sellerUserId);
      }

      await createNotification(tx, order.userId!, `Expédition créée pour la commande #${orderId}`, "shipment_created");

      return newShipment;
    });
  },

async sellerUpdateShipmentStatus(shipmentId: number, status: ValidShipmentStatus, sellerUserId: number) {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(sellerUserId, "store");
        validateEnum(status, validShipmentStatuses, "status");

        const [shipment] = await tx
          .select({ orderId: shipments.orderId })
          .from(shipments)
          .where(
            and(
              eq(shipments.id, shipmentId),
              eq(shipments.isManagedByStore, true)
            )
          )
          .limit(1);

        if (!shipment) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            "Expédition non trouvée ou non gérée par le vendeur"
          );
        }

        const orderId = shipment.orderId as number;

        const [store] = await tx
          .select({ id: stores.id })
          .from(stores)
          .where(eq(stores.userId, sellerUserId))
          .limit(1);
        if (!store) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
        }

        const storeId = store.id as number;

        const [{ count }] = await tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(
            and(
              eq(orderItems.orderId, orderId),
              eq(products.storeId, storeId)
            )
          );

        if (count === 0) {
          throw new ServiceError(
            ERROR_CODES.VALIDATION_ERROR,
            "Le vendeur n'a pas de produits dans cette commande"
          );
        }

        const [updatedShipment] = await tx
          .update(shipments)
          .set({
            status,
            updatedAt: new Date(),
            ...(status === "delivered" && { lastKnownStatus: "delivered" }),
          })
          .where(eq(shipments.id, shipmentId))
          .returning();

        if (status === "delivered" || status === "failed") {
          const [{ count: pendingCount }] = await tx
            .select({ count: sql<number>`COUNT(*)` })
            .from(shipments)
            .where(
              and(
                eq(shipments.orderId, orderId),
                inArray(shipments.status, ["pending", "in_progress"])
              )
            );

          if (pendingCount === 0) {
            const newOrderStatus = status === "delivered" ? "delivered" : "cancelled";
            const [order] = await tx
              .update(orders)
              .set({ status: newOrderStatus, updatedAt: new Date() })
              .where(eq(orders.id, orderId))
              .returning();
            await logOrderStatusChange(tx, orderId, newOrderStatus, sellerUserId);
            await createNotification(tx, order.userId!, `Commande #${orderId} ${newOrderStatus}`, "order_status");
          }
        }

        await createNotification(tx, (await tx.select({ userId: orders.userId }).from(orders).where(eq(orders.id, orderId)).limit(1))[0].userId!, `Expédition #${shipmentId} mise à jour: ${status}`, "shipment_status");
        await logAuditAction(tx, sellerUserId, "update_shipment_status", { shipmentId, newStatus: status });

        return updatedShipment;
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        throw new ServiceError(
          ERROR_CODES.DATABASE_ERROR,
          "Erreur lors de la mise à jour du statut de l'expédition",
          { originalError: error instanceof Error ? error.message : String(error) }
        );
      }
    });
  },

  async sellerAssignDriverToShipment(shipmentId: number, driverId: number, sellerUserId: number) {
    return db.transaction(async (tx) => {
      await checkUserRole(sellerUserId, "store");

      const [shipment] = await tx
        .select({ orderId: shipments.orderId })
        .from(shipments)
        .where(
          and(
            eq(shipments.id, shipmentId),
            eq(shipments.isManagedByStore, true)
          )
        )
        .limit(1);

      if (!shipment) {
        throw new Error("Expédition non trouvée ou non gérée par le vendeur");
      }

      const orderId = shipment.orderId as number;

      const [store] = await tx
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.userId, sellerUserId))
        .limit(1);
      if (!store) throw new Error("Magasin du vendeur non trouvé");

      const storeId = store.id;

      const [{ count }] = await tx
        .select({ count: sql<number>`COUNT(*)` })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(
          and(
            eq(orderItems.orderId, orderId),
            eq(products.storeId, storeId)
          )
        );

      if (count === 0) {
        throw new Error("Le vendeur n'a pas de produits dans cette commande");
      }

      const [driver] = await tx
        .select({ id: storeDrivers.driverId })
        .from(storeDrivers)
        .where(
          and(
            eq(storeDrivers.storeId, storeId),
            eq(storeDrivers.driverId, driverId)
          )
        );
      if (!driver) {
        throw new Error("Le chauffeur n'est pas associé à ce vendeur");
      }

      const [updatedShipment] = await tx
        .update(shipments)
        .set({
          driverId,
          status: "in_progress",
          updatedAt: new Date(),
        })
        .where(eq(shipments.id, shipmentId))
        .returning();

      await createNotification(tx, (await tx.select({ userId: orders.userId }).from(orders).where(eq(orders.id, orderId)).limit(1))[0].userId!, `Chauffeur assigné à l'expédition #${shipmentId}`, "shipment_status");

      return updatedShipment;
    });
  },

  async sellerGetOrderItems(orderId: number, sellerUserId: number) {
    await checkUserRole(sellerUserId, "store");

    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.userId, sellerUserId))
      .limit(1);

    if (!store) {
      throw new Error("Magasin du vendeur non trouvé");
    }

    const storeId = store.id;

    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        product: {
          id: products.id,
          name: products.name || "Produit sans nom",
        },
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(
        and(
          eq(orderItems.orderId, orderId),
          eq(products.storeId, storeId)
        )
      )
      .limit(100);

    return items;
  },
};

export default orderService;