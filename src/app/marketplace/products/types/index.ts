// @/app/products/types/index.ts
import { SearchParams, Product, SortOption, SearchFilters, Pagination } from "@/lib/db/search.engine";

export type { SearchParams, SortOption, Product };

// Redéfinition de SearchResult pour correspondre au nouveau nextCursor
export interface SearchResult {
  products: Product[];
  total: number;
  nextCursor: { id: string; sortValue: string } | null;
  metadata?: {
    filtersApplied: SearchFilters;
    sortApplied: SortOption;
    paginationApplied: Pagination;
  };
}

export interface ProductListProps {
  initialData: SearchResult;
}

export interface ProductCardProps {
  product: Product;
}

export interface SearchBarProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  onSort: (sort: SortOption) => void;
}