// @/app/sellers/products/page.tsx
import ProductTable from "@/components/dashboard/productTable";
import { getStoreByUserId } from "@/features/stores/api/queries";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { searchProducts } from "@/lib/db/search.engine";

export const revalidate = 0; // Désactiver le cache statique pour cette page

export default async function Page() {
  const session = await auth();
  const store = session?.user?.id ? await getStoreByUserId(session.user.id) : null;

  if (!store) {
    redirect("/sellers/overview");
  }

  const filters = {
    searchTerm: "",
    storeId: store.id,
  };

  const initialParams = {
    filters,
    usCache: false,
    sort: "relevance" as const,
    pagination: { limit: 10, cursor: null },
  };

  const initialProducts = await searchProducts(initialParams);

  return <ProductTable storeId={store.id} initialProducts={initialProducts} />;
}