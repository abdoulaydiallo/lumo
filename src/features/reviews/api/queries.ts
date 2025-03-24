"use server";

import { db } from "@/lib/db";
import { reviews, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
export async function getReviewsByProductId(
  productId: number,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 10, offset = 0 } = options;

  const reviewList = await db
    .select({
      id: reviews.id,
      userId: reviews.userId,
      productId: reviews.productId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.productId, productId))
    .limit(limit)
    .offset(offset);

  console.log("Reviews récupérés :", reviewList); // Ajout pour déboguer

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviews)
    .where(eq(reviews.productId, productId));

  const [{ avgRating }] = await db
    .select({ avgRating: sql<number | null>`avg(${reviews.rating})` })
    .from(reviews)
    .where(eq(reviews.productId, productId));

  return {
    reviews: reviewList,
    total: count,
    averageRating: avgRating ?? 0,
  };
}