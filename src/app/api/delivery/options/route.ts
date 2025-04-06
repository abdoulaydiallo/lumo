// app/api/delivery/options/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDeliveryOptions } from "@/services/delivery.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

/**
 * Réponse standard de l’API, soit un succès avec des données, soit une erreur.
 * @template T - Type des données retournées en cas de succès.
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indique si la requête a réussi.
 * @property {T} [data] - Données retournées en cas de succès.
 * @property {ReturnType<ServiceError["toJSON"]>} [error] - Détails de l’erreur en cas d’échec.
 */
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

/**
 * Corps attendu pour la requête POST des options de livraison.
 * @typedef {Object} OptionsRequestBody
 * @property {number} destinationAddressId - Identifiant de l’adresse de livraison.
 */
interface OptionsRequestBody {
  destinationAddressId: number;
}

/**
 * Interface pour une option de livraison retournée par l’API.
 * @typedef {Object} DeliveryOption
 * @property {number} id - Identifiant de la règle de livraison.
 * @property {string} deliveryType - Type de livraison (STANDARD, EXPRESS).
 * @property {string|null} vehicleType - Type de véhicule (MOTO, CAR, TRUCK) ou null.
 * @property {number} weightMax - Poids maximum autorisé (en grammes).
 * @property {number} distanceMax - Distance maximum autorisée (en km).
 * @property {number} baseFee - Frais de base en GNF.
 * @property {number} estimatedDeliveryDays - Délai estimé en jours.
 * @property {string} currency - Devise (GNF pour Guinée).
 * @property {string} deliveryTypeLabel - Libellé lisible du type de livraison.
 * @property {string} vehicleTypeLabel - Libellé lisible du type de véhicule.
 */
interface DeliveryOption {
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
 * Gère la requête POST pour récupérer les options de livraison disponibles.
 * @route POST /api/delivery/options
 * @param {NextRequest} req - Requête HTTP entrante.
 * @returns {Promise<NextResponse<ApiResponse<DeliveryOption[]>>>} - Réponse JSON avec les options ou une erreur.
 * @throws {ServiceError} - En cas d’erreur d’authentification, de validation ou de traitement.
 * 
 * @example
 * // Requête valide
 * POST /api/delivery/options
 * {
 *   "destinationAddressId": 123
 * }
 * 
 * // Réponse réussie
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "deliveryType": "STANDARD",
 *       "vehicleType": "MOTO",
 *       "weightMax": 5000,
 *       "distanceMax": 30,
 *       "baseFee": 3000,
 *       "estimatedDeliveryDays": 2,
 *       "currency": "GNF",
 *       "deliveryTypeLabel": "Livraison Standard",
 *       "vehicleTypeLabel": "Moto"
 *     },
 *     {
 *       "id": 2,
 *       "deliveryType": "EXPRESS",
 *       "vehicleType": "CAR",
 *       "weightMax": 10000,
 *       "distanceMax": 20,
 *       "baseFee": 5000,
 *       "estimatedDeliveryDays": 1,
 *       "currency": "GNF",
 *       "deliveryTypeLabel": "Livraison Express",
 *       "vehicleTypeLabel": "Voiture"
 *     }
 *   ]
 * }
 * 
 * // Réponse en cas d’erreur
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "destinationAddressId est requis et doit être un nombre",
 *     "details": {}
 *   }
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<DeliveryOption[]>>> {
  try {
    // Vérifier l’authentification de l’utilisateur
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }
    const callerUserId = user.id;

    // Récupérer et valider le corps de la requête
    const body: OptionsRequestBody = await req.json();
    const { destinationAddressId } = body;

    if (!destinationAddressId || typeof destinationAddressId !== "number") {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "destinationAddressId est requis et doit être un nombre"
      );
    }

    // Récupérer les options de livraison
    const options = await getDeliveryOptions(callerUserId, destinationAddressId);

    // Retourner une réponse réussie avec les options
    return NextResponse.json({ success: true, data: options }, { status: 200 });
  } catch (error: unknown) {
    // Gestion des erreurs spécifiques au service
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.toJSON() }, { status: error instanceof ServiceError ? 400 : 500 });
    }

    // Gestion des erreurs inattendues
    const internalError = new ServiceError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Erreur serveur inattendue",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
    return NextResponse.json({ success: false, error: internalError.toJSON() }, { status: 500 });
  }
}