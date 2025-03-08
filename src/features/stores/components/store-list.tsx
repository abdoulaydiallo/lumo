// @/features/stores/components/stores-list.tsx
import StoreCard from "./store-card";
import Link from "next/link";
import { Store } from "../api/types";
import StoresListSkeleton from "./store-list-skeleton";

interface StoresListProps {
  stores: Store[];
  isLoading?: boolean; // Optionnel pour une version client
}

export default function StoresList({
  stores,
  isLoading = false,
}: StoresListProps) {
  if (isLoading) {
    return <StoresListSkeleton />;
  }

  if (!stores.length) {
    return (
      <div className="text-muted-foreground text-center py-6">
        Aucune boutique disponible pour le moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {stores.map((store) => (
        <Link key={store.id} href={`/marketplace/stores/${store.id}`} passHref>
          <StoreCard store={store} />
        </Link>
      ))}
    </div>
  );
}
