// components/search/SortButtons.tsx
import { Button } from "@/components/ui/button";
import { SortOption } from "@/lib/db/search.engine";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Star, Tag, TrendingUp } from "lucide-react";

const PRIMARY_SORT_OPTIONS = [
  { value: "relevance", label: "Pertinence", icon: null },
  { value: "price_asc", label: "Prix ↑", icon: ArrowUp },
  { value: "price_desc", label: "Prix ↓", icon: ArrowDown },
  { value: "newest", label: "Récent", icon: null },
  { value: "discount_desc", label: "Promo", icon: Tag },
  { value: "popularity", label: "Populaire", icon: TrendingUp },
  { value: "rating_desc", label: "Note ↓", icon: Star },
  { value: "stock_desc", label: "Stock ↓", icon: null },
] as const;

interface SortButtonsProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export default function SortButtons({ sort, onSortChange }: SortButtonsProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex md:justify-end gap-2 p-2 md:p-3 whitespace-nowrap">
        {PRIMARY_SORT_OPTIONS.map((option) => {
          const isActive = sort === option.value;
          const Icon = option.icon;

          return (
            <Button
              key={option.value}
              variant={isActive ? "default" : "outline"}
              onClick={() => onSortChange(option.value)}
              className={cn(
                "px-2 py-1 md:px-3 md:py-1.5 rounded-full text-md transition duration-200 ease-in-out",
                "min-w-18 md:min-w-24",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  : "border border-muted text-muted-foreground hover:border-primary hover:text-primary",
                "flex items-center justify-center gap-1"
              )}
              aria-pressed={isActive}
              aria-label={`Trier par ${option.label}`}
            >
              {Icon && <Icon className="size-3 md:size-3.5" />}
              <span>{option.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
