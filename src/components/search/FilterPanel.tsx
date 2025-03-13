// components/search/FilterPanel.tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { SearchFilters } from "@/lib/db/search.engine";
import FilterControls from "./FilterControls";

interface FilterPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tempFilters: SearchFilters;
  onTempFiltersChange: (filters: SearchFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function FilterPanel({
  isOpen,
  onOpenChange,
  tempFilters,
  onTempFiltersChange,
  onApply,
  onReset,
}: FilterPanelProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2"
        >
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full md:w-80 p-6">
        <SheetHeader>
          <SheetTitle>Filtres</SheetTitle>
        </SheetHeader>
        <FilterControls
          tempFilters={tempFilters}
          onTempFiltersChange={onTempFiltersChange}
          onApply={onApply}
          onReset={onReset}
        />
      </SheetContent>
    </Sheet>
  );
}
