// components/search/SortButtons.tsx
import { Button } from "@/components/ui/button";
import { SortOption } from "@/lib/db/search.engine";

const PRIMARY_SORT_OPTIONS = [
  { value: "relevance", label: "Pertinence" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "newest", label: "Plus récent" },
  { value: "discount_desc", label: "En promo" },
  { value: "popularity", label: "Popularité" },
  { value: "rating_desc", label: "Note décroissante" },
  { value: "stock_desc", label: "Stock décroissant" },
] as const;

interface SortButtonsProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export default function SortButtons({ sort, onSortChange }: SortButtonsProps) {
  return (
    <div className="w-full flex justify-between gap-2">
      {PRIMARY_SORT_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={sort === option.value ? "default" : "outline"}
          onClick={() => onSortChange(option.value)}
          className="whitespace-nowrap px-4 py-2 rounded-full min-w-[120px] text-sm"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
