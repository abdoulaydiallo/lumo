"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShipmentFilters, ShipmentSearchResult } from "@/algorithms/shipments.search";

export function useShipments(
  userId: number,
  userRole: "store" | "driver" | "admin" | "manager",
  initialFilters?: ShipmentFilters,
  initialPagination?: { page: number; perPage: number }
) {
  const queryClient = useQueryClient();

  // Valeurs par défaut pour les filtres et la pagination (alignées avec getInitialShipments)
  const defaultFilters: ShipmentFilters = {
    status: undefined,
    driverId: undefined,
    priorityLevel: undefined,
    dateRange: undefined,
    storeId: undefined,
    minEstimatedDeliveryTime: undefined,
    maxEstimatedDeliveryTime: undefined,
    hasSupportTicket: undefined,
    ...initialFilters,
  };
  const defaultPagination = {
    page: initialPagination?.page || 1,
    perPage: initialPagination?.perPage || 10, // Aligné avec getInitialShipments
  };

  // Construire la query string pour les requêtes (inspiré de useStoreOrders)
  const buildQueryString = (
    filters: ShipmentFilters,
    pagination: { page: number; perPage: number },
    userId: number,
    userRole: string
  ) => {
    const params = new URLSearchParams();
    if (filters.status?.length) params.set("status", filters.status.join(","));
    if (filters.driverId) params.set("driverId", filters.driverId.toString());
    if (filters.priorityLevel?.length) params.set("priorityLevel", filters.priorityLevel.join(","));
    if (filters.dateRange) {
      params.set("startDate", filters.dateRange.start.toISOString());
      params.set("endDate", filters.dateRange.end.toISOString());
    }
    if (filters.storeId) params.set("storeId", filters.storeId.toString());
    if (filters.minEstimatedDeliveryTime !== undefined)
      params.set("minEstimatedDeliveryTime", filters.minEstimatedDeliveryTime.toString());
    if (filters.maxEstimatedDeliveryTime !== undefined)
      params.set("maxEstimatedDeliveryTime", filters.maxEstimatedDeliveryTime.toString());
    if (filters.hasSupportTicket !== undefined)
      params.set("hasSupportTicket", filters.hasSupportTicket.toString());
    params.set("page", pagination.page.toString());
    params.set("perPage", pagination.perPage.toString());
    params.set("userId", userId.toString());
    params.set("userRole", userRole);
    return params.toString();
  };

  // Validation (similaire à getInitialShipments)
  const validateParams = (filters: ShipmentFilters, pagination: { page: number; perPage: number }) => {
    if (!["store", "driver", "admin", "manager"].includes(userRole)) {
      throw new Error("Invalid userRole for useShipments. Must be 'store', 'driver', 'admin', or 'manager'.");
    }

    if (
      filters.dateRange &&
      (isNaN(filters.dateRange.start.getTime()) || isNaN(filters.dateRange.end.getTime()))
    ) {
      throw new Error("Invalid date format in dateRange");
    }

    if (
      (filters.minEstimatedDeliveryTime !== undefined && filters.minEstimatedDeliveryTime < 0) ||
      (filters.maxEstimatedDeliveryTime !== undefined && filters.maxEstimatedDeliveryTime < 0) ||
      (filters.minEstimatedDeliveryTime !== undefined &&
        filters.maxEstimatedDeliveryTime !== undefined &&
        filters.minEstimatedDeliveryTime > filters.maxEstimatedDeliveryTime)
    ) {
      throw new Error("Invalid estimated delivery time parameters");
    }

    if (pagination.page < 1 || pagination.perPage < 1 || pagination.perPage > 100) {
      throw new Error("Invalid pagination parameters: page must be >= 1, perPage must be between 1 and 100");
    }
  };

  // Requête pour récupérer les expéditions
  const shipmentsQuery = useQuery({
    queryKey: ["shipments", userId, userRole, defaultFilters, defaultPagination],
    queryFn: async (): Promise<ShipmentSearchResult> => {
      validateParams(defaultFilters, defaultPagination);
      const queryString = buildQueryString(defaultFilters, defaultPagination, userId, userRole);
      const response = await fetch(`/api/shipments/search?${queryString}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Erreur HTTP ${response.status}: Route introuvable`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || "Erreur dans la réponse de l'API");
      return data.data as ShipmentSearchResult;
    },
    enabled: !!userId && !!userRole, // Ne lance la requête que si userId et userRole sont définis
    staleTime: 5 * 60 * 1000, // 5 minutes avant que les données ne soient obsolètes
    retry: 1, // Réessaye une fois en cas d'échec
  });

  // Fonction pour rafraîchir avec de nouveaux filtres/pagination (inspirée de useStoreOrders)
  const refetchWithParams = (
    newFilters?: ShipmentFilters,
    newPagination?: { page: number; perPage: number }
  ) => {
    const updatedFilters = { ...defaultFilters, ...newFilters };
    const updatedPagination = { ...defaultPagination, ...newPagination };
    queryClient.invalidateQueries({
      queryKey: ["shipments", userId, userRole, updatedFilters, updatedPagination],
    });
    shipmentsQuery.refetch();
  };

  return {
    shipments: shipmentsQuery.data?.shipments || [],
    total: shipmentsQuery.data?.total,
    page: shipmentsQuery.data?.page,
    totalPages: shipmentsQuery.data?.totalPages,
    stats: shipmentsQuery.data?.stats,
    isLoading: shipmentsQuery.isLoading,
    error: shipmentsQuery.error,
    refetchWithParams,
  };
}