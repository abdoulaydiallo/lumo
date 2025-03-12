// @/features/products/components/ProductsClient.tsx
"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useProductSuggestions } from "@/features/products/hooks/seProductSuggestions";
import { useProducts } from "@/features/products/hooks/use-products";

interface FilterOptions {
  storeId?: number;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  promotionId?: number;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "newest" | "popularity";
  inStock?: boolean;
}

export default function ProductsClient({
  initialData,
}: {
  initialData: { products: any[]; total: number };
}) {
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: "",
    sortBy: "relevance",
    inStock: false,
  });
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState(""); // Nouvel état pour l'input
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data, isLoading } = useProducts(
    filters,
    { limit: 10, page },
    initialData
  );
  const { data: suggestions, isLoading: isLoadingSuggestions } =
    useProductSuggestions(inputValue);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setIsDropdownOpen(!!value && value.length >= 2); // Ouvre le dropdown si 2+ caractères
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, searchTerm: inputValue }));
    setPage(1);
    setIsDropdownOpen(false); // Ferme le dropdown après recherche
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setInputValue(suggestion);
    setFilters((prev) => ({ ...prev, searchTerm: suggestion }));
    setPage(1);
    setIsDropdownOpen(false);
  };

  const handleSort = (sortBy: FilterOptions["sortBy"]) => {
    setFilters((prev) => ({ ...prev, sortBy }));
    setPage(1);
  };

  const handleInStockToggle = (checked: boolean) => {
    setFilters((prev) => ({ ...prev, inStock: checked }));
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 flex items-center gap-2">
          <Input
            placeholder="Rechercher un produit..."
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full"
            onFocus={() =>
              setIsDropdownOpen(!!inputValue && inputValue.length >= 2)
            }
            onKeyDown={(e) => e.key === "Enter" && handleSearch()} // Recherche avec Entrée
          />
          <Button onClick={handleSearch}>Rechercher</Button>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              {isLoadingSuggestions ? (
                <DropdownMenuItem disabled>Chargement...</DropdownMenuItem>
              ) : suggestions && suggestions.length > 0 ? (
                suggestions.map((suggestion:any) => (
                  <DropdownMenuItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer"
                  >
                    {suggestion}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>Aucune suggestion</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Select value={filters.sortBy} onValueChange={handleSort as any}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Pertinence</SelectItem>
            <SelectItem value="price_asc">Prix croissant</SelectItem>
            <SelectItem value="price_desc">Prix décroissant</SelectItem>
            <SelectItem value="newest">Plus récent</SelectItem>
            <SelectItem value="popularity">Popularité</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
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

      {isLoading ? (
        <p className="text-center">Chargement...</p>
      ) : (
        <>
          <ul className="space-y-4">
            {data.products.map((product:any) => (
              <li key={product.id} className="border p-4 rounded-lg shadow-sm">
                <strong className="text-lg">{product.name}</strong> -{" "}
                {product.price}€ (
                {product.categories.map((c: any) => c.name).join(", ")})
                <p className="text-sm text-gray-500">
                  {product.description?.slice(0, 100)}...
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <span className="flex items-center">
              Page {page} / {Math.ceil(data.total / 10)}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(data.total / 10)}
            >
              Suivant
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
