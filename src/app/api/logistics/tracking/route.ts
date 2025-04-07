import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import logisticsService, { TrackingInsert } from "@/services/logistics.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";
import { db } from "@/lib/db";
import { shipments, storeOrders, stores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
    const callerRole = user.role === "store" ? "store" : user.role === "admin" ? "admin" : null;

    if (!callerRole || !["store", "admin", "manager"].includes(callerRole)) {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Seul un vendeur ou un admin peut ajouter un suivi"
      );
    }

    const body = await req.json();
    const { trackingData } = body;

    if (!trackingData || !trackingData.shipmentId) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "trackingData avec shipmentId est requis"
      );
    }

    const trackingInsert: TrackingInsert = {
      shipmentId: trackingData.shipmentId,
      latitude: trackingData.latitude,
      longitude: trackingData.longitude,
    };

    // Validation des champs
    if (typeof trackingInsert.shipmentId !== "number") {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "shipmentId doit être un nombre"
      );
    }
    if (typeof trackingInsert.latitude !== "number" || typeof trackingInsert.longitude !== "number") {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "latitude et longitude doivent être des nombres"
      );
    }

    // Si le rôle est "store", vérifier que l’expédition appartient au vendeur
    if (callerRole === "store") {
      const [shipment] = await db
        .select({
          storeId: storeOrders.storeId,
          isManagedByStore: shipments.isManagedByStore,
        })
        .from(shipments)
        .leftJoin(storeOrders, eq(shipments.storeOrderId, storeOrders.id))
        .where(eq(shipments.id, trackingInsert.shipmentId))
        .limit(1);

      if (!shipment) {
        throw new ServiceError(
          ERROR_CODES.NOT_FOUND,
          `Expédition ${trackingInsert.shipmentId} non trouvée`
        );
      }

      if (!shipment.isManagedByStore) {
        throw new ServiceError(
          ERROR_CODES.AUTHORIZATION_ERROR,
          "Le vendeur ne peut tracker que les expéditions qu'il gère"
        );
      }

      const [store] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.userId, callerUserId))
        .limit(1);

      if (!store || shipment.storeId !== store.id) {
        throw new ServiceError(
          ERROR_CODES.AUTHORIZATION_ERROR,
          "Vous n'êtes pas autorisé à tracker cette expédition (elle n'appartient pas à votre magasin)"
        );
      }
    }

    const result = await logisticsService.addTracking(trackingInsert, callerUserId);
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