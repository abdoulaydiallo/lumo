// components/search/FilterControls.tsx
import { useCallback } from "react";
import { SearchFilters } from "@/lib/db/search.engine";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Package,
  DollarSign,
  Tag,
  Star,
  Globe,
  Check,
  RotateCcw,
} from "lucide-react";

interface FilterControlsProps {
  tempFilters: SearchFilters;
  onTempFiltersChange: (filters: SearchFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function FilterControls({
  tempFilters,
  onTempFiltersChange,
  onApply,
  onReset,
}: FilterControlsProps) {
  const categories = [
    { id: 1, name: "Vêtements" },
    { id: 2, name: "Accessoires" },
    { id: 3, name: "Maison" },
  ];
  const regions = ["France", "Europe", "Monde"];

  const handleInStockToggle = useCallback(
    (checked: boolean) => {
      onTempFiltersChange({ ...tempFilters, inStock: checked });
    },
    [tempFilters, onTempFiltersChange]
  );

  const handlePriceRangeChange = useCallback(
    (values: number[]) => {
      onTempFiltersChange({
        ...tempFilters,
        minPrice: values[0],
        maxPrice: values[1],
      });
    },
    [tempFilters, onTempFiltersChange]
  );

  const handleCategoryChange = useCallback(
    (categoryId: number, checked: boolean) => {
      onTempFiltersChange({
        ...tempFilters,
        categoryIds: checked
          ? [...(tempFilters.categoryIds || []), categoryId]
          : (tempFilters.categoryIds || []).filter((id) => id !== categoryId),
      });
    },
    [tempFilters, onTempFiltersChange]
  );

  const handleMinRatingChange = useCallback(
    (value: string) => {
      const rating = value === "none" ? undefined : Number(value);
      onTempFiltersChange({ ...tempFilters, minRating: rating });
    },
    [tempFilters, onTempFiltersChange]
  );

  const handleRegionChange = useCallback(
    (value: string) => {
      const region = value === "all" ? undefined : value;
      onTempFiltersChange({ ...tempFilters, region });
    },
    [tempFilters, onTempFiltersChange]
  );

  return (
    <div className="mt-6 space-y-6">
      {/* Disponibilité */}
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Package className="w-4 h-4" />
          Disponibilité
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <Checkbox
            id="inStock"
            checked={tempFilters.inStock ?? true}
            onCheckedChange={handleInStockToggle}
          />
          <label htmlFor="inStock" className="text-sm">
            En stock uniquement
          </label>
        </div>
      </div>

      {/* Prix */}
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Prix (GNF)
        </h3>
        <Slider
          min={0}
          max={1500000}
          step={5}
          value={[tempFilters.minPrice || 0, tempFilters.maxPrice || 1500000]}
          onValueChange={handlePriceRangeChange}
          className="mt-4"
        />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>{tempFilters.minPrice || 0} GNF</span>
          <span>{tempFilters.maxPrice || 1500000} GNF</span>
        </div>
      </div>

      {/* Catégories */}
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Catégories
        </h3>
        <div className="mt-2 space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={
                  tempFilters.categoryIds?.includes(category.id) || false
                }
                onCheckedChange={(checked) =>
                  handleCategoryChange(category.id, checked as boolean)
                }
              />
              <label htmlFor={`category-${category.id}`} className="text-sm">
                {category.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Note minimale */}
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Star className="w-4 h-4" />
          Note minimale
        </h3>
        <Select
          value={tempFilters.minRating?.toString() || "none"}
          onValueChange={handleMinRatingChange}
        >
          <SelectTrigger className="mt-2 w-full">
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

      {/* Région */}
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Région
        </h3>
        <Select
          value={tempFilters.region || "all"}
          onValueChange={handleRegionChange}
        >
          <SelectTrigger className="mt-2 w-full">
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

      {/* Boutons d'action */}
      <div className="flex flex-col gap-2">
        <Button onClick={onApply} className="w-full">
          <Check className="w-4 h-4 mr-2" />
          Appliquer
        </Button>
        <Button variant="outline" onClick={onReset} className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          Réinitialiser
        </Button>
      </div>
    </div>
  );
}
