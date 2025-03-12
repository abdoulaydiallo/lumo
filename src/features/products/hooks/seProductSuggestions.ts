// @/features/products/hooks/useProductSuggestions.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce"; // Nécessite npm install use-debounce


export function useProductSuggestions(searchTerm: string) {
  const [debouncedTerm] = useDebounce(searchTerm, 300);

  const query = useQuery<string[]>({
    queryKey: ["productSuggestions", debouncedTerm],
    queryFn: async () => {
      const response = await fetch(`/api/products/suggestions?term=${encodeURIComponent(debouncedTerm)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des suggestions");
      }
      return response.json();
    },
    enabled: !!debouncedTerm && debouncedTerm.length >= 2,
    placeholderData: [],
  });

  console.log("Hook suggestions:", { data: query.data, term: debouncedTerm, isLoading: query.isLoading });
  return query;
}