"use server";

import { db } from "@/lib/db";
import { wishlists } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function addToWishlist(userId: number, productId: number) {
  const existing = await db
    .select()
    .from(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
    .limit(1);

  if (existing.length > 0) {
    return { success: true, message: "Produit déjà dans la wishlist" };
  }

  await db.insert(wishlists).values({
    userId,
    productId,
  });

  return { success: true, message: "Produit ajouté à la wishlist" };
}

export async function removeFromWishlist(userId: number, productId: number) {
  await db
    .delete(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));

  return { success: true, message: "Produit retiré de la wishlist" };
}

export async function clearWishlist(userId: number) {
  await db.delete(wishlists).where(eq(wishlists.userId, userId));
  return { success: true, message: "Wishlist vidée" };
}