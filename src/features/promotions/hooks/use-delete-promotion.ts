// @/features/promotions/hooks/useDeletePromotion.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeletePromotion(storeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promotionId: number) => {
      const response = await fetch(`/api/stores/${storeId}/promotions/${promotionId}`, {
        method: "DELETE",
        credentials: "include", // Ajout des credentials pour l'authentification
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la suppression");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions", storeId] });
    },
    onError: (error) => {
      console.error("Erreur dans useDeletePromotion:", error.message);
    },
  });
}