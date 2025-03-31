// @/app/sellers/orders/page.tsx
export const dynamic = "force-dynamic";

import OrderTable from "@/components/dashboard/orders/OrderTable";
import { getInitialOrders } from "@/features/orders/api/queries";
import { getUser } from "@/lib/auth";
import {
  orderStatuses,
  paymentStatuses,
  paymentMethods,
} from "@/lib/db/schema";
import { redirect } from "next/navigation";

interface SearchParams {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  userId?: string;
  storeId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  sort?: string;
  page?: string;
  perPage?: string;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getUser();

  if (!user?.id || user?.role !== "store") {
    redirect("/marketplace/products");
  }

  // Await the searchParams to resolve its values
  const resolvedSearchParams = await searchParams;

  const initialData = await getInitialOrders(
    Number(user.id),
    user.role as "store",
    resolvedSearchParams
  );

  return (
    <OrderTable
      searchParams={resolvedSearchParams} 
      statusOptions={orderStatuses.enumValues}
      paymentStatusOptions={paymentStatuses.enumValues}
      paymentMethodOptions={paymentMethods.enumValues}
      initialOrders={initialData.orders}
      initialTotal={initialData.total}
      initialPage={initialData.page}
      initialTotalPages={initialData.total_pages}
      initialStats={initialData.stats}
    />
  );
}
