"use client";

import {
  useState,
  useCallback,
  useTransition,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { useSearchContext } from "@/contexts/SearchContext";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandList,
  CommandItem,
} from "@/components/ui/command";

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const router = useRouter();
  const searchContext = useSearchContext();
  const searchTerm = searchContext?.searchTerm ?? "";
  const setSearchTerm = searchContext?.setSearchTerm ?? (() => {});
  const [localSearch, setLocalSearch] = useState<string>(searchTerm);
  const [debouncedSearch] = useDebounce(localSearch, 300);
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    try {
      const response = await fetch(
        `/api/suggestions?q=${encodeURIComponent(query)}`,
        { signal: abortControllerRef.current.signal }
      );
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setIsSuggestionsOpen(data.suggestions?.length > 0);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Erreur lors de la récupération des suggestions :", error);
      setSuggestions([]);
      setIsSuggestionsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending) {
      fetchSuggestions(debouncedSearch);
    }
  }, [debouncedSearch, fetchSuggestions, isPending]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        (isSearchOpen || isSuggestionsOpen) &&
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
        setIsSuggestionsOpen(false);
      }
    },
    [isSearchOpen, isSuggestionsOpen]
  );

  useEffect(() => {
    if (isSearchOpen || isSuggestionsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isSearchOpen, isSuggestionsOpen, handleClickOutside]);

  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      startTransition(() => {
        setSearchTerm(debouncedSearch);
        setIsSuggestionsOpen(false);
        setIsSearchOpen(false);
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

  const handleCloseSearch = useCallback(() => {
    setLocalSearch("");
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    setIsSearchOpen(false);
    startTransition(() => {
      setSearchTerm("");
      router.push("/marketplace/products", { scroll: false });
    });
  }, [setSearchTerm, router]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setLocalSearch(suggestion);
      setSearchTerm(suggestion);
      setIsSuggestionsOpen(false);
      setIsSearchOpen(false);
      const params = new URLSearchParams();
      params.set("q", suggestion);
      router.push(`/marketplace/products?${params.toString()}`, {
        scroll: false,
      });
    },
    [setSearchTerm, router]
  );

  const toggleSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  return (
    <div className={cn("relative w-full z-30", className)} ref={searchRef}>
      <button
        type="button"
        onClick={toggleSearch}
        className={cn(
          "md:hidden absolute right-0 top-1/2 -translate-y-1/2",
          "h-10 w-10 flex items-center justify-center rounded-full",
          "text-muted-foreground hover:bg-primary/10 hover:text-primary",
          "transition-colors duration-200",
          isSearchOpen && "hidden"
        )}
        aria-label="Ouvrir la recherche"
        aria-expanded={isSearchOpen}
        aria-controls="search-form"
      >
        <Search className="size-5 transition-transform duration-200 hover:scale-110" />
      </button>

      {isSearchOpen && (
        <div
          className="fixed inset-0  z-20 md:hidden"
          onClick={handleCloseSearch}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "w-full transition-all duration-300 ease-in-out",
          isSearchOpen
            ? "block fixed inset-x-0 top-0 z-30 bg-background md:static md:block md:max-w-md md:mx-auto"
            : "hidden md:block md:max-w-md md:mx-auto"
        )}
      >
        <form
          id="search-form"
          onSubmit={handleSearch}
          className="mx-4 mt-4 md:mx-0 md:mt-0 relative"
        >
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Rechercher des produits..."
              value={localSearch}
              onChange={handleInputChange}
              className={cn(
                "w-full h-10 px-4 rounded-full border border-muted",
                "text-base bg-background",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                "transition duration-200 ease-in-out",
                "pr-12"
              )}
              disabled={isPending}
              aria-label="Rechercher des produits"
              aria-autocomplete="list"
              aria-controls="suggestions-list"
            />
            <button
              type={isSearchOpen ? "button" : "submit"}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2",
                "h-8 w-8 flex items-center justify-center rounded-full",
                "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                "transition-colors duration-200",
                isPending && "opacity-50 cursor-not-allowed"
              )}
              onClick={isSearchOpen ? handleCloseSearch : undefined}
              disabled={isPending}
              aria-label={isSearchOpen ? "Fermer la recherche" : "Lancer la recherche"}
            >
              {isPending ? (
                <div className="animate-spin size-5 border-2 border-t-primary rounded-full" />
              ) : isSearchOpen ? (
                <X className="size-4" />
              ) : (
                <Search className="size-4" />
              )}
            </button>
          </div>

          {isSuggestionsOpen && suggestions.length > 0 && (
            <Command
              id="suggestions-list"
              className={cn(
                "absolute w-[calc(100%-2rem)] mt-1 border rounded-lg shadow-sm",
                "bg-background max-h-60 overflow-y-auto",
                "md:w-full z-40"
              )}
            >
              <CommandList>
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={index}
                    value={suggestion}
                    onSelect={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 text-base cursor-pointer"
                  >
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          )}
        </form>
      </div>
    </div>
  );
}