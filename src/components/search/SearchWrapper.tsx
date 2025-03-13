// components/search/SearchWrapper.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  SearchFilters,
  SearchResult,
  SortOption,
  SearchParams,
} from "@/lib/db/search.engine";
import { useSearchContext } from "@/contexts/SearchContext";
import SearchResults from "./SearchResults";
import SearchControls from "./SearchControls";
import { buildQueryString } from "@/lib/utils/search-utils";

interface SearchWrapperProps {
  initialData: SearchResult;
  initialParams: SearchParams;
}

export default function SearchWrapper({
  initialData,
  initialParams,
}: SearchWrapperProps) {
  const router = useRouter();
  const { searchTerm, setSearchTerm } = useSearchContext();

  const [filters, setFilters] = useState<SearchFilters>(
    initialParams.filters || {
      searchTerm: "",
      inStock: true,
      minPrice: undefined,
      maxPrice: undefined,
      categoryIds: [],
      minRating: undefined,
      region: undefined,
    }
  );
  const [sort, setSort] = useState<SortOption>(
    initialParams.sort || "relevance"
  );
  const [cursor, setCursor] = useState<{
    id: string;
    sortValue: string;
  } | null>(null);

  useEffect(() => {
    if (searchTerm !== filters.searchTerm) {
      const newFilters = { ...filters, searchTerm };
      setFilters(newFilters);
      const queryString = buildQueryString(newFilters, sort);
      router.push(`/marketplace/products?${queryString}`, { scroll: false });
    }
  }, [searchTerm, filters, sort, router]);

  const handleReset = () => {
    const resetFilters = {
      searchTerm: "",
      inStock: true,
      minPrice: undefined,
      maxPrice: undefined,
      categoryIds: [],
      minRating: undefined,
      region: undefined,
    };
    setFilters(resetFilters);
    setSort("relevance");
    setCursor(null);
    setSearchTerm("");
    router.push("/marketplace/products", { scroll: false });
  };

  const updateURL = (newFilters: SearchFilters, newSort: SortOption) => {
    const queryString = buildQueryString(newFilters, newSort);
    router.push(`/marketplace/products?${queryString}`, { scroll: false });
  };

  return (
    <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <SearchControls
          filters={filters}
          sort={sort}
          onFiltersChange={setFilters}
          onSortChange={setSort}
          onReset={handleReset}
          onApplyFilters={(newFilters) => {
            setFilters(newFilters);
            setCursor(null);
            updateURL(newFilters, sort);
          }}
        />
        <SearchResults
          filters={filters}
          sort={sort}
          cursor={cursor}
          initialData={initialData}
          onCursorChange={setCursor}
        />
      </div>
    </div>
  );
}
