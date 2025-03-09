"use server"
import { db } from "@/lib/db";
import { promotions } from "@/lib/db/schema";
import { SQL, eq, and, lte, gte, or, gt, lt } from "drizzle-orm";

export async function getPromotionsByStoreId(
  storeId: number,
  limit: number = 10,
  offset: number = 0,
  statusFilter?: "active" | "inactive" | "expired" | "all"
) {
  let whereClause: SQL = eq(promotions.storeId, storeId);

  if (statusFilter && statusFilter !== "all") {
    const now = new Date();
    if (statusFilter === "active") {
      whereClause = and(
        eq(promotions.storeId, storeId),
        eq(promotions.isExpired, false),
        lte(promotions.startDate, now), // startDate <= now
        gte(promotions.endDate, now)    // endDate >= now
      )!;
    } else if (statusFilter === "inactive") {
      whereClause = and(
        eq(promotions.storeId, storeId),
        eq(promotions.isExpired, false),
        or(
          gt(promotions.startDate, now), // startDate > now
          lt(promotions.endDate, now)     // endDate < now (mais pas marqué comme expiré)
        )
      )!;
    } else if (statusFilter === "expired") {
      whereClause = and(
        eq(promotions.storeId, storeId),
        eq(promotions.isExpired, true)
      )!;
    }
  }

  const results = await db
    .select({
      id: promotions.id,
      code: promotions.code,
      discountPercentage: promotions.discountPercentage,
      startDate: promotions.startDate,
      endDate: promotions.endDate,
      createdAt: promotions.createdAt,
      isExpired: promotions.isExpired,
    })
    .from(promotions)
    .where(whereClause)
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: promotions.id })
    .from(promotions)
    .where(eq(promotions.storeId, storeId));

  return { promotions: results, total: total.length };
}


export async function getPromotionById(promotionId: number, storeId: number) {
  const [promotion] = await db
    .select({
      id: promotions.id,
      code: promotions.code,
      discountPercentage: promotions.discountPercentage,
      startDate: promotions.startDate,
      endDate: promotions.endDate,
      isExpired: promotions.isExpired,
    })
    .from(promotions)
    .where(and(eq(promotions.id, promotionId), eq(promotions.storeId, storeId)))
    .limit(1);

  return promotion || null;
}