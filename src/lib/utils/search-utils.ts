// utils/search-utils.ts
import { SearchFilters, SortOption } from "@/lib/db/search.engine";

export const buildQueryString = (filters: SearchFilters, sort: SortOption): string => {
  const params = new URLSearchParams();
  if (filters.searchTerm) params.set("q", filters.searchTerm);
  if (filters.inStock === false) params.set("inStock", "false");
  if (filters.minPrice) params.set("minPrice", filters.minPrice.toString());
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice.toString());
  if (filters.categoryIds?.length) params.set("category", filters.categoryIds.join(","));
  if (filters.minRating) params.set("minRating", filters.minRating.toString());
  if (filters.region) params.set("region", filters.region);
  if (sort !== "relevance") params.set("sort", sort);
  return params.toString();
};