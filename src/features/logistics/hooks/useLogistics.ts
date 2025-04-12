"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShipmentInsert,
  ShipmentUpdate,
  TrackingInsert,
} from "@/services/logistics.service";

export function useLogistics(userId: number, role: "store" | "admin" | "manager" | "driver", orderId?: number) {
  const queryClient = useQueryClient();

  // Requête pour récupérer les expéditions d'une commande
  const shipmentsQuery = useQuery({
    queryKey: ["shipments", userId, role, orderId],
    queryFn: async (): Promise<any> => {
      if (!orderId) throw new Error("orderId est requis pour récupérer les expéditions");
      const response = await fetch(`/api/logistics/shipments/list?orderId=${orderId}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la récupération des expéditions");
      }
      const data = await response.json();
      return data.data;
    },
    enabled: !!userId && !!orderId && (role === "store" || role === "admin"),
  });

  // Requête pour récupérer les livreurs disponibles
  const driversQuery = useQuery({
    queryKey: ["drivers", userId, role],
    queryFn: async (): Promise<any> => {
      const response = await fetch("/api/logistics/drivers", {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la récupération des livreurs");
      }
      const data = await response.json();
      return data.data;
    },
    enabled: !!userId && (role === "store" || role === "admin"),
  });

  // Mutation pour créer une expédition (vendeur uniquement)
  const createShipmentMutation = useMutation({
    mutationFn: async ({
      orderId,
      shipmentData,
    }: {
      orderId: number;
      shipmentData: ShipmentInsert;
    }) => {
      if (role !== "store") throw new Error("Seul un vendeur peut créer une expédition");
      const response = await fetch("/api/logistics/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, shipmentData }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la création de l'expédition");
      }
      const data = await response.json();
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shipments", userId, role] });
      toast.success("Expédition créée avec succès");
      return data;
    },
    onError: (error) => toast.error(error.message || "Erreur lors de la création de l'expédition"),
  });

  // Mutation pour mettre à jour une expédition (vendeur ou admin)
  const updateShipmentMutation = useMutation({
    mutationFn: async (shipmentData: ShipmentUpdate) => {
      const response = await fetch("/api/logistics/shipments/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentData }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la mise à jour de l'expédition");
      }
      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments", userId, role] });
      toast.success("Expédition mise à jour avec succès");
    },
    onError: (error) => toast.error(error.message || "Erreur lors de la mise à jour de l'expédition"),
  });

  // Mutation pour assigner un livreur (vendeur ou admin)
  const assignDriverMutation = useMutation({
    mutationFn: async ({ shipmentId, driverId }: { shipmentId: number; driverId: number }) => {
      const response = await fetch("/api/logistics/shipments/assign-driver", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId, driverId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de l'assignation du livreur");
      }
      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments", userId, role] });
      toast.success("Livreur assigné avec succès");
    },
    onError: (error) => toast.error(error.message || "Erreur lors de l'assignation du livreur"),
  });

  // Mutation pour ajouter un suivi (vendeur ou admin)
  const addTrackingMutation = useMutation({
    mutationFn: async (trackingData: TrackingInsert) => {
      const response = await fetch("/api/logistics/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingData }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de l'ajout du suivi");
      }
      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments", userId, role] });
      toast.success("Suivi ajouté avec succès");
    },
    onError: (error) => toast.error(error.message || "Erreur lors de l'ajout du suivi"),
  });

  // Fonction pour rafraîchir les expéditions avec un nouvel orderId
  const refetchWithOrderId = (newOrderId: number) => {
    queryClient.invalidateQueries({ queryKey: ["shipments", userId, role, newOrderId] });
    shipmentsQuery.refetch();
  };

  return {
    shipments: shipmentsQuery.data,
    drivers: driversQuery.data,
    isLoadingShipments: shipmentsQuery.isLoading,
    isLoadingDrivers: driversQuery.isLoading,
    createShipment: createShipmentMutation.mutateAsync,
    updateShipment: updateShipmentMutation.mutateAsync,
    assignDriver: assignDriverMutation.mutateAsync,
    addTracking: addTrackingMutation.mutateAsync,
    refetchWithOrderId,
    isCreating: createShipmentMutation.isPending,
    isUpdating: updateShipmentMutation.isPending,
    isAssigning: assignDriverMutation.isPending,
    isTracking: addTrackingMutation.isPending,
  };
}