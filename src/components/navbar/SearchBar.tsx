"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchContext } from "@/contexts/SearchContext";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "use-debounce";

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const router = useRouter();
  const { searchTerm, setSearchTerm } = useSearchContext();
  const [localSearch, setLocalSearch] = useState<string>(searchTerm || "");
  const [debouncedSearch] = useDebounce(localSearch, 300); // Délai de 300ms
  const [isPending, startTransition] = useTransition();

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      startTransition(() => {
        setSearchTerm(debouncedSearch);
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("q", debouncedSearch);
        router.push(`/marketplace/products?${params.toString()}`, { scroll: false });
      });
    },
    [debouncedSearch, setSearchTerm, router]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalSearch(e.target.value);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    startTransition(() => {
      setSearchTerm("");
      router.push("/marketplace/products", { scroll: false });
    });
  }, [setSearchTerm, router]);

  // Synchroniser localSearch avec searchTerm du contexte
  useEffect(() => {
    if (searchTerm !== localSearch) {
      setLocalSearch(searchTerm || "");
    }
  }, [searchTerm]);

  return (
    <form onSubmit={handleSearch} className={className}>
      <div className="relative">
        <Input
          type="text"
          placeholder="Rechercher..."
          value={localSearch}
          onChange={handleInputChange}
          className={`w-full py-1.5 pl-3 ${
            localSearch ? "pr-16" : "pr-8"
          } rounded-full border focus:border-primary text-sm ${
            isPending ? "opacity-75" : ""
          }`}
          disabled={isPending}
        />
        {localSearch && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
            onClick={handleClearSearch}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="submit"
          size="icon"
          className="absolute rounded-full right-1 top-1/2 -translate-y-1/2 hover:text-primary"
          disabled={isPending}
        >
          {isPending ? (
            <div className="animate-spin h-4 w-4 border-t-2 border-primary rounded-full" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
