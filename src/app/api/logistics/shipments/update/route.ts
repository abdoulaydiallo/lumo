import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import logisticsService, { ShipmentUpdate } from "@/services/logistics.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";
import { validShipmentStatuses } from "@/services/orders.service";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

export async function PUT(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }
    const callerUserId = user.id;
    const callerRole = user.role === "store" ? "store" : user.role === "admin" ? "admin" : null;

    if (!callerRole || !["store", "admin"].includes(callerRole)) {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Seul un vendeur ou un admin peut mettre à jour une expédition"
      );
    }

    const body = await req.json();
    const { shipmentData } = body;

    if (!shipmentData || !shipmentData.shipmentId) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "shipmentData avec shipmentId est requis"
      );
    }

    const shipmentUpdate: ShipmentUpdate = {
      shipmentId: shipmentData.shipmentId,
      status: shipmentData.status,
      driverId: shipmentData.driverId,
      deliveryNotes: shipmentData.deliveryNotes,
      priorityLevel: shipmentData.priorityLevel,
    };

    if (typeof shipmentUpdate.shipmentId !== "number") {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "shipmentId doit être un nombre"
      );
    }
    if (shipmentUpdate.status && !validShipmentStatuses.includes(shipmentUpdate.status)) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        `Statut invalide. Valeurs attendues: ${validShipmentStatuses.join(", ")}`
      );
    }
    if (shipmentUpdate.driverId && typeof shipmentUpdate.driverId !== "number") {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "driverId doit être un nombre si fourni"
      );
    }
    if (
      shipmentUpdate.priorityLevel &&
      !["low", "normal", "high"].includes(shipmentUpdate.priorityLevel)
    ) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "priorityLevel doit être 'low', 'normal' ou 'high' si fourni"
      );
    }

    const result = await logisticsService.updateShipment(shipmentUpdate, callerUserId, callerRole);
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