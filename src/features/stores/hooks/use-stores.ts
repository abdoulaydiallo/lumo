// @/features/stores/hooks/use-stores.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// Ne pas importer directement les queries ici
export async function fetchStoresClient() {
  const response = await fetch("/api/stores", { next: { revalidate: 600 } });
  if (!response.ok) throw new Error("Failed to fetch stores");
  return response.json();
}

export function useStores(initialData: any[]) {
  return useQuery({
    queryKey: ["stores"],
    queryFn: fetchStoresClient,
    initialData,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    onError: () => {
      toast("Erreur lors du chargement des boutiques");
    },
  } as any);
}