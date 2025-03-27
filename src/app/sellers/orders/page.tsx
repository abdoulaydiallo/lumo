// app/orders/page.tsx
import OrderTable from "@/components/dashboard/sellers/OrderTable";
import { OrderSortOption, searchOrders } from "@/lib/db/order.search.engine";
import {
  orderStatuses,
  paymentStatuses,
  paymentMethods,
} from "@/lib/db/schema";

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
  searchParams: SearchParams;
}) {
  // Transformation des searchParams en filtres pour searchOrders
  const filters = {
    status: searchParams.status?.split(","),
    paymentStatus: searchParams.paymentStatus?.split(","),
    paymentMethod: searchParams.paymentMethod?.split(","),
    userId: searchParams.userId ? parseInt(searchParams.userId) : undefined,
    storeId: searchParams.storeId ? parseInt(searchParams.storeId) : undefined,
    driverId: searchParams.driverId
      ? parseInt(searchParams.driverId)
      : undefined,
    dateRange:
      searchParams.startDate && searchParams.endDate
        ? {
            start: new Date(searchParams.startDate),
            end: new Date(searchParams.endDate),
          }
        : undefined,
    searchTerm: searchParams.searchTerm,
  };

  const sort = (searchParams.sort as OrderSortOption) || "newest";
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const perPage = searchParams.perPage ? parseInt(searchParams.perPage) : 10;

  // Exécution de la recherche côté serveur
  const results = await searchOrders({
    filters,
    sort,
    pagination: { page, perPage },
  });

  return (
    <OrderTable
      initialOrders={results.orders}
      initialTotal={results.total}
      initialPage={results.page}
      initialTotalPages={results.totalPages}
      statusOptions={orderStatuses.enumValues}
      paymentStatusOptions={paymentStatuses.enumValues}
      paymentMethodOptions={paymentMethods.enumValues}
      initialFilters={filters}
      initialSort={sort}
    />
  );
}
