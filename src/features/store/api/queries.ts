// @/features/store/api/queries.ts
import { db } from "@/lib/db";
import { eq, and} from "drizzle-orm";
import {
    stores, users, notifications, orders,
    products, drivers, supportTickets, promotions, reports
} from "@/lib/db/schema";
import { StoreLayoutData } from "../types";
import { isNotNull, sql } from "drizzle-orm/sql";

export async function getStoreLayoutData(userId: number): Promise<StoreLayoutData> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("Utilisateur non trouvé");

  const userStores = await db.select().from(stores).where(eq(stores.userId, userId));
  const userNotifications = await db.select().from(notifications).where(eq(notifications.userId, userId));

  const inProgressOrders = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "in_progress")));

  const completedOrders = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "delivered")));

  const totalProducts = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(isNotNull(products.storeId));

  const totalDrivers = await db
    .select({ count: sql<number>`count(*)` })
    .from(drivers)
    .where(eq(drivers.userId, userId));

  const totalSupportTickets = await db
    .select({ count: sql<number>`count(*)` })
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId));

  const totalPromotions = await db
    .select({ count: sql<number>`count(*)` })
    .from(promotions)
    .where(eq(promotions.storeId, userStores[0]?.id || 0));

  const totalReports = await db
    .select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(eq(reports.generatedBy, userId));

  return {
    user,
    stores: userStores,
    notifications: userNotifications, // Doit être défini ici
    orders: { inProgress: inProgressOrders[0]?.count || 0, completed: completedOrders[0]?.count || 0 },
    products: { total: totalProducts[0]?.count || 0 },
    drivers: { total: totalDrivers[0]?.count || 0 },
    supportTickets: { total: totalSupportTickets[0]?.count || 0 },
    promotions: { total: totalPromotions[0]?.count || 0 },
    reports: { total: totalReports[0]?.count || 0 },
  };
}