// @/features/products/hooks/useProducts.ts
"use client";

import { useQuery } from "@tanstack/react-query";

interface FilterOptions {
  storeId?: number;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  promotionId?: number;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "newest" | "popularity";
  inStock?: boolean; // Nouveau filtre
}

interface PaginationOptions {
  limit: number;
  page: number;
}

export function useProducts(
  filters: FilterOptions = {},
  pagination: PaginationOptions = { limit: 10, page: 1 },
  initialData?: { products: any[]; total: number }
) {
  const { limit, page } = pagination;
  const offset = (page - 1) * limit;

  const queryString = new URLSearchParams({
    ...filters,
    categoryIds: filters.categoryIds?.join(",") || "",
    sortBy: filters.sortBy || "relevance",
    inStock: filters.inStock ? "true" : "",
    limit: String(limit),
    offset: String(offset),
  }as any).toString();

  return useQuery({
    queryKey: ["products", filters, page],
    queryFn: async () => {
      const response = await fetch(`/api/products?${queryString}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la récupération des produits");
      }
      return response.json();
    },
    initialData,
    placeholderData: (previousData) => previousData,
  });
}