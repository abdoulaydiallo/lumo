"use client";

import { useState, useEffect, useCallback } from "react";
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

// Fonction utilitaire pour débouncer
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

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

  // Fonction pour mettre à jour l'URL avec debounce
  const updateURL = useCallback(
    debounce((newFilters: SearchFilters, newSort: SortOption) => {
      const queryString = buildQueryString(newFilters, newSort);
      router.push(`/marketplace/products?${queryString}`, { scroll: false });
    }, 300), // Délai de 300ms
    [router]
  );

  useEffect(() => {
    let mounted = true;

    if (searchTerm !== filters.searchTerm) {
      const newFilters = { ...filters, searchTerm };
      setFilters(newFilters);
      updateURL(newFilters, sort);
    }

    // Nettoyage pour éviter les mises à jour sur un composant démonté
    return () => {
      mounted = false;
    };
  }, [searchTerm, filters, sort, updateURL]);

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

  const handleApplyFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCursor(null);
    updateURL(newFilters, sort);
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
          onApplyFilters={handleApplyFilters}
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
