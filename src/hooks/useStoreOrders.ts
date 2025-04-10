"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  StoreOrderFilters,
  StoreOrderSearchResult,
  StoreOrderWithDetails,
} from "@/algorithms/storeOrders.search";
import { toast } from "sonner";

export function useStoreOrders(
  sellerUserId: number,
  initialFilters?: StoreOrderFilters,
  initialPagination?: { page: number; perPage: number }
) {
  const queryClient = useQueryClient();

  // Valeurs par défaut pour les filtres et la pagination
  const defaultFilters: StoreOrderFilters = {
    status: undefined,
    paymentStatus: undefined,
    paymentMethod: undefined,
    dateRange: undefined,
    paymentDateRange: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    shipmentStatus: undefined,
    ...initialFilters,
  };
  const defaultPagination = {
    page: initialPagination?.page || 1,
    perPage: initialPagination?.perPage || 10,
  };

  // Construire la query string pour les requêtes
  const buildQueryString = (filters: StoreOrderFilters, pagination: { page: number; perPage: number }) => {
    const params = new URLSearchParams();
    if (filters.status?.length) params.set("status", filters.status.join(","));
    if (filters.paymentStatus?.length) params.set("paymentStatus", filters.paymentStatus.join(","));
    if (filters.paymentMethod?.length) params.set("paymentMethod", filters.paymentMethod.join(","));
    if (filters.dateRange) {
      params.set("dateStart", filters.dateRange.start.toISOString());
      params.set("dateEnd", filters.dateRange.end.toISOString());
    }
    if (filters.paymentDateRange) {
      params.set("paymentDateStart", filters.paymentDateRange.start.toISOString());
      params.set("paymentDateEnd", filters.paymentDateRange.end.toISOString());
    }
    if (filters.minAmount !== undefined) params.set("minAmount", String(filters.minAmount));
    if (filters.maxAmount !== undefined) params.set("maxAmount", String(filters.maxAmount));
    if (filters.shipmentStatus?.length) params.set("shipmentStatus", filters.shipmentStatus.join(","));
    params.set("page", String(pagination.page));
    params.set("perPage", String(pagination.perPage));
    return params.toString();
  };

  // Requête pour récupérer les sous-commandes
  const storeOrdersQuery = useQuery({
    queryKey: ["storeOrders", sellerUserId, defaultFilters, defaultPagination],
    queryFn: async (): Promise<StoreOrderSearchResult> => {
      const queryString = buildQueryString(defaultFilters, defaultPagination);
      const response = await fetch(`/api/store-orders/search?${queryString}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la récupération des sous-commandes");
      }
      const data = await response.json();
      return data.data as StoreOrderSearchResult;
    },
    enabled: !!sellerUserId,
  });

  // Mutation pour mettre à jour le statut d'une sous-commande
  const updateStatusMutation = useMutation({
    mutationFn: async ({ storeOrderId, status }: { storeOrderId: number; status: string }) => {
      const response = await fetch(`/api/store-orders/${storeOrderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, sellerUserId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la mise à jour du statut");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storeOrders", sellerUserId] });
      toast.success("Statut de la sous-commande mis à jour avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour du statut");
    },
  });

  // Mutation pour assigner un chauffeur à une sous-commande
  const assignDriverMutation = useMutation({
    mutationFn: async ({ storeOrderId, driverId }: { storeOrderId: number; driverId: number }) => {
      const response = await fetch(`/api/store-orders/${storeOrderId}/assign-driver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ driverId, sellerUserId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de l'assignation du chauffeur");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storeOrders", sellerUserId] });
      toast.success("Chauffeur assigné avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'assignation du chauffeur");
    },
  });

  // Fonction pour rafraîchir avec de nouveaux filtres/pagination
  const refetchWithParams = (
    newFilters?: StoreOrderFilters,
    newPagination?: { page: number; perPage: number }
  ) => {
    const updatedFilters = { ...defaultFilters, ...newFilters };
    const updatedPagination = { ...defaultPagination, ...newPagination };
    queryClient.invalidateQueries({
      queryKey: ["storeOrders", sellerUserId, updatedFilters, updatedPagination],
    });
    storeOrdersQuery.refetch();
  };

  return {
    storeOrders: storeOrdersQuery.data?.storeOrders as StoreOrderWithDetails[] | undefined,
    total: storeOrdersQuery.data?.total,
    page: storeOrdersQuery.data?.page,
    totalPages: storeOrdersQuery.data?.totalPages,
    stats: storeOrdersQuery.data?.stats,
    isLoading: storeOrdersQuery.isLoading,
    refetchWithParams,
    updateStoreOrderStatus: updateStatusMutation.mutate,
    assignDriver: assignDriverMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    isAssigningDriver: assignDriverMutation.isPending,
  };
}