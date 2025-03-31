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
  request: NextRequest, // Premier paramètre
  { params }: { params: Promise<{ id: string }> } // Deuxième paramètre avec Promise
): Promise<NextResponse<ApiResponse<any>>> {
  const resolvedParams = await params; // Résolution de la Promise
  const orderId = parseInt(resolvedParams.id, 10); // Accès à id après résolution

  try {
    const user = await getUser();

    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }

    if (isNaN(orderId) || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "ID de commande invalide");
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Commande avec l'ID ${orderId} non trouvée`);
    }

    if (order.userId !== user.id && !["admin", "manager"].includes(user.role)) {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Vous n'êtes pas autorisé à voir cette commande"
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { success: false, error: error.toJSON() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Erreur serveur",
          details: error instanceof Error ? { message: error.message } : { message: "Erreur inconnue" }
        }
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest, // Premier paramètre
  { params }: { params: Promise<{ id: string }> } // Deuxième paramètre avec Promise
): Promise<NextResponse<ApiResponse<any>>> {
  const resolvedParams = await params; // Résolution de la Promise
  const orderId = parseInt(resolvedParams.id, 10); // Accès à id après résolution

  try {
    const user = await getUser();

    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }

    if (isNaN(orderId) || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "ID de commande invalide");
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Commande avec l'ID ${orderId} non trouvée`);
    }

    if (order.userId !== user.id && !["admin", "manager"].includes(user.role)) {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Vous n'êtes pas autorisé à supprimer cette commande"
      );
    }

    const result = await orderService.cancelOrder(orderId, user.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { success: false, error: error.toJSON() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Erreur serveur",
          details: error instanceof Error ? { message: error.message } : { message: "Erreur inconnue" }
        }
      },
      { status: 500 }
    );
  }
}