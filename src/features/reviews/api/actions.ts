"use server";

import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function addReview(userId: number, productId: number, rating: number, comment?: string) {
  const insertReview = async () => {
    const [newReview] = await db
      .insert(reviews)
      .values({
        userId,
        productId,
        rating,
        comment,
      })
      .returning();
    return newReview;
  };

  try {
    const newReview = await insertReview();
    return { success: true, review: newReview, message: "Avis ajouté avec succès" };
  } catch (error : any) {
    if (error.code === "23505" && error.constraint === "reviews_user_product_unique") {
      throw new Error("Vous avez déjà laissé un avis pour ce produit.");
    }
    if (error.code === "23505" && error.constraint === "reviews_pkey") {
      console.warn("Conflit sur reviews_pkey, synchronisation de la séquence...");
      await db.execute(sql`
        SELECT setval('reviews_id_seq', COALESCE((SELECT MAX(id) FROM reviews), 1), false);
      `);
      try {
        const newReview = await insertReview();
        return { success: true, review: newReview, message: "Avis ajouté après synchronisation" };
      } catch (retryError) {
        console.error("Échec après synchronisation:", retryError);
        throw new Error("Erreur persistante lors de l'ajout de l'avis");
      }
    }
    console.error("Erreur lors de l'ajout de l'avis:", error);
    throw new Error("Erreur serveur lors de l'ajout de l'avis");
  }
}