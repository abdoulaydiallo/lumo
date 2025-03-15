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
  const rafId = useRef<number | null>(null); // Pour annuler requestAnimationFrame

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
    if (!isMounted.current) {
      isMounted.current = true;
      // Synchroniser searchTerm avec initialParams au premier montage
      if (
        initialParams.filters?.searchTerm &&
        searchTerm !== initialParams.filters.searchTerm
      ) {
        setSearchTerm(initialParams.filters.searchTerm);
      }
      return;
    }

    if (searchTerm !== filters.searchTerm) {
      const newFilters = { ...filters, searchTerm };
      setFilters(newFilters);
      const queryString = buildQueryString(newFilters, sort);
      if (rafId.current) cancelAnimationFrame(rafId.current); // Annuler toute mise à jour précédente
      rafId.current = requestAnimationFrame(() => {
        if (isMounted.current) {
          router.push(`/marketplace/products?${queryString}`, {
            scroll: false,
          });
        }
        rafId.current = null;
      });
    }

    return () => {
      isMounted.current = false;
      if (rafId.current) cancelAnimationFrame(rafId.current); // Nettoyer au démontage
    };
  }, [searchTerm, filters, sort, router, initialParams, setSearchTerm]);

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
        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
          if (isMounted.current) {
            router.push(`/marketplace/products?${queryString}`, {
              scroll: false,
            });
          }
          rafId.current = null;
        });
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
