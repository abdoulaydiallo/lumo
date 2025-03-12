// @/app/products/page.tsx
import { searchProducts, SearchResult } from "@/lib/db/search.engine";
import ProductList from "./components/ProductList";

const DEFAULT_SEARCH_PARAMS = {
  filters: { searchTerm: "" },
  sort: "relevance" as const,
  pagination: { limit: 8, cursor: null },
};

export default async function ProductsPage() {
  const initialData: SearchResult = await searchProducts(DEFAULT_SEARCH_PARAMS);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Nos Produits</h1>
      <ProductList initialData={initialData} />
    </div>
  );
}
