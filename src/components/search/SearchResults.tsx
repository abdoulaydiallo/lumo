import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch } from "@/features/search/hooks/use-search";
import ProductList from "@/features/products/components/product-list";
import {
  SearchFilters,
  SearchResult,
  SortOption,
} from "@/lib/db/search.engine";
import LoadingSkeleton from "@/app/marketplace/products/components/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

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
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const { data, isLoading, error } = useSearch(
    { filters, sort, pagination: { limit: 8, cursor } },
    initialData
  );

  useEffect(() => {
    setHasMore(!!data?.nextCursor);
  }, [data]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading && data?.nextCursor) {
        onCursorChange(data.nextCursor);
      }
    },
    [hasMore, isLoading, data?.nextCursor, onCursorChange]
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

  return (
    <section className="flex-1">
      {data && data.products?.length > 0 && (
        <div className="py-4">
          <ProductList products={data.products} />
        </div>
      )}
      {(isLoading || hasMore) && (
        <div ref={isLoading ? null : loadMoreRef} className="py-2 container mx-auto">
          <LoadingSkeleton />
        </div>
      )}
      {!isLoading && !hasMore && data && data.products?.length > 0 && (
        <div className="container mx-auto py-8">
          <div className="flex flex-col items-center justify-center space-y-4">
              <p
                aria-live="polite"
                className="text-muted-foreground text-lg font-medium"
              >
                Vous avez atteint la fin des résultats
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Revenir en haut
              </Button>
          </div>
        </div>
      )}
      {error && (
        <p aria-live="polite" className="text-center text-destructive py-8">
          {error}
        </p>
      )}
      {!isLoading && !data?.products?.length && (
        <p aria-live="polite" className="text-center text-muted-foreground py-10">
          Aucun produit trouvé. Entrez un terme ou appliquez des filtres.
        </p>
      )}
    </section>
  );
}