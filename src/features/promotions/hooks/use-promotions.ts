// @/features/promotions/hooks/usePromotions.ts
"use client";

import { useQuery } from "@tanstack/react-query";

export function usePromotions(
  storeId: number,
  page: number = 1,
  filter: "active" | "inactive" | "expired" | "all" = "all",
  limit: number = 10,
  initialData?: { promotions: any[]; total: number }
) {
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: ["promotions", storeId, page, filter],
    queryFn: async () => {
      const response = await fetch(
        `/api/stores/${storeId}/promotions?page=${page}&filter=${filter}&limit=${limit}`,
        { credentials: "include" } // Ajout des credentials
      );
      if (!response.ok) throw new Error("Erreur lors de la récupération des promotions");
      return response.json();
    },
    initialData,
    placeholderData: (previousData) => previousData,
  });
}