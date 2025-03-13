"use server";

import { db } from "@/lib/db";
import { wishlists, products, productImages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getUserWishlist(
  userId: number,
  limit: number = 10,
  offset: number = 0
) {
  const results = await db
    .select({
      id: wishlists.id,
      userId: wishlists.userId,
      productId: wishlists.productId,
      createdAt: wishlists.createdAt,
      updatedAt: wishlists.updatedAt,
      productName: products.name,
      productPrice: products.price,
      productImage: productImages.imageUrl,
      storeId: products.storeId,
    })
    .from(wishlists)
    .leftJoin(products, eq(wishlists.productId, products.id))
    .leftJoin(
      productImages,
      and(
        eq(productImages.productId, products.id),
        eq(productImages.id, 
          db
            .select({ id: productImages.id })
            .from(productImages)
            .where(eq(productImages.productId, products.id))
            .limit(1)
        )
      )
    )
    .where(eq(wishlists.userId, userId))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: wishlists.id })
    .from(wishlists)
    .where(eq(wishlists.userId, userId));

  return { items: results, total: total.length };
}

export async function checkWishlistItem(userId: number, productId: number) {
  const [item] = await db
    .select()
    .from(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
    .limit(1);

  return item || null;
}