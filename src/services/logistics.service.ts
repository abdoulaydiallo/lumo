import { db } from "@/lib/db";
import {
  orders,
  storeOrders,
  shipments,
  drivers,
  storeDrivers,
  notifications,
  orderStatusHistory,
  users,
  stores,
  auditLogs,
  tracking,
} from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ServiceError, ERROR_CODES } from "./orders.errors";

// Type definitions
type ValidShipmentStatus = "pending" | "in_progress" | "delivered" | "failed";
type ValidOrderStatus = "pending" | "in_progress" | "delivered" | "cancelled";
type ValidRole = "user" | "driver" | "store" | "manager" | "admin";
type PriorityLevel = "low" | "normal" | "high";

export interface ShipmentInsert {
  storeOrderId: number;
  driverId?: number;
  priorityLevel?: PriorityLevel;
  deliveryNotes?: string;
}

export interface ShipmentUpdate {
  shipmentId: number;
  status?: ValidShipmentStatus;
  driverId?: number;
  deliveryNotes?: string;
  priorityLevel?: PriorityLevel;
}

export interface TrackingInsert {
  shipmentId: number;
  latitude: number;
  longitude: number;
}

// Utility functions
async function validateEnum<T>(value: any, validValues: readonly T[], fieldName: string): Promise<T> {
  if (!validValues.includes(value)) {
    throw new ServiceError(
      ERROR_CODES.VALIDATION_ERROR,
      `Valeur invalide pour ${fieldName}: ${value}. Attendu: ${validValues.join(", ")}`
    );
  }
  return value;
}

async function checkUserRole(userId: number, requiredRoles: ValidRole[]): Promise<void> {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !requiredRoles.includes(user.role)) {
    throw new ServiceError(
      ERROR_CODES.AUTHORIZATION_ERROR,
      `Utilisateur ${userId} n'a pas le rôle requis: ${requiredRoles.join(", ")}`
    );
  }
}

async function verifyOrderLaunched(orderId: number): Promise<void> {
  const [order] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) {
    throw new ServiceError(ERROR_CODES.NOT_FOUND, `Commande ${orderId} non trouvée`);
  }
  if (order.status === "pending") {
    throw new ServiceError(
      ERROR_CODES.VALIDATION_ERROR,
      "La logistique ne peut être gérée que pour une commande lancée"
    );
  }
}

async function checkSellerOwnership(sellerUserId: number, storeOrderId: number): Promise<number> {
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.userId, sellerUserId))
    .limit(1);
  if (!store) {
    throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin non trouvé pour ce vendeur");
  }

  const [storeOrder] = await db
    .select({ storeId: storeOrders.storeId })
    .from(storeOrders)
    .where(eq(storeOrders.id, storeOrderId))
    .limit(1);
  if (!storeOrder || storeOrder.storeId !== store.id) {
    throw new ServiceError(
      ERROR_CODES.AUTHORIZATION_ERROR,
      `Sous-commande ${storeOrderId} n'appartient pas au vendeur ${sellerUserId}`
    );
  }
  return store.id;
}

async function logAuditAction(tx: any, userId: number, action: string, details: Record<string, any>) {
  await tx.insert(auditLogs).values({
    userId,
    action,
    details: JSON.stringify(details),
    createdAt: new Date(),
  });
}

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

async function logOrderStatusChange(tx: any, orderId: number, status: ValidOrderStatus, changedBy: number, storeOrderId?: number) {
  await tx.insert(orderStatusHistory).values({
    orderId,
    storeOrderId,
    status,
    changedAt: new Date(),
    changedBy,
  });
}

// Main service object
export const logisticsService = {
  async sellerCreateShipment(orderId: number, shipmentData: ShipmentInsert, sellerUserId: number) {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(sellerUserId, ["store"]);
        await verifyOrderLaunched(orderId);
        const storeId = await checkSellerOwnership(sellerUserId, shipmentData.storeOrderId);

        const [store] = await tx
          .select({ addressId: stores.addressId })
          .from(stores)
          .where(eq(stores.id, storeId))
          .limit(1);
        if (!store?.addressId) {
          throw new ServiceError(
            ERROR_CODES.VALIDATION_ERROR,
            `Adresse manquante pour le magasin ${storeId}`
          );
        }

        if (shipmentData.driverId) {
          const [driver] = await tx
            .select()
            .from(storeDrivers)
            .where(
              and(
                eq(storeDrivers.storeId, storeId),
                eq(storeDrivers.driverId, shipmentData.driverId)
              )
            )
            .limit(1);
          if (!driver) {
            throw new ServiceError(
              ERROR_CODES.NOT_FOUND,
              `Livreur ${shipmentData.driverId} non associé au magasin`
            );
          }
        }

        const [existingShipment] = await tx
          .select()
          .from(shipments)
          .where(eq(shipments.storeOrderId, shipmentData.storeOrderId))
          .limit(1);
        if (existingShipment) {
          throw new ServiceError(
            ERROR_CODES.ALREADY_EXISTS,
            `Expédition déjà créée pour la sous-commande ${shipmentData.storeOrderId}`
          );
        }

        const result = await tx
          .insert(shipments)
          .values({
            storeOrderId: shipmentData.storeOrderId,
            originAddressId: store.addressId,
            driverId: shipmentData.driverId,
            status: shipmentData.driverId ? "in_progress" : "pending",
            isManagedByStore: true,
            priorityLevel: shipmentData.priorityLevel || "normal",
            deliveryNotes: shipmentData.deliveryNotes,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const newShipment = Array.isArray(result) ? result[0] : undefined;

        await tx
          .update(storeOrders)
          .set({ status: "in_progress", updatedAt: new Date() })
          .where(eq(storeOrders.id, shipmentData.storeOrderId));

        const [order] = await tx
          .select({ userId: orders.userId })
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);
        await createNotification(
          tx,
          order.userId,
          `Expédition #${newShipment.id} créée pour la commande #${orderId}`,
          "shipment_created"
        );
        await logAuditAction(tx, sellerUserId, "seller_create_shipment", {
          orderId,
          shipmentId: newShipment.id,
          storeOrderId: shipmentData.storeOrderId,
        });

        return newShipment;
      } catch (error) {
        console.error("Erreur création expédition:", error);
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur création expédition",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },

  async updateShipment(updateData: ShipmentUpdate, callerUserId: number, callerRole: "store" | "admin") {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(callerUserId, [callerRole]);
        const [shipment] = await tx
          .select({
            storeOrderId: shipments.storeOrderId,
            orderId: storeOrders.orderId,
            isManagedByStore: shipments.isManagedByStore,
          })
          .from(shipments)
          .leftJoin(storeOrders, eq(shipments.storeOrderId, storeOrders.id))
          .where(eq(shipments.id, updateData.shipmentId))
          .limit(1);

        if (!shipment) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            `Expédition ${updateData.shipmentId} non trouvée`
          );
        }

        await verifyOrderLaunched(shipment.orderId);

        if (callerRole === "store" && !shipment.isManagedByStore) {
          throw new ServiceError(
            ERROR_CODES.AUTHORIZATION_ERROR,
            "Vendeur ne peut modifier que ses propres expéditions"
          );
          await checkSellerOwnership(callerUserId, shipment.storeOrderId);
        }

        const updates: any = { updatedAt: new Date() };
        if (updateData.status) {
          updates.status = updateData.status;
        }
        if (updateData.driverId) {
          const [driver] = await tx
            .select()
            .from(drivers)
            .where(eq(drivers.id, updateData.driverId))
            .limit(1);
          if (!driver) {
            throw new ServiceError(
              ERROR_CODES.NOT_FOUND,
              `Livreur ${updateData.driverId} non trouvé`
            );
          }
          updates.driverId = updateData.driverId;
          updates.status = updates.status || "in_progress";
        }
        if (updateData.deliveryNotes) updates.deliveryNotes = updateData.deliveryNotes;
        if (updateData.priorityLevel) updates.priorityLevel = updateData.priorityLevel;

        const [updatedShipment] = await tx
          .update(shipments)
          .set(updates)
          .where(eq(shipments.id, updateData.shipmentId))
          .returning();

        if (updates.status === "delivered" || updates.status === "failed") {
          const newOrderStatus = updates.status === "delivered" ? "delivered" : "cancelled";
          await tx
            .update(storeOrders)
            .set({ status: newOrderStatus, updatedAt: new Date() })
            .where(eq(storeOrders.id, shipment.storeOrderId));

          const [{ count }] = await tx
            .select({ count: sql<number>`COUNT(*)` })
            .from(storeOrders)
            .where(
              and(
                eq(storeOrders.orderId, shipment.orderId),
                inArray(storeOrders.status, ["pending", "in_progress"])
              )
            );
          if (count === 0) {
            await tx
              .update(orders)
              .set({ status: newOrderStatus, updatedAt: new Date() })
              .where(eq(orders.id, shipment.orderId));
            await logOrderStatusChange(tx, shipment.orderId, newOrderStatus, callerUserId);
          }
        }

        const [order] = await tx
          .select({ userId: orders.userId })
          .from(orders)
          .where(eq(orders.id, shipment.orderId))
          .limit(1);
        await createNotification(
          tx,
          order.userId,
          `Expédition #${updateData.shipmentId} mise à jour`,
          "shipment_updated"
        );
        await logAuditAction(tx, callerUserId, `${callerRole}_update_shipment`, {
          shipmentId: updateData.shipmentId,
          updates,
        });

        return updatedShipment;
      } catch (error) {
        console.error("Erreur mise à jour expédition:", error);
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur mise à jour expédition",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },

  async assignDriver(shipmentId: number, driverId: number, callerUserId: number, callerRole: "store" | "admin") {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(callerUserId, [callerRole]);
        const [shipment] = await tx
          .select({
            storeOrderId: shipments.storeOrderId,
            orderId: storeOrders.orderId,
            isManagedByStore: shipments.isManagedByStore,
          })
          .from(shipments)
          .leftJoin(storeOrders, eq(shipments.storeOrderId, storeOrders.id))
          .where(eq(shipments.id, shipmentId))
          .limit(1);

        if (!shipment) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Expédition ${shipmentId} non trouvée`);
        }

        await verifyOrderLaunched(shipment.orderId);

        if (callerRole === "store") {
          if (!shipment.isManagedByStore) {
            throw new ServiceError(
              ERROR_CODES.AUTHORIZATION_ERROR,
              "Vendeur ne peut assigner qu'à ses expéditions"
            );
          }
          const storeId = await checkSellerOwnership(callerUserId, shipment.storeOrderId);
          const [driver] = await tx
            .select()
            .from(storeDrivers)
            .where(
              and(
                eq(storeDrivers.storeId, storeId),
                eq(storeDrivers.driverId, driverId)
              )
            )
            .limit(1);
          if (!driver) {
            throw new ServiceError(
              ERROR_CODES.NOT_FOUND,
              `Livreur ${driverId} non associé au magasin`
            );
          }
        } else {
          const [driver] = await tx
            .select()
            .from(drivers)
            .where(eq(drivers.id, driverId))
            .limit(1);
          if (!driver) {
            throw new ServiceError(
              ERROR_CODES.NOT_FOUND,
              `Livreur ${driverId} non trouvé`
            );
          }
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

        const [order] = await tx
          .select({ userId: orders.userId })
          .from(orders)
          .where(eq(orders.id, shipment.orderId))
          .limit(1);
        await createNotification(
          tx,
          order.userId,
          `Livreur #${driverId} assigné à l'expédition #${shipmentId}`,
          "driver_assigned"
        );
        await logAuditAction(tx, callerUserId, `${callerRole}_assign_driver`, {
          shipmentId,
          driverId,
        });

        return updatedShipment;
      } catch (error) {
        console.error("Erreur assignation livreur:", error);
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur assignation livreur",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },

  async addTracking(trackingData: TrackingInsert, callerUserId: number) {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(callerUserId, ["admin"]);
        const [shipment] = await tx
          .select({ orderId: storeOrders.orderId })
          .from(shipments)
          .leftJoin(storeOrders, eq(shipments.storeOrderId, storeOrders.id))
          .where(eq(shipments.id, trackingData.shipmentId))
          .limit(1);

        if (!shipment) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            `Expédition ${trackingData.shipmentId} non trouvée`
          );
        }

        await verifyOrderLaunched(shipment.orderId);

        const [newTracking] = await tx
          .insert(tracking)
          .values([
            {
              shipmentId: trackingData.shipmentId,
              latitude: trackingData.latitude.toString(),
              longitude: trackingData.longitude.toString(),
              timestamp: new Date(),
            }
          ])
          .returning();

        const [order] = await tx
          .select({ userId: orders.userId })
          .from(orders)
          .where(eq(orders.id, shipment.orderId))
          .limit(1);
        await createNotification(
          tx,
          order.userId,
          `Suivi ajouté pour l'expédition #${trackingData.shipmentId}`,
          "tracking_added"
        );
        await logAuditAction(tx, callerUserId, "add_tracking", {
          shipmentId: trackingData.shipmentId,
          latitude: trackingData.latitude,
          longitude: trackingData.longitude,
        });

        return newTracking;
      } catch (error) {
        console.error("Erreur ajout suivi:", error);
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur ajout suivi",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },

  async getShipments(orderId: number, callerUserId: number, callerRole: "store" | "admin") {
    try {
      await checkUserRole(callerUserId, [callerRole]);
      await verifyOrderLaunched(orderId);

      const shipmentsQuery = await db
        .select({
          id: shipments.id,
          storeOrderId: shipments.storeOrderId,
          driverId: shipments.driverId,
          status: shipments.status,
          priorityLevel: shipments.priorityLevel,
          deliveryNotes: shipments.deliveryNotes,
          createdAt: shipments.createdAt,
          updatedAt: shipments.updatedAt,
          storeId: storeOrders.storeId,
          isManagedByStore: shipments.isManagedByStore,
        })
        .from(shipments)
        .leftJoin(storeOrders, eq(shipments.storeOrderId, storeOrders.id))
        .where(eq(storeOrders.orderId, orderId));

      if (callerRole === "store") {
        const storeId = await checkSellerOwnership(callerUserId, shipmentsQuery[0]?.storeOrderId || 0);
        return shipmentsQuery.filter((s) => s.storeId === storeId && s.isManagedByStore);
      }

      return shipmentsQuery;
    } catch (error) {
      console.error("Erreur récupération expéditions:", error);
      throw error instanceof ServiceError
        ? error
        : new ServiceError(
            ERROR_CODES.DATABASE_ERROR,
            "Erreur récupération expéditions",
            { originalError: error instanceof Error ? error.message : String(error) }
          );
    }
  },

  async getAvailableDrivers(callerUserId: number, callerRole: "store" | "admin") {
    try {
      await checkUserRole(callerUserId, [callerRole]);

      if (callerRole === "store") {
        const [store] = await db
          .select({ id: stores.id })
          .from(stores)
          .where(eq(stores.userId, callerUserId))
          .limit(1);
        if (!store) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin non trouvé");
        }

        return await db
          .select({
            id: drivers.id,
            licenseNumber: drivers.licenseNumber,
            plateNumber: drivers.plateNumber,
            vehicleType: drivers.vehicleType,
            isAvailable: drivers.isAvailable,
          })
          .from(drivers)
          .leftJoin(storeDrivers, eq(drivers.id, storeDrivers.driverId))
          .where(
            and(
              eq(storeDrivers.storeId, store.id),
              eq(drivers.isAvailable, true)
            )
          );
      }

      return await db
        .select({
          id: drivers.id,
          licenseNumber: drivers.licenseNumber,
          plateNumber: drivers.plateNumber,
          vehicleType: drivers.vehicleType,
          isAvailable: drivers.isAvailable,
        })
        .from(drivers)
        .where(eq(drivers.isAvailable, true));
    } catch (error) {
      console.error("Erreur récupération livreurs:", error);
      throw error instanceof ServiceError
        ? error
        : new ServiceError(
            ERROR_CODES.DATABASE_ERROR,
            "Erreur récupération livreurs",
            { originalError: error instanceof Error ? error.message : String(error) }
          );
    }
  },
};

export default logisticsService;