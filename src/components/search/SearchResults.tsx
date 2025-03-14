import { useState, useEffect, useRef, useCallback } from "react";
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
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const { data, isLoading, error } = useSearch(
    { filters, sort, pagination: { limit: 8, cursor } },
    initialData
  );

  const [isMounted, setIsMounted] = useState(false);

  // Gestion de l'état de montage
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false); // Nettoyage lorsque le composant est démonté
  }, []);

  // Logique de gestion de l'état de "hasMore" en fonction des données
  useEffect(() => {
    if (isMounted && data) {
      if (!data.nextCursor) {
        setHasMore(false); // Si il n'y a pas de prochain curseur, on indique qu'il n'y a plus de données à charger
      } else {
        setHasMore(true);
      }
    }
  }, [data, isMounted]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading && data?.nextCursor) {
        onCursorChange(data.nextCursor);
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

    return () => observer.current?.disconnect(); // Nettoyage de l'observateur à la sortie
  }, [handleObserver]);

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
          <ProductList products={data.products} />
          <div ref={loadMoreRef} className="h-1" />
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
