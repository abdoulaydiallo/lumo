import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  orderPayments,
  payments,
  products,
  stores,
  shipments,
  storeOrders,
  productStocks,
  addresses,
  notifications,
  orderStatusHistory,
  users,
  auditLogs,
  platformFees,
  productVariants,
  dynamicDeliveryFees,
  storeCommissions,
  promotions,
  productPromotions,
  storeDrivers,
} from "@/lib/db/schema";
import { and, eq, inArray, sql, gte, lte } from "drizzle-orm";
import { ServiceError, ERROR_CODES } from "./orders.errors";

// Enums validés (alignés avec le schéma)
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

// Interfaces mises à jour
export interface OrderInsert {
  userId: number;
  destinationAddressId: number;
  paymentAmount: number;
  paymentMethod: ValidPaymentMethod;
  status?: ValidOrderStatus;
  promoCode?: string;
}

export interface OrderItemInsert {
  productId: number;
  variantId?: number;
  quantity: number;
  price: number;
  storeId: number; // Ajouté pour associer à store_orders
}

export interface DeliveryEstimate {
  storeId: number;
  fee: number;
  deliveryType: string;
  estimatedDeliveryDays: number;
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

// Vérification de la propriété des adresses
async function checkAddressOwnership(userId: number, addressId: number): Promise<void> {
  const [address] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .limit(1);
  if (!address) {
    throw new ServiceError(
      ERROR_CODES.AUTHORIZATION_ERROR,
      `L'adresse ${addressId} n'appartient pas à l'utilisateur ${userId}`
    );
  }
}

// Calcul des frais de livraison dynamiques
async function calculateDynamicDeliveryFee(
  region: string,
  totalWeight: number,
  distance: number,
  deliveryType: string = "STANDARD"
): Promise<{ fee: number; estimatedDays: number }> {
  const [feeRule] = await db
    .select({
      baseFee: dynamicDeliveryFees.baseFee,
      weightSurchargeRate: dynamicDeliveryFees.weightSurchargeRate,
      distanceSurchargeRate: dynamicDeliveryFees.distanceSurchargeRate,
      minFee: dynamicDeliveryFees.minFee,
      maxFee: dynamicDeliveryFees.maxFee,
      vehicleType: dynamicDeliveryFees.vehicleType,
    })
    .from(dynamicDeliveryFees)
    .where(
      and(
        eq(dynamicDeliveryFees.region, region),
        gte(dynamicDeliveryFees.weightMax, totalWeight),
        lte(dynamicDeliveryFees.weightMin, totalWeight),
        gte(dynamicDeliveryFees.distanceMax, distance),
        lte(dynamicDeliveryFees.distanceMin, distance),
        eq(dynamicDeliveryFees.deliveryType, deliveryType),
        eq(dynamicDeliveryFees.isActive, true)
      )
    )
    .limit(1);

  if (!feeRule) {
    return { fee: 15000, estimatedDays: 3 }; // Valeur par défaut
  }

  const baseFee = feeRule.baseFee;
  const weightSurcharge = totalWeight > 1000 ? Math.ceil((totalWeight - 1000) / 1000) * Number(feeRule.weightSurchargeRate || 0) : 0;
  const distanceSurcharge = distance > 10 ? Math.ceil((distance - 10) / 10) * Number(feeRule.distanceSurchargeRate || 0) : 0;
  let totalFee = baseFee + weightSurcharge + distanceSurcharge;

  const vehicleAdjustments = { "MOTO": 0.9, "CAR": 1.0, "TRUCK": 1.2 };
  const vehicleFactor = feeRule.vehicleType ? vehicleAdjustments[feeRule.vehicleType] || 1.0 : 1.0;
  totalFee = Math.max(baseFee, totalFee * vehicleFactor); // Ne descend pas sous baseFee

  totalFee = Math.max(feeRule.minFee || 0, Math.min(feeRule.maxFee || Infinity, totalFee));
  const estimatedDays = deliveryType === "EXPRESS" ? (distance <= 20 ? 2 : 4) : (distance <= 30 ? 3 : 5);

  return { fee: Math.round(totalFee), estimatedDays };
}

// Validation et application d'une promotion
async function applyPromotion(promoCode: string, items: OrderItemInsert[]): Promise<number> {
  const [promotion] = await db
    .select({
      id: promotions.id,
      discountPercentage: promotions.discountPercentage,
      startDate: promotions.startDate,
      endDate: promotions.endDate,
      isExpired: promotions.isExpired,
    })
    .from(promotions)
    .where(eq(promotions.code, promoCode))
    .limit(1);

  if (!promotion || promotion.isExpired) {
    throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Code promo invalide ou expiré");
  }

  const now = new Date();
  if (
    (promotion.startDate && now < promotion.startDate) ||
    (promotion.endDate && now > promotion.endDate)
  ) {
    throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Code promo hors période de validité");
  }

  const eligibleProductIds = await db
    .select({ productId: productPromotions.productId })
    .from(productPromotions)
    .where(eq(productPromotions.promotionId, promotion.id));

  let totalDiscount = 0;
  for (const item of items) {
    const isEligible = eligibleProductIds.some((p) => p.productId === item.productId);
    if (isEligible) {
      const discount = (item.price * item.quantity * Number(promotion.discountPercentage)) / 100;
      totalDiscount += discount;
    }
  }

  return totalDiscount;
}

// Fonctions utilitaires
async function logAuditAction(tx: any, userId: number | null, action: string, details: Record<string, any>) {
  await tx.insert(auditLogs).values({
    userId,
    action,
    details: JSON.parse(JSON.stringify(details)),
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

// Services
export const orderService = {
  async getProductPromotions(productIds: number[]) {
    return db.transaction(async (tx) => {
      const activePromotions = await tx
        .select({
          productId: productPromotions.productId,
          discountPercentage: promotions.discountPercentage,
        })
        .from(productPromotions)
        .innerJoin(promotions, eq(productPromotions.promotionId, promotions.id))
        .where(
          and(
            inArray(productPromotions.productId, productIds),
            eq(promotions.isExpired, false),
            gte(promotions.endDate, new Date()),
            lte(promotions.startDate, new Date())
          )
        );
      return activePromotions;
    });
  },

  async createOrder(orderData: OrderInsert, items: OrderItemInsert[], callerUserId: number, deliveryEstimates: DeliveryEstimate[]) {
    console.log("Creating order with data:", orderData, items, callerUserId, deliveryEstimates);
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(callerUserId, "user");
        if (callerUserId !== orderData.userId) {
          throw new ServiceError(
            ERROR_CODES.AUTHORIZATION_ERROR,
            "L'utilisateur appelant doit être le même que celui de la commande"
          );
        }

        if (!items.length) {
          throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Aucun article fourni pour la commande");
        }
        if (orderData.paymentAmount <= 0) {
          throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Le montant du paiement doit être positif");
        }

        validateEnum(orderData.paymentMethod, validPaymentMethods, "paymentMethod");
        validateEnum(orderData.status || "pending", validOrderStatuses, "status");
        await checkAddressOwnership(orderData.userId, orderData.destinationAddressId);

        // Regrouper les articles par magasin
        const itemsByStore = new Map<number, OrderItemInsert[]>();
        for (const item of items) {
          const storeItems = itemsByStore.get(item.storeId) || [];
          storeItems.push(item);
          itemsByStore.set(item.storeId, storeItems);
        }

        // Calcul des totaux et validation des stocks
        let totalWeightByStore = new Map<number, number>();
        let totalItemPrice = 0;
        for (const [storeId, storeItems] of itemsByStore) {
          let storeWeight = 0;
          for (const item of storeItems) {
            if (item.quantity <= 0 || item.price < 0) {
              throw new ServiceError(
                ERROR_CODES.VALIDATION_ERROR,
                `Quantité ou prix invalide pour le produit ${item.productId}`
              );
            }

            let stockSource;
            if (item.variantId) {
              const [variant] = await tx
                .select({ stock: productVariants.stock, productId: productVariants.productId })
                .from(productVariants)
                .where(eq(productVariants.id, item.variantId))
                .limit(1);
              if (!variant || variant.productId !== item.productId) {
                throw new ServiceError(
                  ERROR_CODES.NOT_FOUND,
                  `Variante ${item.variantId} invalide pour le produit ${item.productId}`
                );
              }
              stockSource = { availableStock: variant.stock };
            } else {
              const [stock] = await tx
                .select({
                  availableStock: productStocks.availableStock,
                  stockLevel: productStocks.stockLevel,
                })
                .from(productStocks)
                .where(eq(productStocks.productId, item.productId))
                .limit(1);
              stockSource = stock;
            }

            if (!stockSource || stockSource.availableStock < item.quantity) {
              throw new ServiceError(
                ERROR_CODES.INSUFFICIENT_STOCK,
                `Stock insuffisant pour le produit ${item.productId}`,
                { availableStock: stockSource?.availableStock || 0, requested: item.quantity }
              );
            }

            const [product] = await tx
              .select({ weight: products.weight, storeId: products.storeId })
              .from(products)
              .where(eq(products.id, item.productId))
              .limit(1);
            storeWeight += (product?.weight || 0) * item.quantity;
            totalItemPrice += item.price * item.quantity;
          }
          totalWeightByStore.set(storeId, storeWeight);
        }

        // Application de la promotion
        let totalDiscount = orderData.promoCode ? await applyPromotion(orderData.promoCode, items) : 0;
        const adjustedPaymentAmount = Math.max(0, totalItemPrice - totalDiscount);

        // Création de l'ordre principal
        const [newOrder] = await tx
          .insert(orders)
          .values({
            userId: orderData.userId,
            destinationAddressId: orderData.destinationAddressId,
            status: orderData.status || "pending",
            estimatedDeliveryDate: new Date(Date.now() + Math.max(...deliveryEstimates.map(e => e.estimatedDeliveryDays)) * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Création des sous-commandes par magasin
        const storeOrderIds = new Map<number, number>();
        for (const [storeId, storeItems] of itemsByStore) {
          const deliveryEstimate = deliveryEstimates.find(e => e.storeId === storeId);
          if (!deliveryEstimate) {
            throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, `Estimation de livraison manquante pour le magasin ${storeId}`);
          }

          const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const storeOrderResult = await tx
            .insert(storeOrders)
            .values({
              orderId: newOrder.id,
              storeId,
              subtotal,
              deliveryFee: deliveryEstimate.fee,
              total: subtotal + deliveryEstimate.fee,
              status: "pending",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          const [storeOrder] = Array.isArray(storeOrderResult) ? storeOrderResult : [];
          storeOrderIds.set(storeId, storeOrder.id);

          // Création des expéditions
          const [storeAddress] = await tx
            .select({ addressId: stores.addressId })
            .from(stores)
            .where(eq(stores.id, storeId))
            .limit(1);
          await tx
            .insert(shipments)
            .values({
              storeOrderId: storeOrder.id,
              originAddressId: storeAddress.addressId!,
              status: "pending",
              isManagedByStore: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
        }

        // Mise à jour des stocks et insertion des orderItems
        for (const item of items) {
          if (item.variantId) {
            await tx
              .update(productVariants)
              .set({
                stock: sql`${productVariants.stock} - ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(productVariants.id, item.variantId));
          } else {
            await tx
              .update(productStocks)
              .set({
                reservedStock: sql`${productStocks.reservedStock} + ${item.quantity}`,
                availableStock: sql`${productStocks.availableStock} - ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(productStocks.productId, item.productId));
          }

          const storeOrderId = storeOrderIds.get(item.storeId)!;
          await tx.insert(orderItems).values({
            orderId: newOrder.id,
            storeOrderId,
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId,
            price: item.price,
          });
        }

        // Paiement global
        const totalDeliveryFee = deliveryEstimates.reduce((sum, e) => sum + e.fee, 0);
        const [newPayment] = await tx
          .insert(orderPayments)
          .values({
            orderId: newOrder.id,
            totalAmount: Math.round(adjustedPaymentAmount + totalDeliveryFee),
            paymentMethod: orderData.paymentMethod,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Paiements par sous-commande
        for (const [storeId, storeOrderId] of storeOrderIds) {
          const storeItems = itemsByStore.get(storeId)!;
          const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const deliveryEstimate = deliveryEstimates.find(e => e.storeId === storeId)!;
          await tx.insert(payments).values({
            orderId: newOrder.id,
            storeOrderId,
            amount: subtotal + deliveryEstimate.fee,
            paymentMethod: orderData.paymentMethod,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await tx.insert(platformFees).values({
            storeOrderId,
            storeFee: Math.round(subtotal * 0.05), // Exemple : 5% de frais plateforme
            deliveryFee: deliveryEstimate.fee,
            createdAt: new Date(),
          });

          const commissionAmount = subtotal * 0.1; // 10% de commission
          await tx.insert(storeCommissions).values({
            storeId,
            storeOrderId,
            commissionRate: 10,
            commissionAmount: Math.round(commissionAmount),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        await createNotification(tx, orderData.userId, `Commande #${newOrder.id} créée`, "order_created");
        await logOrderStatusChange(tx, newOrder.id, newOrder.status, callerUserId);
        await logAuditAction(tx, callerUserId, "create_order", {
          orderId: newOrder.id,
          paymentId: newPayment.id,
          promoCode: orderData.promoCode,
          storeOrders: Array.from(storeOrderIds.entries()),
        });

        return newOrder;
      } catch (error: any) {
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
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

        // Mise à jour des sous-commandes si nécessaire
        if (status === "delivered" || status === "cancelled") {
          await tx
            .update(storeOrders)
            .set({ status, updatedAt: new Date() })
            .where(eq(storeOrders.orderId, orderId));
        }

        await createNotification(
          tx,
          updatedOrder.userId!,
          `Commande #${orderId} mise à jour: ${status}`,
          "order_status"
        );
        await logOrderStatusChange(tx, orderId, status, callerUserId);
        await logAuditAction(tx, callerUserId, "update_order_status", { orderId, newStatus: status });

        return updatedOrder;
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

  async updatePaymentStatus(orderId: number, status: ValidPaymentStatus, transactionId: string, callerUserId?: number) {
    return db.transaction(async (tx) => {
      try {
        if (callerUserId) {
          await checkUserRole(callerUserId, "admin");
        }

        validateEnum(status, validPaymentStatuses, "status");

        const [updatedOrderPayment] = await tx
          .update(orderPayments)
          .set({
            status,
            transactionId: transactionId.trim(),
            updatedAt: new Date(),
          })
          .where(eq(orderPayments.orderId, orderId))
          .returning();

        if (!updatedOrderPayment) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Paiement global pour la commande ${orderId} non trouvé`);
        }

        // Mise à jour des paiements par sous-commande
        await tx
          .update(payments)
          .set({ status, transactionId: transactionId.trim(), updatedAt: new Date() })
          .where(eq(payments.orderId, orderId));

        const newOrderStatus = status === "paid" ? "in_progress" : status === "failed" ? "cancelled" : undefined;
        if (newOrderStatus) {
          const [updatedOrder] = await tx
            .update(orders)
            .set({ status: newOrderStatus, updatedAt: new Date() })
            .where(eq(orders.id, orderId))
            .returning();
          if (updatedOrder) {
            await tx
              .update(storeOrders)
              .set({ status: newOrderStatus, updatedAt: new Date() })
              .where(eq(storeOrders.orderId, orderId));
            await createNotification(
              tx,
              updatedOrder.userId!,
              `Statut de paiement: ${status}`,
              "payment_status"
            );
            await logOrderStatusChange(tx, orderId, newOrderStatus, callerUserId || updatedOrder.userId!);
          }
        }

        await logAuditAction(tx, callerUserId || null, "update_payment_status", {
          orderId,
          newStatus: status,
          transactionId,
        });

        return updatedOrderPayment;
      } catch (error) {
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
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
        if (order.userId !== callerUserId) {
          throw new ServiceError(
            ERROR_CODES.AUTHORIZATION_ERROR,
            "Seul le propriétaire peut annuler la commande"
          );
        }
        if (order.status === "cancelled") {
          throw new ServiceError(ERROR_CODES.ALREADY_EXISTS, "Commande déjà annulée");
        }

        const [payment] = await tx
          .select({ status: orderPayments.status, paymentMethod: orderPayments.paymentMethod })
          .from(orderPayments)
          .where(eq(orderPayments.orderId, orderId))
          .limit(1);
        if (payment && payment.status === "paid" && payment.paymentMethod !== "cash_on_delivery") {
          await tx
            .update(orderPayments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(orderPayments.orderId, orderId));
          await tx
            .update(payments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(payments.orderId, orderId));
        }

        const [updatedOrder] = await tx
          .update(orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(orders.id, orderId))
          .returning();

        await tx
          .update(storeOrders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(storeOrders.orderId, orderId));

        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        for (const item of items) {
          if (item.variantId) {
            await tx
              .update(productVariants)
              .set({
                stock: sql`${productVariants.stock} + ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(productVariants.id, item.variantId));
          } else {
            await tx
              .update(productStocks)
              .set({
                reservedStock: sql`${productStocks.reservedStock} - ${item.quantity}`,
                availableStock: sql`${productStocks.availableStock} + ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(productStocks.productId, item.productId!));
          }
        }

        await createNotification(tx, order.userId, `Commande #${orderId} annulée`, "order_cancelled");
        await logOrderStatusChange(tx, orderId, "cancelled", callerUserId);
        await logAuditAction(tx, callerUserId, "cancel_order", { orderId });

        return updatedOrder;
      } catch (error) {
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur lors de l'annulation de la commande",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },

  async sellerUpdateOrderStatus(orderId: number, status: ValidOrderStatus, sellerUserId: number) {
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

        const [{ count }] = await tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(and(eq(orderItems.orderId, orderId), eq(products.storeId, store.id)));

        if (count === 0) {
          throw new ServiceError(
            ERROR_CODES.VALIDATION_ERROR,
            "Le vendeur n'a pas de produits dans cette commande"
          );
        }

        const [updatedOrder] = await tx
          .update(orders)
          .set({ status, updatedAt: new Date() })
          .where(eq(orders.id, orderId))
          .returning();

        if (!updatedOrder) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Commande ${orderId} non trouvée`);
        }

        await createNotification(
          tx,
          updatedOrder.userId!,
          `Commande #${orderId} mise à jour par le vendeur: ${status}`,
          "order_status"
        );
        await logOrderStatusChange(tx, orderId, status, sellerUserId);

        return updatedOrder;
      } catch (error) {
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur lors de la mise à jour par le vendeur",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
    });
  },

  async sellerCreateShipment(orderId: number, sellerUserId: number, driverId?: number) {
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

        const [{ count }] = await tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(and(eq(orderItems.orderId, orderId), eq(products.storeId, store.id)));

        if (count === 0) {
          throw new ServiceError(
            ERROR_CODES.VALIDATION_ERROR,
            "Le vendeur n'a pas de produits dans cette commande"
          );
        }

        if (driverId) {
          const [driver] = await tx
            .select({ id: storeDrivers.driverId })
            .from(storeDrivers)
            .where(and(eq(storeDrivers.storeId, store.id), eq(storeDrivers.driverId, driverId)));
          if (!driver) {
            throw new ServiceError(
              ERROR_CODES.NOT_FOUND,
              "Chauffeur non associé au magasin"
            );
          }
        }

        const result = await tx
          .insert(shipments)
          .values({
            orderId,
            driverId,
            status: "pending",
            isManagedByStore: true,
            priorityLevel: "normal",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        const [newShipment] = Array.isArray(result) ? result : [];

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

        await createNotification(
          tx,
          order.userId!,
          `Expédition créée pour la commande #${orderId}`,
          "shipment_created"
        );

        return newShipment;
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

  async sellerUpdateShipmentStatus(shipmentId: number, status: ValidShipmentStatus, sellerUserId: number) {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(sellerUserId, "store");
        validateEnum(status, validShipmentStatuses, "status");

        const [shipment] = await tx
          .select({ orderId: shipments.orderId })
          .from(shipments)
          .where(and(eq(shipments.id, shipmentId), eq(shipments.isManagedByStore, true)))
          .limit(1);

        if (!shipment) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            "Expédition non trouvée ou non gérée par le vendeur"
          );
        }

        const orderId = shipment.orderId!;

        const [store] = await tx
          .select({ id: stores.id })
          .from(stores)
          .where(eq(stores.userId, sellerUserId))
          .limit(1);
        if (!store) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
        }

        const [{ count }] = await tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(and(eq(orderItems.orderId, orderId), eq(products.storeId, store.id)));

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
            lastKnownStatus: status === "delivered" || status === "failed" ? status : undefined,
          })
          .where(eq(shipments.id, shipmentId))
          .returning();

        if (status === "delivered" || status === "failed") {
          const [{ count: pendingCount }] = await tx
            .select({ count: sql<number>`COUNT(*)` })
            .from(shipments)
            .where(
              and(eq(shipments.orderId, orderId), inArray(shipments.status, ["pending", "in_progress"]))
            );

          if (pendingCount === 0) {
            const newOrderStatus = status === "delivered" ? "delivered" : "cancelled";
            const [order] = await tx
              .update(orders)
              .set({ status: newOrderStatus, updatedAt: new Date() })
              .where(eq(orders.id, orderId))
              .returning();
            await logOrderStatusChange(tx, orderId, newOrderStatus, sellerUserId);
            await createNotification(
              tx,
              order.userId!,
              `Commande #${orderId} ${newOrderStatus}`,
              "order_status"
            );
          }
        }

        const [order] = await tx.select({ userId: orders.userId }).from(orders).where(eq(orders.id, orderId));
        await createNotification(
          tx,
          order.userId!,
          `Expédition #${shipmentId} mise à jour: ${status}`,
          "shipment_status"
        );
        await logAuditAction(tx, sellerUserId, "update_shipment_status", { shipmentId, newStatus: status });

        return updatedShipment;
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

  async sellerAssignDriverToShipment(shipmentId: number, driverId: number, sellerUserId: number) {
    return db.transaction(async (tx) => {
      try {
        await checkUserRole(sellerUserId, "store");

        const [shipment] = await tx
          .select({ orderId: shipments.orderId })
          .from(shipments)
          .where(and(eq(shipments.id, shipmentId), eq(shipments.isManagedByStore, true)))
          .limit(1);

        if (!shipment) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            "Expédition non trouvée ou non gérée par le vendeur"
          );
        }

        const orderId = shipment.orderId!;

        const [store] = await tx
          .select({ id: stores.id })
          .from(stores)
          .where(eq(stores.userId, sellerUserId))
          .limit(1);
        if (!store) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
        }

        const [{ count }] = await tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(and(eq(orderItems.orderId, orderId), eq(products.storeId, store.id)));

        if (count === 0) {
          throw new ServiceError(
            ERROR_CODES.VALIDATION_ERROR,
            "Le vendeur n'a pas de produits dans cette commande"
          );
        }

        const [driver] = await tx
          .select({ id: storeDrivers.driverId })
          .from(storeDrivers)
          .where(and(eq(storeDrivers.storeId, store.id), eq(storeDrivers.driverId, driverId)));
        if (!driver) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            "Le chauffeur n'est pas associé à ce vendeur"
          );
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

        const [order] = await tx.select({ userId: orders.userId }).from(orders).where(eq(orders.id, orderId));
        await createNotification(
          tx,
          order.userId!,
          `Chauffeur assigné à l'expédition #${shipmentId}`,
          "shipment_status"
        );

        return updatedShipment;
      } catch (error) {
        throw error instanceof ServiceError
          ? error
          : new ServiceError(
              ERROR_CODES.DATABASE_ERROR,
              "Erreur lors de l'assignation du chauffeur",
              { originalError: error instanceof Error ? error.message : String(error) }
            );
      }
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
      throw new ServiceError(ERROR_CODES.NOT_FOUND, "Magasin du vendeur non trouvé");
    }

    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        variantId: orderItems.variantId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        product: {
          id: products.id,
          name: products.name || "Produit sans nom",
        },
        variant: {
          id: productVariants.id,
          variantType: productVariants.variantType,
          variantValue: productVariants.variantValue,
        },
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .where(and(eq(orderItems.orderId, orderId), eq(products.storeId, store.id)))
      .limit(100);

    return items;
  },
};

export default orderService;