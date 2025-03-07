"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/marketplace/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <form onSubmit={handleSearch} className={className}>
      <div className="relative">
        <Input
          type="text"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-1.5 pl-3 pr-8 rounded-full border border-muted focus:border-primary text-sm"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}