// src/app/marketplace/products/page.tsx
import { Suspense } from "react";
import { searchProducts, SortOption } from "@/lib/db/search.engine";
import LoadingSkeleton from "./components/loading-skeleton";
import SearchClient from "./components/SearchClient";

export const revalidate = 300; // Cache SSR pendant 5 minutes, aligné avec Redis
interface ParamsProps {
  params: Promise<{ [key: string]: string | undefined }>;
}
export default async function SearchPage({
  params,
}: ParamsProps) {
  const searchParams = await params;
  const filters = {
    searchTerm: searchParams.q || "",
    inStock: searchParams.inStock === "false" ? false : true,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    categoryIds: searchParams.category
      ? searchParams.category.split(",").map(Number)
      : [],
    minRating: searchParams.minRating
      ? Number(searchParams.minRating)
      : undefined,
    region: searchParams.region || undefined,
  };
  const sort = (searchParams.sort as SortOption) || "relevance";
  const initialParams = {
    filters,
    sort,
    pagination: { limit: 8, cursor: null },
  };

  const initialData = await searchProducts(initialParams);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SearchClient initialData={initialData} initialParams={initialParams} />
    </Suspense>
  );
}
