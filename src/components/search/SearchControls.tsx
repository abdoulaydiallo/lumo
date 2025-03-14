// components/search/SearchControls.tsx
import { useState, useCallback } from "react";
import { SearchFilters, SortOption } from "@/lib/db/search.engine";
import FilterPanel from "./FilterPanel";
import SortButtons from "./SortButtons";


interface SearchControlsProps {
  filters: SearchFilters;
  sort: SortOption;
  onFiltersChange: (filters: SearchFilters) => void;
  onSortChange: (sort: SortOption) => void;
  onReset: () => void;
  onApplyFilters: (filters: SearchFilters) => void;
}

export default function SearchControls({
  filters,
  sort,
  onSortChange,
  onReset,
  onApplyFilters,
}: SearchControlsProps) {
  const [tempFilters, setTempFilters] = useState<SearchFilters>(filters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleSortChange = useCallback(
    (sortBy: SortOption) => {
      onSortChange(sortBy);
    },
    [onSortChange]
  );

  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-2">
      <FilterPanel
        isOpen={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        tempFilters={tempFilters}
        onTempFiltersChange={setTempFilters}
        onApply={() => {
          onApplyFilters(tempFilters);
          setIsFilterOpen(false);
        }}
        onReset={onReset}
      />
      <SortButtons sort={sort} onSortChange={handleSortChange} />
    </div>
  );
}
