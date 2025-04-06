// hooks/useDeliveryEstimation.ts
'use client';

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner"; // Corrigé "sonner" en "sonner"
import { DeliveryFeeEstimate } from "@/services/delivery.service";

/**
 * Paramètres pour l’estimation des frais de livraison.
 * @typedef {Object} DeliveryEstimationParams
 * @property {number} destinationAddressId - Identifiant de l’adresse de livraison.
 * @property {string} [deliveryType] - Type de livraison (STANDARD ou EXPRESS), optionnel.
 * @property {string} [vehicleType] - Type de véhicule (MOTO, CAR, TRUCK), optionnel.
 */
interface DeliveryEstimationParams {
  destinationAddressId: number;
  deliveryType?: string;
  vehicleType?: string;
}

/**
 * Option de livraison retournée par l’API /api/delivery/options.
 * @typedef {Object} DeliveryOption
 * @property {number} id - Identifiant de la règle de livraison.
 * @property {string} deliveryType - Type de livraison (STANDARD, EXPRESS).
 * @property {string|null} vehicleType - Type de véhicule (MOTO, CAR, TRUCK) ou null.
 * @property {number} weightMax - Poids maximum autorisé (en grammes).
 * @property {number} distanceMax - Distance maximum autorisée (en km).
 * @property {number} baseFee - Frais de base en GNF.
 * @property {number} estimatedDeliveryDays - Délai estimé en jours.
 * @property {string} currency - Devise (GNF).
 * @property {string} deliveryTypeLabel - Libellé lisible du type de livraison.
 * @property {string} vehicleTypeLabel - Libellé lisible du type de véhicule.
 */
export interface DeliveryOption {
  id: number;
  deliveryType: string;
  vehicleType: string | null;
  weightMax: number;
  distanceMax: number;
  baseFee: number;
  estimatedDeliveryDays: number;
  currency: string;
  deliveryTypeLabel: string;
  vehicleTypeLabel: string;
}

/**
 * Récupère les options de livraison depuis l’API avec mise en cache.
 * @param {number} destinationAddressId - Identifiant de l’adresse de livraison.
 * @returns {Promise<DeliveryOption[]>} - Tableau des options de livraison.
 * @throws {Error} - Si la requête échoue ou retourne une erreur.
 */
const fetchDeliveryOptions = async (destinationAddressId: number): Promise<DeliveryOption[]> => {
  const response = await fetch('/api/delivery/options', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ destinationAddressId }),
  });

  const result: { success: boolean; data: DeliveryOption[]; error?: { message: string } } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || "Erreur lors de la récupération des options de livraison");
  }

  return result.data;
};

/**
 * Hook personnalisé pour gérer l’estimation des frais de livraison et les options disponibles avec cache.
 * @returns {Object} - Fonctions et états pour estimer les frais et récupérer les options de livraison.
 */
export function useDeliveryEstimation() {
  // Mutation pour estimer les frais de livraison
  const estimateMutationFn = async (params: DeliveryEstimationParams): Promise<DeliveryFeeEstimate[]> => {
    const response = await fetch('/api/delivery/estimate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destinationAddressId: params.destinationAddressId,
        deliveryType: params.deliveryType,
        vehicleType: params.vehicleType,
      }),
    });

    const result: { success: boolean; data: DeliveryFeeEstimate[]; error?: { message: string } } = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || "Erreur lors de l'estimation des frais de livraison");
    }

    return result.data;
  };

  const estimateMutation = useMutation({
    mutationFn: estimateMutationFn,
    onSuccess: (data) => {
      toast.success(`Estimation des frais de livraison effectuée pour ${data.length} vendeur(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'estimation des frais de livraison");
    },
  });

  // Query pour récupérer les options de livraison avec cache
  const getOptionsQuery = (destinationAddressId?: number) =>
    useQuery({
      queryKey: ['deliveryOptions', destinationAddressId],
      queryFn: () => fetchDeliveryOptions(destinationAddressId!),
      enabled: !!destinationAddressId, // Ne s’exécute que si destinationAddressId est défini
      staleTime: 1000 * 60 * 60, // Cache valide pendant 1 heure
    });

  return {
    /**
     * Lance l’estimation des frais de livraison de manière synchrone.
     * @param {DeliveryEstimationParams} params - Paramètres pour l’estimation.
     */
    estimateDelivery: estimateMutation.mutate,

    /**
     * Lance l’estimation des frais de livraison de manière asynchrone (retourne une promesse).
     * @param {DeliveryEstimationParams} params - Paramètres pour l’estimation.
     * @returns {Promise<DeliveryFeeEstimate[]>} - Tableau des estimations.
     */
    estimateDeliveryAsync: estimateMutation.mutateAsync,

    /**
     * Indique si une estimation est en cours.
     * @type {boolean}
     */
    isEstimating: estimateMutation.isPending,

    /**
     * Résultat de l’estimation (tableau des estimations par vendeur).
     * @type {DeliveryFeeEstimate[] | undefined}
     */
    estimation: estimateMutation.data,

    /**
     * Erreur survenue lors de l’estimation, si applicable.
     * @type {Error | null}
     */
    estimateError: estimateMutation.error,

    /**
     * Réinitialise l’état de l’estimation.
     */
    resetEstimation: estimateMutation.reset,

    /**
     * Récupère les options de livraison avec mise en cache.
     * @param {number} destinationAddressId - Identifiant de l’adresse de livraison.
     * @returns {Object} - État de la requête des options (données, chargement, erreur).
     */
    useDeliveryOptions: (destinationAddressId?: number) => {
      const query = getOptionsQuery(destinationAddressId);
      return {
        deliveryOptions: query.data,
        isFetchingOptions: query.isLoading,
        optionsError: query.error as Error | null,
        refetchOptions: query.refetch,
        onSuccess: () => {
          if (query.data) {
            toast.success(`Options de livraison récupérées (${(query.data as DeliveryOption[]).length} disponibles)`);
          }
        },
      };
    },
  };
}