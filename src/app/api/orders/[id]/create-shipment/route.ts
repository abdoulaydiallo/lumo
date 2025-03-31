import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sellerCreateShipment } from "@/features/orders/api/actions";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await getUser();
    if (!user || user.role !== "store") {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Seul un vendeur peut créer une expédition");
    }
    const sellerUserId = user.id;

    const { orderId, driverId } = await req.json();
    if (!orderId || (driverId && driverId <= 0)) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "orderId ou driverId invalide");
    }

    const result = await sellerCreateShipment(orderId, sellerUserId, driverId);
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