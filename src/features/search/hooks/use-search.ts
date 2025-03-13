import { useState, useEffect, useCallback } from "react";
import { SearchParams, SearchResult } from "@/lib/db/search.engine";
import { useDebounce } from "use-debounce";

export function useSearch(params: SearchParams | undefined, initialData: SearchResult) {
  const [data, setData] = useState<SearchResult>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedParams] = useDebounce(params, 300);

  const fetchData = useCallback(async (searchParams: SearchParams) => {
    setIsLoading(true);
    setError(null);
    try {
      // Valeurs par défaut si filters est undefined
      const filters = searchParams.filters || {
        searchTerm: "",
        inStock: true,
        minPrice: undefined,
        maxPrice: undefined,
        categoryIds: [],
        minRating: undefined,
        region: undefined,
      };

      // Construire les paramètres uniquement avec des valeurs significatives
      const queryParams = new URLSearchParams();

      if (filters.searchTerm) queryParams.set("searchTerm", filters.searchTerm);
      if (filters.inStock !== true) queryParams.set("inStock", String(filters.inStock)); // Seulement si différent de true (par défaut)
      if (filters.minPrice !== undefined) queryParams.set("minPrice", filters.minPrice.toString());
      if (filters.maxPrice !== undefined) queryParams.set("maxPrice", filters.maxPrice.toString());
      if (filters.categoryIds && filters.categoryIds.length > 0) queryParams.set("categoryIds", filters.categoryIds.join(","));
      if (filters.minRating !== undefined) queryParams.set("minRating", filters.minRating.toString());
      if (filters.region) queryParams.set("region", filters.region);
      
      const sortValue = searchParams.sort || "relevance";
      if (sortValue !== "relevance") queryParams.set("sort", sortValue); // Seulement si différent de relevance (par défaut)
      
      const limitValue = searchParams.pagination?.limit || 8;
      if (limitValue !== 8) queryParams.set("limit", limitValue.toString()); // Seulement si différent de 8 (par défaut)

      if (searchParams.pagination?.cursor) {
        queryParams.set("cursor", JSON.stringify(searchParams.pagination.cursor));
      }

      const queryString = queryParams.toString();
      const response = await fetch(`/api/search?${queryString}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur lors de la recherche : ${response.status} - ${errorText}`);
      }

      const newData: SearchResult = await response.json();

      setData((prevData) => {
        if (!searchParams.pagination?.cursor) {
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
        return updatedData;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      setError(errorMessage);
      setData({ products: [], total: 0, nextCursor: null });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!debouncedParams) {
      setData(initialData);
      setError(null);
      return;
    }

    fetchData(debouncedParams);
  }, [
    debouncedParams?.filters?.searchTerm,
    JSON.stringify(debouncedParams?.filters),
    debouncedParams?.sort,
    debouncedParams?.pagination?.cursor,
    debouncedParams?.pagination?.limit,
  ]);

  return { data, isLoading, error };
}