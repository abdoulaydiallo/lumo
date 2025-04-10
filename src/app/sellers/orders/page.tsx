export const dynamic = "force-dynamic";

import { StoreOrdersTable } from "@/components/dashboard/orders/OrderTable";
import { getInitialStoreOrders } from "@/features/store-orders/api/queries";
import { getUser } from "@/lib/auth";
import {
  orderStatuses,
  paymentStatuses,
  paymentMethods,
} from "@/lib/db/schema";
import { redirect } from "next/navigation";

export interface SearchParams {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  shipmentStatus?: string;
  startDate?: string;
  endDate?: string;
  paymentStartDate?: string;
  paymentEndDate?: string;
  minAmount?: string;
  maxAmount?: string;
  page?: string;
  perPage?: string;
}

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getUser();

  // Vérification de l'utilisateur et redirection si non-vendeur
  if (!user?.id || user?.role !== "store") {
    redirect("/marketplace/products");
  }

  // Résolution des searchParams
  const resolvedSearchParams = await searchParams;

  // Récupération des données initiales des sous-commandes
  const initialData = await getInitialStoreOrders(
    Number(user.id),
    user.role as "store",
    resolvedSearchParams
  );

  return (
    <StoreOrdersTable
      searchParams={resolvedSearchParams}
      statusOptions={orderStatuses.enumValues}
      paymentStatusOptions={paymentStatuses.enumValues}
      paymentMethodOptions={paymentMethods.enumValues}
      initialOrders={initialData.storeOrders} 
      initialTotal={initialData.total}
      initialPage={initialData.page}
      initialTotalPages={initialData.totalPages}
      initialStats={initialData.stats}
      userId={user.id}
      userRole={user.role}
    />
  );
}