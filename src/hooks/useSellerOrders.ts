// src/hooks/useSellerOrders.ts
import { useQuery } from "@tanstack/react-query";
import { searchSellerOrders } from "@/lib/orders/search/seller";
import type { OrderFiltersBase, OrderPagination, OrderSearchResult } from "@/lib/orders/types";

export function useSellerOrders(
  seller_id: number,
  filters?: OrderFiltersBase,
  pagination?: Partial<OrderPagination>,
  options = {}
) {
  return useQuery<OrderSearchResult>({
    queryKey: ['seller-orders', seller_id, filters, pagination],
    queryFn: () => searchSellerOrders(seller_id, { 
      filters, 
      pagination: {
        page: pagination?.page || 1,
        per_page: pagination?.per_page || 20
      }
    }),
    // Options pour données toujours fraîches
    staleTime: 0,
    refetchOnWindowFocus: true,
    ...options
  });
}