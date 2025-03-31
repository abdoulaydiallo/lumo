"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchFilters, SearchResult } from "@/lib/db/search.engine";

interface ProductFiltersProps {
  storeId: number;
  initialProducts: SearchResult;
  categories: { id: number; name: string }[];
  onFilterChange: (filters: SearchFilters) => void; // Nouvelle prop au lieu de onResultsChange
}

const defaultFilters: SearchFilters = {
  searchTerm: "",
  categoryIds: undefined,
  inStock: undefined,
  minRating: undefined,
};

export default function ProductFilters({
  storeId,
  initialProducts,
  categories,
  onFilterChange,
}: ProductFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  const handleInputChange = (
    field: keyof SearchFilters,
    value: string | number | boolean | number[] | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [field]:
        field === "categoryIds"
          ? value === "all" || value === undefined
            ? undefined
            : [Number(value)]
          : value,
    }));
  };

  const handleApply = () => {
    onFilterChange(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-full md:w-1/2 lg:w-1/3">
          <Label htmlFor="searchTermFilter" className="text-sm">
            Recherche
          </Label>
          <Input
            id="searchTermFilter"
            value={filters.searchTerm || ""}
            onChange={(e) => handleInputChange("searchTerm", e.target.value)}
            placeholder="Rechercher par nom ou description"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="categoryFilter" className="text-sm">
            Catégorie
          </Label>
          <Select
            value={filters.categoryIds?.[0]?.toString() || "all"}
            onValueChange={(value) => handleInputChange("categoryIds", value)}
          >
            <SelectTrigger id="categoryFilter" className="mt-1">
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="minRatingFilter" className="text-sm">
            Note minimale
          </Label>
          <Select
            value={filters.minRating?.toString() || "all"}
            onValueChange={(value) =>
              handleInputChange(
                "minRating",
                value === "all" ? undefined : Number(value)
              )
            }
          >
            <SelectTrigger id="minRatingFilter" className="mt-1">
              <SelectValue placeholder="Sélectionner une note" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les notes</SelectItem>
              <SelectItem value="1">1 étoile</SelectItem>
              <SelectItem value="2">2 étoiles</SelectItem>
              <SelectItem value="3">3 étoiles</SelectItem>
              <SelectItem value="4">4 étoiles</SelectItem>
              <SelectItem value="5">5 étoiles</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="inStockFilter"
            checked={filters.inStock ?? false}
            onCheckedChange={(checked) => handleInputChange("inStock", checked)}
          />
          <Label htmlFor="inStockFilter" className="text-sm">
            En stock uniquement
          </Label>
        </div>
      </div>
      <div className="flex justify-start gap-2">
        <Button
          variant="default"
          onClick={handleApply}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Appliquer
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="bg-gray-100 hover:bg-gray-200"
        >
          Réinitialiser
        </Button>
      </div>
    </div>
  );
}
