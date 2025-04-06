// app/api/delivery/estimate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { DeliveryFeeEstimate, estimateDeliveryFee } from "@/services/delivery.service";
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
 * Corps attendu pour la requête POST d’estimation des frais de livraison.
 * @typedef {Object} EstimateRequestBody
 * @property {number} destinationAddressId - Identifiant de l’adresse de livraison.
 * @property {string} [deliveryType] - Type de livraison (STANDARD ou EXPRESS), optionnel.
 * @property {string} [vehicleType] - Type de véhicule (MOTO, CAR, TRUCK), optionnel.
 */
interface EstimateRequestBody {
  destinationAddressId: number;
  deliveryType?: string;
  vehicleType?: string;
}

/**
 * Gère la requête POST pour estimer les frais de livraison par vendeur.
 * @route POST /api/delivery/estimate
 * @param {NextRequest} req - Requête HTTP entrante.
 * @returns {Promise<NextResponse<ApiResponse<DeliveryFeeEstimate[]>>>} - Réponse JSON avec les estimations ou une erreur.
 * @throws {ServiceError} - En cas d’erreur d’authentification, de validation ou de traitement.
 * 
 * @example
 * // Requête valide
 * POST /api/delivery/estimate
 * {
 *   "destinationAddressId": 123,
 *   "deliveryType": "STANDARD",
 *   "vehicleType": "MOTO"
 * }
 * 
 * // Réponse réussie
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "storeId": 1,
 *       "fee": 5000,
 *       "ruleId": 3,
 *       "distance": 12,
 *       "breakdown": { ... }
 *     },
 *     ...
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
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<DeliveryFeeEstimate[]>>> {
  try {
    // Vérifier l’authentification de l’utilisateur
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }
    const callerUserId = user.id;

    // Récupérer et valider le corps de la requête
    const body: EstimateRequestBody = await req.json();
    const { destinationAddressId, deliveryType, vehicleType } = body;

    if (!destinationAddressId || typeof destinationAddressId !== "number") {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "destinationAddressId est requis et doit être un nombre"
      );
    }

    // Validation stricte des paramètres optionnels
    if (deliveryType && (typeof deliveryType !== "string" || !["STANDARD", "EXPRESS"].includes(deliveryType))) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "deliveryType doit être une chaîne valide (STANDARD ou EXPRESS)"
      );
    }

    if (vehicleType && (typeof vehicleType !== "string" || !["MOTO", "CAR", "TRUCK"].includes(vehicleType))) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "vehicleType doit être une chaîne valide (MOTO, CAR ou TRUCK)"
      );
    }

    // Calculer les frais de livraison pour chaque vendeur
    const result = await estimateDeliveryFee(
      callerUserId,
      destinationAddressId,
      deliveryType || "STANDARD", // Valeur par défaut si non fourni
      vehicleType
    );

    // Retourner une réponse réussie avec les estimations
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    // Gestion des erreurs spécifiques au service
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.toJSON() }, { status: error instanceof ServiceError && error.code === ERROR_CODES.AUTHORIZATION_ERROR ? 401 : 400 });
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