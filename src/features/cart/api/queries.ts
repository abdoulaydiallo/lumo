"use server";

import { db } from "@/lib/db";
import { cartItems, products, productImages, productVariants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Définir le type des résultats retournés
interface CartItem {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  variantId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  productName: string | null;
  productPrice: number | null;
  productImage: string | null;
  variantType: string | null;
  variantValue: string | null;
  variantPrice: number | null;
  storeId: number | null;
}

export async function getUserCart(userId: number, limit: number = 10, offset: number = 0) {
  const results = await db
    .select({
      id: cartItems.id,
      userId: cartItems.userId,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      variantId: cartItems.variantId,
      createdAt: cartItems.createdAt,
      updatedAt: cartItems.updatedAt,
      productName: products.name,
      productPrice: products.price,
      productImage: productImages.imageUrl,
      variantType: productVariants.variantType,
      variantValue: productVariants.variantValue,
      variantPrice: productVariants.price,
      storeId: products.storeId,
    })
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(productImages.createdAt)
    .limit(limit)
    .offset(offset);

  // Calcul du total
  const total = await db
    .select({ count: cartItems.id })
    .from(cartItems)
    .where(eq(cartItems.userId, userId));

  // Dédupliquer pour une seule image par produit
  const uniqueItems: CartItem[] = [];  // Type explicite pour uniqueItems
  const seenProductIds = new Set<number>();
  for (const item of results) {
    if (!seenProductIds.has(item.productId)) {
      uniqueItems.push(item);
      seenProductIds.add(item.productId);
    }
  }

  return { items: uniqueItems, total: total[0]?.count || 0 };  // Accéder à la propriété `count`
}
