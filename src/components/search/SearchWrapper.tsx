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
  const isMounted = useRef(false); // Suivi du montage
  const rafId = useRef<number | null>(null); // Pour nettoyer requestAnimationFrame

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

  // Gestion du montage et démontage
  useEffect(() => {
    isMounted.current = true;
    if (
      initialParams.filters?.searchTerm &&
      searchTerm !== initialParams.filters.searchTerm
    ) {
      setSearchTerm(initialParams.filters.searchTerm);
    }
    return () => {
      isMounted.current = false;
      if (rafId.current) cancelAnimationFrame(rafId.current); // Nettoyage des animations en attente
    };
  }, [initialParams, setSearchTerm]);

  // Synchronisation de searchTerm avec les filtres et mise à jour de l'URL
  useEffect(() => {
    if (!isMounted.current) return;

    if (searchTerm !== filters.searchTerm) {
      const newFilters = { ...filters, searchTerm };
      if (isMounted.current) {
        setFilters(newFilters);
        const queryString = buildQueryString(newFilters, sort);
        rafId.current = requestAnimationFrame(() => {
          if (isMounted.current) {
            router.push(`/marketplace/products?${queryString}`, {
              scroll: false,
            });
          }
          rafId.current = null;
        });
      }
    }
  }, [searchTerm, filters, sort, router]);

  // Callback sécurisé pour changer les filtres
  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    if (isMounted.current) {
      setFilters(newFilters);
    }
  }, []);

  // Callback sécurisé pour changer le tri
  const handleSortChange = useCallback((newSort: SortOption) => {
    if (isMounted.current) {
      setSort(newSort);
    }
  }, []);

  // Callback sécurisé pour changer le curseur
  const handleCursorChange = useCallback(
    (newCursor: { id: string; sortValue: string } | null) => {
      if (isMounted.current) {
        setCursor(newCursor);
      }
    },
    []
  );

  // Appliquer les filtres et mettre à jour l'URL
  const handleApplyFilters = useCallback(
    (newFilters: SearchFilters) => {
      if (!isMounted.current) return;

      setFilters(newFilters);
      setCursor(null);
      const queryString = buildQueryString(newFilters, sort);
      rafId.current = requestAnimationFrame(() => {
        if (isMounted.current) {
          router.push(`/marketplace/products?${queryString}`, {
            scroll: false,
          });
        }
        rafId.current = null;
      });
    },
    [sort, router]
  );

  // Réinitialiser les filtres et l'URL
  const handleReset = useCallback(() => {
    if (!isMounted.current) return;

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
