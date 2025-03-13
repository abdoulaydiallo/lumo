// components/search/SearchResults.tsx
import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { useSearch } from "@/features/search/hooks/use-search";
import ProductList from "@/features/products/components/product-list";
import {
  SearchFilters,
  SearchResult,
  SortOption,
} from "@/lib/db/search.engine";
import LoadingSkeleton from "@/app/marketplace/products/components/loading-skeleton";

interface SearchResultsProps {
  filters: SearchFilters;
  sort: SortOption;
  cursor: { id: string; sortValue: string } | null;
  initialData: SearchResult;
  onCursorChange: (cursor: { id: string; sortValue: string } | null) => void;
}

export default function SearchResults({
  filters,
  sort,
  cursor,
  initialData,
  onCursorChange,
}: SearchResultsProps) {
  const memoizedFilters = useMemo(() => filters, [filters]);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lastItemRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const { data, isLoading, error } = useSearch(
    { filters: memoizedFilters, sort, pagination: { limit: 8, cursor } },
    initialData
  );

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading && data?.nextCursor) {
        const previousScrollPosition = window.scrollY;
        onCursorChange(data.nextCursor);
        setTimeout(() => {
          if (lastItemRef.current) {
            lastItemRef.current.scrollIntoView({ behavior: "smooth" });
          } else {
            window.scrollTo({
              top: previousScrollPosition + 200,
              behavior: "smooth",
            });
          }
        }, 100);
      }
    },
    [data, isLoading, hasMore, onCursorChange]
  );

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "200px",
      threshold: 0,
    };
    observer.current = new IntersectionObserver(handleObserver, options);
    if (loadMoreRef.current) observer.current.observe(loadMoreRef.current);
    return () => observer.current?.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    if (data && !data.nextCursor) setHasMore(false);
    else setHasMore(true);
  }, [data]);

  return (
    <div className="flex-1">
      {isLoading && !data?.products.length ? (
        <div className="py-8 container mx-auto">
          <LoadingSkeleton />
        </div>
      ) : error ? (
        <p className="text-center text-destructive py-8">{error}</p>
      ) : data && data.products?.length > 0 ? (
        <div className="py-4">
          <ProductList products={data.products as any} />
          <div ref={lastItemRef} className="h-1" />
          {hasMore && (
            <div ref={loadMoreRef} className="py-8 container mx-auto">
              <LoadingSkeleton />
            </div>
          )}
          {!hasMore && (
            <p className="text-center text-muted-foreground py-10">
              Fin des résultats
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-10">
          Aucun produit trouvé. Entrez un terme ou appliquez des filtres.
        </p>
      )}
    </div>
  );
}
