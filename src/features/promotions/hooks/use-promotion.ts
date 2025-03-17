// @/features/promotions/hooks/usePromotion.ts
"use client";

import { Promotion } from "@/features/products/api/types";
import { useQuery } from "@tanstack/react-query";

export function usePromotion(promotionId: number, storeId: number, initialData?: Promotion) {
  return useQuery({
    queryKey: ["promotion", promotionId, storeId],
    queryFn: async () => {
      const response = await fetch(`/api/stores/${storeId}/promotions/${promotionId}`);
      if (!response.ok) throw new Error("Erreur lors de la récupération de la promotion");
      return response.json();
    },
    initialData,
    placeholderData: (previousData) => previousData, // Garde les données précédentes pendant le chargement
  });
}