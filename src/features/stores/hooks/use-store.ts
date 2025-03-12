// @/features/stores/hooks/useStore.ts
"use client";

import { useQuery } from "@tanstack/react-query";

export function useStore(userId: number) {
  return useQuery({
    queryKey: ["store", userId],
    queryFn: async () => {
      const response = await fetch(`/api/stores/user/${userId}`, {
        credentials: "include", // Inclut les cookies pour l'authentification
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la récupération du magasin");
      }
      return response.json();
    },
    enabled: !!userId, // Ne lance la requête que si userId est défini
  });
}