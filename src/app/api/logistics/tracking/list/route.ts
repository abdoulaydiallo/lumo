import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import logisticsService from "@/services/logistics.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
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
        "Seul un vendeur ou un admin peut récupérer les expéditions"
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = Number(searchParams.get("orderId"));

    if (!orderId || isNaN(orderId)) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "orderId est requis et doit être un nombre"
      );
    }

    const result = await logisticsService.getShipments(orderId, callerUserId, callerRole);
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