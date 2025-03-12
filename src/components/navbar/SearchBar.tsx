// @/components/navbar/SearchBar.tsx
"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchContext } from "@/contexts/SearchContext";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Fonction utilitaire pour debounce
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const { setSearchTerm } = useSearchContext();
  const [localSearch, setLocalSearch] = useState(""); // État local pour la saisie immédiate
  const [isPending, startTransition] = useTransition(); // Gestion des transitions

  // Débouncer la mise à jour de searchTerm dans le contexte
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => {
      startTransition(() => {
        console.log("Mise à jour debounced de searchTerm :", value);
        setSearchTerm(value);
      });
    }, 200),
    [setSearchTerm]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      console.log("Recherche soumise immédiatement :", localSearch);
      startTransition(() => {
        setSearchTerm(localSearch); // Mise à jour immédiate lors de la soumission
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalSearch(newValue); // Mise à jour immédiate de l'input
    debouncedSetSearchTerm(newValue); // Mise à jour debounced dans le contexte
  };

  return (
    <form onSubmit={handleSearch} className={className}>
      <div className="relative">
        <Input
          type="text"
          placeholder="Rechercher..."
          value={localSearch}
          onChange={handleInputChange}
          className="w-full py-1.5 pl-3 pr-8 rounded-full border border-muted focus:border-primary text-sm"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          disabled={isPending} // Désactiver pendant la transition
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
