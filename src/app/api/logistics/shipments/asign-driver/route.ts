import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import logisticsService from "@/services/logistics.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
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
        "Seul un vendeur ou un admin peut assigner un livreur"
      );
    }

    const body = await req.json();
    const { shipmentId, driverId } = body;

    if (!shipmentId || typeof shipmentId !== "number" || !driverId || typeof driverId !== "number") {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "shipmentId et driverId sont requis et doivent être des nombres"
      );
    }

    const result = await logisticsService.assignDriver(shipmentId, driverId, callerUserId, callerRole);
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