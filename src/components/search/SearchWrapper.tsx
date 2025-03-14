"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const isMounted = useRef(false);

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

  // Gestion du cycle de vie du composant
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Met à jour les filtres uniquement si le composant est monté
  useEffect(() => {
    if (!isMounted.current) return;

    if (searchTerm !== filters.searchTerm) {
      setFilters((prev) => ({ ...prev, searchTerm }));
      const queryString = buildQueryString({ ...filters, searchTerm }, sort);
      router.push(`/marketplace/products?${queryString}`, { scroll: false });
    }
  }, [searchTerm, sort, filters, router]);

  // Gestion des changements d'état avec useCallback pour éviter les re-render inutiles
  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    if (isMounted.current) {
      setFilters(newFilters);
    }
  }, []);

  const handleSortChange = useCallback((newSort: SortOption) => {
    if (isMounted.current) {
      setSort(newSort);
    }
  }, []);

  const handleCursorChange = useCallback(
    (newCursor: { id: string; sortValue: string } | null) => {
      if (isMounted.current) {
        setCursor(newCursor);
      }
    },
    []
  );

  const handleApplyFilters = useCallback(
    (newFilters: SearchFilters) => {
      if (isMounted.current) {
        setFilters(newFilters);
        setCursor(null);
        const queryString = buildQueryString(newFilters, sort);
        router.push(`/marketplace/products?${queryString}`, { scroll: false });
      }
    },
    [sort, router]
  );

  const handleReset = useCallback(() => {
    if (isMounted.current) {
      setFilters({
        searchTerm: "",
        inStock: true,
        minPrice: undefined,
        maxPrice: undefined,
        categoryIds: [],
        minRating: undefined,
        region: undefined,
      });
      setSort("relevance");
      setCursor(null);
      setSearchTerm("");
      router.push("/marketplace/products", { scroll: false });
    }
  }, [router, setSearchTerm]);

  return (
    <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <SearchControls
          filters={filters}
          sort={sort}
          onFiltersChange={handleFiltersChange}
          onSortChange={handleSortChange}
          onReset={handleReset}
          onApplyFilters={handleApplyFilters}
        />
        <SearchResults
          filters={filters}
          sort={sort}
          cursor={cursor}
          initialData={initialData}
          onCursorChange={handleCursorChange}
        />
      </div>
    </div>
  );
}
