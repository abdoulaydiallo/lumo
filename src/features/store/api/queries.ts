import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
    stores, users, notifications, orders,
    products, drivers, supportTickets, promotions, reports, orderItems
} from "@/lib/db/schema";
import { StoreLayoutData } from "../types";
import { sql } from "drizzle-orm/sql";

export async function getStoreLayoutData(userId: number): Promise<StoreLayoutData> {
  // Récupérer l'utilisateur
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("Utilisateur non trouvé");

  // Récupérer les magasins de l'utilisateur et prendre le premier
  const userStores = await db.select().from(stores).where(eq(stores.userId, userId));
  if (!userStores.length) throw new Error("Aucun magasin trouvé pour cet utilisateur");
  const firstStore = userStores[0]; // Utiliser uniquement le premier magasin

  // Récupérer les notifications
  const userNotifications = await db.select().from(notifications).where(eq(notifications.userId, userId));

  // Compter les commandes en cours liées au premier magasin
  const inProgressOrders = await db
    .select({ count: sql<number>`count(distinct ${orders.id})` })
    .from(orders)
    .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(and(eq(products.storeId, firstStore.id), eq(orders.status, "in_progress")));

  // Compter les commandes livrées liées au premier magasin
  const completedOrders = await db
    .select({ count: sql<number>`count(distinct ${orders.id})` })
    .from(orders)
    .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(and(eq(products.storeId, firstStore.id), eq(orders.status, "delivered")));

  // Compter le total des produits dans le premier magasin
  const totalProducts = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.storeId, firstStore.id));

  // Compter les chauffeurs
  const totalDrivers = await db
    .select({ count: sql<number>`count(*)` })
    .from(drivers)
    .where(eq(drivers.userId, userId));

  // Compter les tickets de support
  const totalSupportTickets = await db
    .select({ count: sql<number>`count(*)` })
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId));

  // Compter les promotions pour le premier magasin
  const totalPromotions = await db
    .select({ count: sql<number>`count(*)` })
    .from(promotions)
    .where(eq(promotions.storeId, firstStore.id));

  // Compter les rapports
  const totalReports = await db
    .select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(eq(reports.generatedBy, userId));

  // Construire et retourner le résultat
  return {
    user,
    stores: userStores, // On retourne tous les magasins, mais on utilise seulement le premier pour les stats
    notifications: userNotifications,
    orders: {
      inProgress: inProgressOrders[0]?.count || 0,
      completed: completedOrders[0]?.count || 0,
      total: (inProgressOrders[0]?.count || 0) + (completedOrders[0]?.count || 0),
    },
    products: { total: totalProducts[0]?.count || 0 },
    drivers: { total: totalDrivers[0]?.count || 0 },
    supportTickets: { total: totalSupportTickets[0]?.count || 0 },
    promotions: { total: totalPromotions[0]?.count || 0 },
    reports: { total: totalReports[0]?.count || 0 },
  };
}