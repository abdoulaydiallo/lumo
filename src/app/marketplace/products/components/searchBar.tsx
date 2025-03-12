// @/app/products/components/SearchBar.tsx
"use client";

import { SortOption } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchBarProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  onSort: (sort: SortOption) => void;
  onSubmit: () => void;
}

export default function SearchBar({
  searchTerm,
  onSearch,
  onSort,
  onSubmit,
}: SearchBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1 flex gap-2">
        <Input
          type="text"
          placeholder="Rechercher des produits..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full"
        />
        <Button onClick={onSubmit}>Rechercher</Button>
      </div>
      <Select onValueChange={onSort} defaultValue="relevance">
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trier par" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="relevance">Pertinence</SelectItem>
          <SelectItem value="price_asc">Prix croissant</SelectItem>
          <SelectItem value="price_desc">Prix décroissant</SelectItem>
          <SelectItem value="newest">Nouveautés</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
