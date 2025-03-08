// @/app/marketplace/stores/page.tsx
import Heading from "@/components/Heading";
import { getAllStores } from "@/features/stores/api/queries";
import StoresList from "@/features/stores/components/store-list";

export default async function StoresPage() {
  try {
    const allStores = await getAllStores();

    return (
      <div className="container mx-auto py-6">
        <Heading
          title="Boutiques"
          subtitle="Toutes les boutiques disponibles"
        />
        <StoresList stores={allStores} />
      </div>
    );
  } catch (error) {
    console.error("Error in StoresPage:", error);
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Boutiques</h1>
        <p className="text-destructive">
          Erreur lors du chargement des boutiques.
        </p>
      </div>
    );
  }
}
