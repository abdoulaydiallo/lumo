// @/features/search/hooks/use-search.ts
import { useState, useEffect } from "react";
import { SearchParams, SearchResult } from "@/lib/db/search.engine";

export function useSearch(
  params: SearchParams | undefined,
  initialData: SearchResult,
  refreshKey?: number
) {
  const [data, setData] = useState<SearchResult>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params) {
      console.log("Aucun paramètre fourni, données initiales conservées :", initialData);
      setData(initialData);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log("Paramètres envoyés à useSearch :", params);
        const response = await fetch("/api/search", {
          method: "POST",
          body: JSON.stringify(params),
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erreur lors de la recherche : ${response.status} - ${errorText}`);
        }

        const newData: SearchResult = await response.json();
        console.log("Nouvelles données reçues :", newData);

        setData((prevData) => {
          if (!params.pagination?.cursor) {
            console.log("Première page, remplacement des données :", newData);
            return newData;
          }

          const allProducts = [...prevData.products, ...newData.products];
          const uniqueProducts = Array.from(
            new Map(allProducts.map((p) => [p.id, p])).values()
          );
          const updatedData: SearchResult = {
            ...newData,
            products: uniqueProducts,
            total: newData.total,
          };
          console.log("Données mises à jour avec pagination :", updatedData);
          return updatedData;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        console.error("Erreur dans useSearch :", errorMessage);
        setError(errorMessage);
        setData({ products: [], total: 0, nextCursor: null });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    JSON.stringify(params?.filters),
    params?.sort,
    JSON.stringify(params?.pagination?.cursor), // Sérialiser le curseur
    params?.pagination?.limit,
    refreshKey,
  ]);

  return { data, isLoading, error };
}