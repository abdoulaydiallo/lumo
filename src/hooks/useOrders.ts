"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OrderFiltersBase, OrderPagination, OrderSearchResult } from "@/lib/orders/types";

export function useOrders(userId: number, initialFilters?: OrderFiltersBase, initialPagination?: OrderPagination) {
  const queryClient = useQueryClient();

  // Construire les paramètres de l'URL à partir des filtres et de la pagination
  const buildQueryString = (filters: OrderFiltersBase, pagination: OrderPagination) => {
    const params = new URLSearchParams();
    if (filters.status?.length) params.set("status", filters.status.join(","));
    if (filters.payment_status?.length) params.set("payment_status", filters.payment_status.join(","));
    if (filters.date_range) {
      params.set("date_start", filters.date_range.start.toISOString());
      params.set("date_end", filters.date_range.end.toISOString());
    }
    if (filters.min_amount !== undefined) params.set("min_amount", String(filters.min_amount));
    if (filters.max_amount !== undefined) params.set("max_amount", String(filters.max_amount));
    params.set("page", String(pagination.page));
    params.set("per_page", String(pagination.per_page));
    return params.toString();
  };

  // Valeurs par défaut pour les filtres et la pagination
  const defaultFilters: OrderFiltersBase = {
    payment_method: null, // Provide a default value for the required property
    ...initialFilters,
  };
  const defaultPagination: OrderPagination = {
    page: initialPagination?.page || 1,
    per_page: initialPagination?.per_page || 20,
  };

  const ordersQuery = useQuery({
    queryKey: ["orders", userId, defaultFilters, defaultPagination],
    queryFn: async (): Promise<OrderSearchResult> => {
      const queryString = buildQueryString(defaultFilters, defaultPagination);
      const response = await fetch(`/api/orders?${queryString}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la récupération des commandes");
      }
      const data = await response.json();
      return data.data as OrderSearchResult;
    },
    enabled: !!userId, // Désactiver la requête si userId n'est pas défini
  });

  // Fonction pour rafraîchir ou appliquer de nouveaux filtres/pagination
  const refetchWithParams = (newFilters?: OrderFiltersBase, newPagination?: OrderPagination) => {
    const updatedFilters = { ...defaultFilters, ...newFilters };
    const updatedPagination = { ...defaultPagination, ...newPagination };
    queryClient.invalidateQueries({
      queryKey: ["orders", userId, updatedFilters, updatedPagination],
    });
    ordersQuery.refetch();
  };

  return {
    orders: ordersQuery.data?.orders, // Liste des commandes
    total: ordersQuery.data?.total, // Nombre total de commandes
    page: ordersQuery.data?.page, // Page actuelle
    totalPages: ordersQuery.data?.total_pages, // Nombre total de pages
    stats: ordersQuery.data?.stats, // Statistiques
    isLoading: ordersQuery.isLoading, // État de chargement
    isFetching: ordersQuery.isFetching, // État de rechargement
    refetch: ordersQuery.refetch, // Fonction pour relancer la requête manuellement
    refetchWithParams, // Fonction pour appliquer de nouveaux filtres/pagination
  };
}