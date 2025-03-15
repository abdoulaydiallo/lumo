// @/features/search/hooks/use-search.ts
import { useState, useEffect } from "react";
import { SearchParams, SearchResult } from "@/lib/db/search.engine";

export function useSearch(params: SearchParams | undefined, initialData: SearchResult) {
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
          // Si aucun curseur (première page), remplacer les données
          if (!params.pagination?.cursor) {
            console.log("Première page, remplacement des données :", newData);
            return newData;
          }

          // Pagination : accumuler les produits et éliminer les doublons
          const allProducts = [...prevData.products, ...newData.products];
          const uniqueProducts = Array.from(
            new Map(allProducts.map((p) => [p.id, p])).values()
          );
          const updatedData: SearchResult = {
            ...newData,
            products: uniqueProducts,
            total: newData.total, // Utiliser le total renvoyé par le moteur
          };
          console.log("Données mises à jour avec pagination :", updatedData);
          return updatedData;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        console.error("Erreur dans useSearch :", errorMessage);
        setError(errorMessage);
        setData({ products: [], total: 0, nextCursor: null }); // Réinitialiser les données en cas d'erreur
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    // Dépendances basées sur les changements des paramètres pertinents
    JSON.stringify(params?.filters), // Sérialiser les filtres pour détecter les changements
    params?.sort,
    params?.pagination?.cursor,
    params?.pagination?.limit,
  ]);

  return { data, isLoading, error };
}