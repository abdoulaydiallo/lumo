import { searchProducts } from "@/lib/db/search.engine";
import SearchClient from "./components/client-search";

export default async function SearchPage() {
  const initialData = await searchProducts({
    filters: {
      searchTerm: "",
      inStock: true,
    }, // Recherche vide pour tout retourner
    sort: "relevance",
    pagination: { limit: 8, cursor: null },
  });

  //console.log("Données initiales dans SearchPage :", initialData);

  return (
    <div className="max-w-5xl mx-auto">
      <SearchClient initialData={initialData} />;
    </div>
  );
}
