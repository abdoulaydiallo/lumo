"use server";

import { db } from "@/lib/db";
import { promotions } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";

export async function createPromotion(storeId: number, formData: FormData) {
  const code = formData.get("code") as string;
  const discountPercentage = formData.get("discountPercentage") as string;
  const startDate = formData.get("startDate") ? new Date(formData.get("startDate") as string) : null;
  const endDate = formData.get("endDate") ? new Date(formData.get("endDate") as string) : null;

  await db.insert(promotions).values({
    code,
    discountPercentage,
    startDate,
    endDate,
    storeId,
  });
}

export async function updatePromotion(promotionId: number, storeId: number, formData: FormData) {
  const code = formData.get("code") as string;
  const discountPercentage = formData.get("discountPercentage") as string;
  const startDate = formData.get("startDate") ? new Date(formData.get("startDate") as string) : null;
  const endDate = formData.get("endDate") ? new Date(formData.get("endDate") as string) : null;

  await db
    .update(promotions)
    .set({
      code,
      discountPercentage,
      startDate,
      endDate,
      isExpired: endDate ? endDate < new Date() : false,
    })
    .where(and(eq(promotions.id, promotionId), eq(promotions.storeId, storeId)));
}

export async function deletePromotion(promotionId: number, storeId: number) {
  await db
    .delete(promotions)
    .where(and(eq(promotions.id, promotionId), eq(promotions.storeId, storeId)));
}

export async function markExpiredPromotions(storeId: number) {
  await db
    .update(promotions)
    .set({ isExpired: true })
    .where(and(
      eq(promotions.storeId, storeId),
      lt(promotions.endDate, new Date()),
      eq(promotions.isExpired, false)
    ));
}