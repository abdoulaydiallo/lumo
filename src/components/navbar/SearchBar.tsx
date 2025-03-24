"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchContext } from "@/contexts/SearchContext";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const router = useRouter();
  const { searchTerm, setSearchTerm } = useSearchContext();
  const [localSearch, setLocalSearch] = useState<string>(searchTerm || "");
  const [debouncedSearch] = useDebounce(localSearch, 300);
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  // Fetch suggestions via API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }
    try {
      const response = await fetch(
        `/api/suggestions?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      console.log(data);
      setSuggestions(data.suggestions || []);
      setIsSuggestionsOpen(data.suggestions?.length > 0);
    } catch (error) {
      console.error("Erreur lors de la récupération des suggestions :", error);
      setSuggestions([]);
      setIsSuggestionsOpen(false);
    }
  }, []);

  // Déclencher les suggestions avec debounce
  const [debouncedQuery] = useDebounce(localSearch, 200);
  useEffect(() => {
    if (!isPending) {
      fetchSuggestions(debouncedQuery);
    }
  }, [debouncedQuery, fetchSuggestions, isPending]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      startTransition(() => {
        setSearchTerm(debouncedSearch);
        setIsSuggestionsOpen(false);
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("q", debouncedSearch);
        router.push(`/marketplace/products?${params.toString()}`, {
          scroll: false,
        });
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
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    startTransition(() => {
      setSearchTerm("");
      router.push("/marketplace/products", { scroll: false });
    });
  }, [setSearchTerm, router]);

  const handleSuggestionClick = (suggestion: string) => {
    setLocalSearch(suggestion);
    setSearchTerm(suggestion);
    setIsSuggestionsOpen(false);
    const params = new URLSearchParams();
    params.set("q", suggestion);
    router.push(`/marketplace/products?${params.toString()}`, {
      scroll: false,
    });
  };

  useEffect(() => {
    if (searchTerm && searchTerm !== localSearch) {
      setLocalSearch(searchTerm);
    }
  }, [searchTerm]);

  return (
    <form
      onSubmit={handleSearch}
      className={cn("w-full max-w-md mx-auto relative", className)}
    >
      <div className="relative border rounded-full">
        <Input
          type="text"
          placeholder="Rechercher des produits..."
          value={localSearch}
          onChange={handleInputChange}
          className={cn(
            "w-full h-12 px-4 rounded-full border border-muted",
            "text-base",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
            "transition duration-200 ease-in-out",
            localSearch ? "pr-16" : "pr-12"
          )}
          disabled={isPending}
          aria-label="Rechercher des produits"
          aria-autocomplete="list"
          aria-controls="suggestions-list"
        />
        {localSearch && (
          <button
            type="button"
            className={cn(
              "absolute right-10 top-1/2 -translate-y-1/2",
              "h-10 w-10 flex items-center justify-center",
              "text-muted-foreground hover:text-primary",
              "transition-colors duration-200",
              isPending && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleClearSearch}
            disabled={isPending}
            aria-label="Effacer la recherche"
          >
            <X className="size-5" />
          </button>
        )}
        <button
          type="submit"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2",
            "h-10 w-10 flex items-center justify-center rounded-full",
            "text-muted-foreground hover:bg-primary/10 hover:text-primary",
            "transition-colors duration-200",
            isPending && "opacity-50 cursor-not-allowed"
          )}
          disabled={isPending}
          aria-label="Lancer la recherche"
        >
          {isPending ? (
            <div className="animate-spin size-6 border-2 border-t-primary rounded-full" />
          ) : (
            <Search className="size-5" />
          )}
        </button>
      </div>

      {/* Liste de suggestions */}
      {isSuggestionsOpen && suggestions.length > 0 && (
        <ul
          id="suggestions-list"
          role="listbox"
          className={cn(
            "absolute z-10 w-full mt-1 max-h-60 overflow-y-auto",
            "bg-background border border-muted rounded-lg shadow-sm",
            "text-base",
            "transition-opacity duration-200 ease-in-out"
          )}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              role="option"
              className={cn(
                "px-4 py-2 cursor-pointer",
                "hover:bg-primary/10 hover:text-primary",
                "transition-colors duration-150"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
