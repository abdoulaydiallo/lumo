// src/app/api/shipments/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { searchShipments, ShipmentFilters, ShipmentSearchResult } from "@/algorithms/shipments.search";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";
import { shipmentStatuses } from "@/lib/db/schema";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<ShipmentSearchResult>>> {
  try {
    // Vérification de l'utilisateur
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }

    // Restriction d'accès basée sur le rôle
    if (!["store", "driver", "admin", "manager"].includes(user.role)) {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Accès réservé aux rôles 'store', 'driver', 'admin' ou 'manager'"
      );
    }

    // Extraction des paramètres de recherche
    const { searchParams } = new URL(req.url);

    // Construction des filtres à partir des searchParams
    const filters: ShipmentFilters = {
      status: searchParams
        .get("status")
        ?.split(",")
        .filter((s) => shipmentStatuses.enumValues.includes(s as any)) as ShipmentFilters["status"],
      driverId: searchParams.get("driverId") && !isNaN(parseInt(searchParams.get("driverId")!))
        ? parseInt(searchParams.get("driverId")!)
        : undefined,
      priorityLevel: searchParams
        .get("priorityLevel")
        ?.split(",")
        .filter((p) => ["normal", "urgent", "high"].includes(p)) as ShipmentFilters["priorityLevel"], // Ajustez selon vos valeurs valides
      dateRange:
        searchParams.get("startDate") && searchParams.get("endDate")
          ? {
              start: new Date(searchParams.get("startDate")!),
              end: new Date(searchParams.get("endDate")!),
            }
          : undefined,
      storeId: searchParams.get("storeId") && !isNaN(parseInt(searchParams.get("storeId")!))
        ? parseInt(searchParams.get("storeId")!)
        : undefined,
      minEstimatedDeliveryTime:
        searchParams.get("minEstimatedDeliveryTime") &&
        !isNaN(parseFloat(searchParams.get("minEstimatedDeliveryTime")!))
          ? parseFloat(searchParams.get("minEstimatedDeliveryTime")!)
          : undefined,
      maxEstimatedDeliveryTime:
        searchParams.get("maxEstimatedDeliveryTime") &&
        !isNaN(parseFloat(searchParams.get("maxEstimatedDeliveryTime")!))
          ? parseFloat(searchParams.get("maxEstimatedDeliveryTime")!)
          : undefined,
      hasSupportTicket:
        searchParams.get("hasSupportTicket") === "true"
          ? true
          : searchParams.get("hasSupportTicket") === "false"
          ? false
          : undefined,
    };

    // Validation des filtres
    if (
      filters.dateRange &&
      (isNaN(filters.dateRange.start.getTime()) || isNaN(filters.dateRange.end.getTime()))
    ) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Plage de dates invalide dans dateRange");
    }

    if (
      (filters.minEstimatedDeliveryTime !== undefined && filters.minEstimatedDeliveryTime < 0) ||
      (filters.maxEstimatedDeliveryTime !== undefined && filters.maxEstimatedDeliveryTime < 0) ||
      (filters.minEstimatedDeliveryTime !== undefined &&
        filters.maxEstimatedDeliveryTime !== undefined &&
        filters.minEstimatedDeliveryTime > filters.maxEstimatedDeliveryTime)
    ) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "Les paramètres de temps estimé de livraison doivent être positifs et cohérents"
      );
    }

    // Construction de la pagination
    const pagination = {
      page: Math.max(1, Number(searchParams.get("page") || 1)), // Minimum 1
      perPage: Math.min(100, Math.max(1, Number(searchParams.get("perPage") || 10))), // Entre 1 et 100, défaut 10
    };

    // Appel à l'algorithme searchShipments avec les paramètres validés
    const result = await searchShipments(user.id, { filters, pagination });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.toJSON() }, { status: 400 });
    }
    const internalError = new ServiceError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Erreur serveur inattendue",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
    return NextResponse.json({ success: false, error: internalError.toJSON() }, { status: 500 });
  }
}

export const dynamic = "force-dynamic"; 