// @/app/products/components/ProductList.tsx
"use client";

import { useSearch } from "@/hooks/use-search";
import { ProductListProps, SortOption } from "../types";
import SearchBar from "./searchBar";
import ProductCard from "./ProductCard";
import LoadingSkeleton from "./LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function ProductList({ initialData }: ProductListProps) {
  const {
    searchTerm,
    setSearchTerm,
    submitSearch,
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    updateParams,
  } = useSearch({
    filters: { searchTerm: "" },
    sort: "relevance",
    pagination: { limit: 8, cursor: null },
  });

  const handleSort = (sort: SortOption) => {
    console.log("Nouveau tri sélectionné:", sort);
    updateParams({ sort });
  };

  const handleSearch = (term: string) => {
    console.log("Nouveau terme de recherche:", term);
    setSearchTerm(term);
  };

  const handleSubmit = () => {
    submitSearch();
  };

  const allProducts = Array.from(
    new Map(
      (
        data?.pages.flatMap((page: { products: any; }) => page.products) || initialData.products
      ).map((product: { id: any; }) => [product.id, product])
    ).values()
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <SearchBar
        searchTerm={searchTerm}
        onSearch={handleSearch}
        onSort={handleSort}
        onSubmit={handleSubmit}
      />
      {allProducts.length === 0 ? (
        <p className="text-center text-gray-500">Aucun produit trouvé.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {allProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      {hasNextPage && (
        <div className="mt-6 text-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? "Chargement..." : "Charger plus"}
          </Button>
        </div>
      )}
      {isFetchingNextPage && (
        <div className="mt-6">
          <LoadingSkeleton />
        </div>
      )}
    </div>
  );
}
