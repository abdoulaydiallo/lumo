"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Address, AddressData } from "@/services/addresses.service";

// Types pour les filtres et la pagination
export interface AddressFilters {
  region?: string;
  recipient?: string;
}

export interface AddressPagination {
  page: number;
  per_page: number;
}

export interface AddressSearchResult {
  addresses: Address[];
  total: number;
  page: number;
  total_pages: number;
}

export function useAddresses(
  userId: number,
  initialFilters?: AddressFilters,
  initialPagination?: AddressPagination
) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AddressFilters>({
    region: undefined,
    recipient: undefined,
    ...initialFilters,
  });
  const [pagination, setPagination] = useState<AddressPagination>({
    page: initialPagination?.page || 1,
    per_page: initialPagination?.per_page || 10,
  });

  // Construire la query string avec gestion des valeurs vides
  const buildQueryString = (filters: AddressFilters, pagination: AddressPagination) => {
    const params = new URLSearchParams();
    if (filters.region?.trim()) params.set("region", filters.region);
    if (filters.recipient?.trim()) params.set("recipient", filters.recipient);
    params.set("page", String(pagination.page));
    params.set("per_page", String(pagination.per_page));
    return params.toString();
  };

  // Requête pour récupérer les adresses
  const addressesQuery = useQuery({
    queryKey: ["addresses", userId, filters, pagination],
    queryFn: async (): Promise<AddressSearchResult> => {
      const queryString = buildQueryString(filters, pagination);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10s

      try {
        const response = await fetch(`/api/addresses?${queryString}`, {
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `Erreur ${response.status}: Récupération échouée`
          );
        }

        const data = await response.json();
        if (!data.success || !data.data) {
          throw new Error("Format de réponse invalide");
        }
        return data.data as AddressSearchResult;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw new Error("Requête annulée : timeout");
        throw error;
      }
    },
    enabled: userId !== undefined && userId !== null,
    retry: 1, // Réessayer une fois en cas d'échec
  });

  // Mutation pour créer une adresse
  const createAddressMutation = useMutation({
    mutationFn: async (addressData: AddressData) => {
      const response = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addressData, userId }), // userId du hook prévaut
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Échec de la création");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      toast.success("Adresse créée avec succès");
      return data; // Retourne les données pour l'appelant
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Mutation pour mettre à jour une adresse
  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: number; updateData: Partial<AddressData> }) => {
      const response = await fetch(`/api/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Échec de la mise à jour");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      toast.success("Adresse mise à jour avec succès");
      return data;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Mutation pour supprimer une adresse
  const deleteAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/addresses/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Échec de la suppression");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      toast.success("Adresse supprimée avec succès");
      return data;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Rafraîchir avec nouveaux filtres/pagination
  const refetchWithParams = (newFilters?: AddressFilters, newPagination?: AddressPagination) => {
    const updatedFilters = { ...filters, ...newFilters };
    const updatedPagination = { ...pagination, ...newPagination };
    setFilters(updatedFilters);
    setPagination(updatedPagination);
    queryClient.invalidateQueries({
      queryKey: ["addresses", userId, updatedFilters, updatedPagination],
    });
    addressesQuery.refetch();
  };

  return {
    addresses: addressesQuery.data?.addresses ?? [],
    total: addressesQuery.data?.total ?? 0,
    page: addressesQuery.data?.page ?? 1,
    totalPages: addressesQuery.data?.total_pages ?? 1,
    isLoading: addressesQuery.isLoading,
    refetchWithParams,
    createAddress: createAddressMutation.mutate,
    updateAddress: updateAddressMutation.mutate,
    deleteAddress: deleteAddressMutation.mutate,
    isCreating: createAddressMutation.isPending,
    isUpdating: updateAddressMutation.isPending,
    isDeleting: deleteAddressMutation.isPending,
  };
}