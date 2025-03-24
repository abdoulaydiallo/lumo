import { reviews } from "@/lib/db/schema"; // Assurez-vous que le schéma est exporté quelque part
import { InferSelectModel } from "drizzle-orm";

// Type de base pour une review (basé sur le schéma)
export type Review = InferSelectModel<typeof reviews>;

// Type pour créer une nouvelle review (payload envoyé au serveur)
export type CreateReviewInput = {
  productId: number;
  rating: number;
  comment?: string; // Optionnel car nullable dans le schéma
};

// Type pour mettre à jour une review existante
export type UpdateReviewInput = {
  id: number;
  rating?: number;
  comment?: string;
};

// Type pour la réponse d'une liste de reviews avec métadonnées
export type ReviewListResponse = {
  reviews: Review[];
  total: number;
  averageRating: number;
};