// @/app/marketplace/search/SearchClient.tsx
"use client";

import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { useSearch } from "@/features/search/hooks/use-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ProductList from "@/features/products/components/product-list";
import {
  SearchFilters,
  SearchResult,
  SortOption,
} from "@/lib/db/search.engine";
import { Filter } from "lucide-react";
import { useSearchContext } from "@/contexts/SearchContext";

interface SearchClientProps {
  initialData: SearchResult;
}

export default function SearchClient({ initialData }: SearchClientProps) {
  const { searchTerm, setSearchTerm } = useSearchContext();
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: searchTerm,
    inStock: true,
    minPrice: undefined,
    maxPrice: undefined,
    categoryIds: [],
    minRating: undefined,
    region: undefined,
  });
  const [sort, setSort] = useState<SortOption>("relevance");
  const [cursor, setCursor] = useState<{
    id: string;
    sortValue: string;
  } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const memoizedFilters = useMemo(
    () => ({
      ...filters,
      searchTerm: deferredSearchTerm,
    }),
    [filters, deferredSearchTerm]
  );

  const { data, isLoading, error } = useSearch(
    {
      filters: memoizedFilters,
      sort,
      pagination: { limit: 10, cursor },
    },
    initialData
  );

  useEffect(() => {
    console.log(
      "Synchronisation avec deferredSearchTerm :",
      deferredSearchTerm
    );
    setFilters((prev) => {
      if (prev.searchTerm !== deferredSearchTerm) {
        return { ...prev, searchTerm: deferredSearchTerm };
      }
      return prev;
    });
    setCursor(null);
  }, [deferredSearchTerm]);

  const handleReset = () => {
    console.log("Réinitialisation des filtres");
    setFilters({
      searchTerm: "",
      inStock: true,
      minPrice: undefined,
      maxPrice: undefined,
      categoryIds: [],
      minRating: undefined,
      region: undefined,
    });
    setSearchTerm("");
    setSort("relevance");
    setCursor(null);
  };

  const handleSortChange = (sortBy: SortOption) => {
    console.log("Tri changé :", sortBy);
    setSort(sortBy);
    setCursor(null);
  };

  const handleInStockToggle = (checked: boolean) => {
    console.log("InStock changé :", checked);
    setFilters((prev) => ({ ...prev, inStock: checked }));
  };

  const handlePriceRangeChange = (values: number[]) => {
    console.log("Plage de prix changée :", values);
    setFilters((prev) => ({
      ...prev,
      minPrice: values[0],
      maxPrice: values[1],
    }));
  };

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    console.log(`Catégorie ${categoryId} changée :`, checked);
    setFilters((prev) => ({
      ...prev,
      categoryIds: checked
        ? [...(prev.categoryIds || []), categoryId]
        : (prev.categoryIds || []).filter((id) => id !== categoryId),
    }));
  };

  const handleMinRatingChange = (value: string) => {
    const rating = value === "none" ? undefined : Number(value);
    console.log("Note minimale changée :", rating);
    setFilters((prev) => ({ ...prev, minRating: rating }));
  };

  const handleRegionChange = (value: string) => {
    const region = value === "all" ? undefined : value;
    console.log("Région changée :", region);
    setFilters((prev) => ({ ...prev, region }));
  };

  const handleNextPage = () => {
    if (data?.nextCursor) {
      console.log("Page suivante demandée, nouveau curseur :", data.nextCursor);
      setCursor(data.nextCursor);
    }
  };

  const categories = [
    { id: 1, name: "Vêtements" },
    { id: 2, name: "Accessoires" },
    { id: 3, name: "Maison" },
  ];

  const regions = ["France", "Europe", "Monde"];

  // Options de tri prioritaires sous forme de boutons (Pertinence remplacée par Remise décroissante)
  const primarySortOptions: { value: SortOption; label: string }[] = [
    { value: "price_asc", label: "Prix croissant" },
    { value: "price_desc", label: "Prix décroissant" },
    { value: "newest", label: "Plus récent" },
    { value: "discount_desc", label: "En promo" }, // "Remise décroissante" renommé "Promotions" pour plus de clarté
  ];

  // Options de tri secondaires dans le Select (Pertinence ajoutée)
  const secondarySortOptions: { value: SortOption; label: string }[] = [
    { value: "relevance", label: "Pertinence" }, // Déplacé ici
    { value: "popularity", label: "Popularité" },
    { value: "rating_desc", label: "Note décroissante" },
    { value: "stock_desc", label: "Stock décroissant" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        {/* Ligne avec Filtres, Boutons de tri, et Select */}
        <div className="flex items-center justify-between gap-4">
          {/* Bouton Filtres à gauche */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 shrink-0 rounded-full"
              >
                <Filter className="w-4 h-4" />
                Filtres
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-6">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium">Disponibilité</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox
                      id="inStock"
                      checked={filters.inStock || false}
                      onCheckedChange={handleInStockToggle}
                    />
                    <label htmlFor="inStock" className="text-sm">
                      En stock uniquement
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Prix (€)</h3>
                  <Slider
                    min={0}
                    max={500}
                    step={5}
                    value={[filters.minPrice || 0, filters.maxPrice || 500]}
                    onValueChange={handlePriceRangeChange}
                    className="mt-4"
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>{filters.minPrice || 0}€</span>
                    <span>{filters.maxPrice || 500}€</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Catégories</h3>
                  <div className="mt-2 space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={
                            filters.categoryIds?.includes(category.id) || false
                          }
                          onCheckedChange={(checked) =>
                            handleCategoryChange(
                              category.id,
                              checked as boolean
                            )
                          }
                        />
                        <label
                          htmlFor={`category-${category.id}`}
                          className="text-sm"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Note minimale</h3>
                  <Select
                    value={filters.minRating?.toString() || "none"}
                    onValueChange={handleMinRatingChange}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner une note" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value="1">1 étoile et plus</SelectItem>
                      <SelectItem value="2">2 étoiles et plus</SelectItem>
                      <SelectItem value="3">3 étoiles et plus</SelectItem>
                      <SelectItem value="4">4 étoiles et plus</SelectItem>
                      <SelectItem value="5">5 étoiles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Région</h3>
                  <Select
                    value={filters.region || "all"}
                    onValueChange={handleRegionChange}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner une région" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les régions</SelectItem>
                      {regions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full"
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Boutons de tri prioritaires au centre */}
          <div className="flex gap-2 overflow-x-auto justify-center flex-1">
            {primarySortOptions.map((option) => (
              <Button
                key={option.value}
                variant={sort === option.value ? "default" : "outline"}
                onClick={() => handleSortChange(option.value)}
                className="whitespace-nowrap px-4 rounded-full"
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* Menu Select pour les options secondaires à droite */}
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[200px] shrink-0 rounded-full">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              {secondarySortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Liste des produits */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-10">{error}</p>
          ) : data && data.products?.length > 0 ? (
            <div>
              <ProductList products={data.products as any} storeId={1} />
              <div className="mt-8 text-center">
                <Button
                  onClick={handleNextPage}
                  disabled={!data.nextCursor || isLoading}
                >
                  Charger plus
                </Button>
                {!data.nextCursor && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Fin des résultats
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              Aucun produit trouvé.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
