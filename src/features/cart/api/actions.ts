"use server";

import { db } from "@/lib/db";
import { cartItems, productStocks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function addToCart(
  userId: number,
  productId: number,
  quantity: number,
  variantId?: number
) {
  // Vérifier le stock disponible
  const [stock] = await db
    .select({ availableStock: productStocks.availableStock })
    .from(productStocks)
    .where(eq(productStocks.productId, productId))
    .limit(1);

  if (!stock || stock.availableStock < quantity) {
    return { success: false, message: "Stock insuffisant" };
  }

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .update(cartItems)
      .set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, existing.id));
    return { success: true, message: "Quantité mise à jour dans le panier" };
  }

  await db.insert(cartItems).values({
    userId,
    productId,
    quantity,
    variantId,
  });

  return { success: true, message: "Produit ajouté au panier" };
}

export async function removeFromCart(userId: number, productId: number) {
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));

  return { success: true, message: "Produit retiré du panier" };
}

export async function clearCart(userId: number) {
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
  return { success: true, message: "Panier vidé" };
}