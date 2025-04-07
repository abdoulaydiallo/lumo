import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import logisticsService, { ShipmentInsert } from "@/services/logistics.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }
    const callerUserId = user.id;

    if (user.role !== "store") {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Seul un vendeur (rôle 'store') peut créer une expédition"
      );
    }

    const body = await req.json();
    const { orderId, shipmentData } = body;

    if (!orderId || typeof orderId !== "number" || !shipmentData) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "orderId (nombre) et shipmentData sont requis"
      );
    }

    const shipmentInsert: ShipmentInsert = {
      storeOrderId: shipmentData.storeOrderId,
      driverId: shipmentData.driverId,
      priorityLevel: shipmentData.priorityLevel,
      deliveryNotes: shipmentData.deliveryNotes,
    };

    if (!shipmentInsert.storeOrderId || typeof shipmentInsert.storeOrderId !== "number") {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "storeOrderId est requis et doit être un nombre"
      );
    }
    if (shipmentInsert.driverId && typeof shipmentInsert.driverId !== "number") {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "driverId doit être un nombre si fourni"
      );
    }
    if (
      shipmentInsert.priorityLevel &&
      !["low", "normal", "high"].includes(shipmentInsert.priorityLevel)
    ) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "priorityLevel doit être 'low', 'normal' ou 'high' si fourni"
      );
    }

    const result = await logisticsService.sellerCreateShipment(orderId, shipmentInsert, callerUserId);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
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