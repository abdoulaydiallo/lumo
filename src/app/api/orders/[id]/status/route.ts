import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import orderService, { ValidOrderStatus } from "@/services/orders.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }
    const callerUserId = user.id;

    // Seuls les managers ou admins peuvent mettre à jour le statut
    if (!["manager", "admin"].includes(user.role)) {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Seuls les managers ou admins peuvent mettre à jour le statut d'une commande"
      );
    }

    const orderId = parseInt(params.id, 10);
    const body = await req.json();
    const { status } = body;

    if (isNaN(orderId) || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "ID de commande invalide");
    }
    if (!status || typeof status !== "string") {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Statut invalide ou manquant");
    }

    const result = await orderService.updateOrderStatus(orderId, status as ValidOrderStatus, callerUserId);
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