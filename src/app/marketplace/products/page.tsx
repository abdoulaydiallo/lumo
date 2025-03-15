import { Suspense } from "react";
import {
  searchProducts,
  type SortOption,
  type SearchResult,
  type SearchFilters,
} from "@/lib/db/search.engine";
import LoadingSkeleton from "./components/loading-skeleton";
import SearchClient from "./components/SearchClient";

// Typage strict des paramètres de recherche
interface SearchParams {
  q?: string;
  inStock?: string;
  minPrice?: string;
  maxPrice?: string;
  category?: string;
  minRating?: string;
  region?: string;
  sort?: string;
}

// Options de tri valides
const VALID_SORT_OPTIONS: SortOption[] = [
  "relevance",
  "price_asc",
  "price_desc",
  "newest",
  "popularity",
  "rating_desc",
  "stock_desc",
];

// Pas de mise en cache pour une page dynamique
export const revalidate = 0;
interface IParams {
  params: Promise<SearchParams>;
}
export default async function SearchPage({
  params,
}: IParams) {
  const searchParams = await params;
  // Conversion de searchParams en objet classique (si ce n'est pas déjà un objet)
  const parsedParams: SearchParams = {
    q: searchParams.q ?? "",
    inStock: searchParams.inStock ?? "true",
    minPrice: searchParams.minPrice ?? undefined,
    maxPrice: searchParams.maxPrice ?? undefined,
    category: searchParams.category ?? undefined,
    minRating: searchParams.minRating ?? undefined,
    region: searchParams.region ?? undefined,
    sort: searchParams.sort ?? "relevance",
  };

  // Utilitaire pour convertir une chaîne en nombre valide
  const toValidNumber = (value?: string): number | undefined => {
    if (!value || isNaN(Number(value))) return undefined;
    return Number(value);
  };

  // Construction des filtres avec validation
  const filters: SearchFilters = {
    searchTerm: parsedParams.q || "",
    inStock: parsedParams.inStock !== "false",
    minPrice: toValidNumber(parsedParams.minPrice),
    maxPrice: toValidNumber(parsedParams.maxPrice),
    categoryIds: parsedParams.category
      ? parsedParams.category
          .split(",")
          .map(Number)
          .filter((id) => !isNaN(id))
      : [],
    minRating: toValidNumber(parsedParams.minRating),
    region: parsedParams.region,
  };

  // Validation du tri
  const sort = VALID_SORT_OPTIONS.includes(parsedParams.sort as SortOption)
    ? (parsedParams.sort as SortOption)
    : "relevance";

  // Paramètres initiaux alignés avec SearchParams
  const initialParams = {
    filters,
    sort,
    pagination: { limit: 8, cursor: null },
  };

  // Récupération des données avec le type correct
  const initialData: SearchResult = await searchProducts(initialParams);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SearchClient initialData={initialData} initialParams={initialParams} />
    </Suspense>
  );
}
