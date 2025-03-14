"use client";

import SearchWrapper from "@/components/search/SearchWrapper";
import { SearchResult, SearchParams } from "@/lib/db/search.engine";

interface SearchClientProps {
  initialData: SearchResult;
  initialParams: SearchParams;
}

export default function SearchClient({
  initialData,
  initialParams,
}: SearchClientProps) {
  return (
    <SearchWrapper initialData={initialData} initialParams={initialParams} />
  );
}
