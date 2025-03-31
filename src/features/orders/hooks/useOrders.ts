"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderFiltersBase, OrderPagination, OrderSearchResult } from "@/lib/db/orders.search";
import { toast } from "sonner";

export function useOrders(userId: number, initialFilters?: OrderFiltersBase, initialPagination?: OrderPagination) {
  const queryClient = useQueryClient();

  // Valeurs par défaut pour les filtres et la pagination
  const defaultFilters: OrderFiltersBase = {
    payment_method: null, // Valeur par défaut pour éviter erreur de type
    ...initialFilters,
  };
  const defaultPagination: OrderPagination = {
    page: initialPagination?.page || 1,
    per_page: initialPagination?.per_page || 10,
  };

  // Construire la query string pour les requêtes
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

  // Requête pour récupérer les commandes
  const ordersQuery = useQuery({
    queryKey: ["orders", userId, defaultFilters, defaultPagination],
    queryFn: async (): Promise<OrderSearchResult> => {
      const queryString = buildQueryString(defaultFilters, defaultPagination);
      const response = await fetch(`/api/orders?${queryString}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la récupération des commandes");
      }
      const data = await response.json();
      return data.data as OrderSearchResult;
    },
    enabled: !!userId,
  });

  // Mutation pour mettre à jour le statut de la commande
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, sellerUserId: userId }),
      });
      if (!response.ok) throw new Error("Erreur lors de la mise à jour du statut");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders", userId] });
      toast.success("Statut de la commande mis à jour avec succès");
    },
    onError: (error) => toast.error(error.message || "Erreur lors de la mise à jour du statut"),
  });

  // Mutation pour annuler une commande
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callerUserId: userId }),
      });
      if (!response.ok) throw new Error("Erreur lors de l'annulation de la commande");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders", userId] });
      toast.success("Commande annulée avec succès");
    },
    onError: (error) => toast.error(error.message || "Erreur lors de l'annulation"),
  });

  // Mutation pour créer une expédition et assigner un chauffeur
  const assignDriverMutation = useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: number; driverId: number }) => {
      // Étape 1 : Créer l'expédition
      const shipmentResponse = await fetch("/api/orders/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, sellerUserId: userId, driverId }),
      });
      if (!shipmentResponse.ok) throw new Error("Erreur lors de la création de l'expédition");
      const shipmentData = await shipmentResponse.json();

      // Étape 2 : Assigner le chauffeur
      const shipmentId = shipmentData.data.id; // Supposons que l'ID est retourné
      const assignResponse = await fetch("/api/orders/assign-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId, driverId, sellerUserId: userId }),
      });
      if (!assignResponse.ok) throw new Error("Erreur lors de l'assignation du chauffeur");
      return assignResponse.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders", userId] });
      toast.success("Chauffeur assigné avec succès");
    },
    onError: (error) => toast.error(error.message || "Erreur lors de l'assignation du chauffeur"),
  });

  // Fonction pour rafraîchir avec de nouveaux filtres/pagination
  const refetchWithParams = (newFilters?: OrderFiltersBase, newPagination?: OrderPagination, p0?: { column: string; direction: string; }) => {
    const updatedFilters = { ...defaultFilters, ...newFilters };
    const updatedPagination = { ...defaultPagination, ...newPagination };
    queryClient.invalidateQueries({
      queryKey: ["orders", userId, updatedFilters, updatedPagination],
    });
    ordersQuery.refetch();
  };

  return {
    orders: ordersQuery.data?.orders,
    total: ordersQuery.data?.total,
    page: ordersQuery.data?.page,
    totalPages: ordersQuery.data?.total_pages,
    stats: ordersQuery.data?.stats,
    isLoading: ordersQuery.isLoading,
    refetchWithParams,
    updateOrderStatus: updateStatusMutation.mutate,
    cancelOrder: cancelOrderMutation.mutate,
    assignDriver: assignDriverMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    isCancelling: cancelOrderMutation.isPending,
    isAssigningDriver: assignDriverMutation.isPending,
  };
}