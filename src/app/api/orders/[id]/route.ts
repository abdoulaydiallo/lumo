import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import orderService from "@/services/orders.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }
    const callerUserId = user.id;

    const orderId = parseInt(params.id, 10);
    if (isNaN(orderId) || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "ID de commande invalide");
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Commande avec l'ID ${orderId} non trouvée`);
    }

    // Vérifier que l'utilisateur a le droit de voir cette commande
    if (order.userId !== callerUserId && !["admin", "manager"].includes(user.role)) {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Vous n'êtes pas autorisé à voir cette commande"
      );
    }

    return NextResponse.json({ success: true, data: order }, { status: 200 });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }
    const callerUserId = user.id;

    const orderId = parseInt(params.id, 10);
    if (isNaN(orderId) || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "ID de commande invalide");
    }

    // Vérifier que l'utilisateur a le droit d'annuler cette commande
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Commande avec l'ID ${orderId} non trouvée`);
    }
    if (order.userId !== callerUserId && !["admin", "manager"].includes(user.role)) {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Vous n'êtes pas autorisé à annuler cette commande"
      );
    }

    const result = await orderService.cancelOrder(orderId, callerUserId);
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