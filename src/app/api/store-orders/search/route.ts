// src/app/api/store-orders/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getInitialStoreOrders } from "@/features/store-orders/api/queries";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: any } };

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }
    if (user.role !== "store") {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Réservé aux vendeurs");
    }

    const { searchParams } = new URL(req.url);
    const result = await getInitialStoreOrders(user.id, user.role, {
      status: searchParams.get("status") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
      paymentMethod: searchParams.get("paymentMethod") || undefined,
      shipmentStatus: searchParams.get("shipmentStatus") || undefined,
      startDate: searchParams.get("dateStart") || undefined,
      endDate: searchParams.get("dateEnd") || undefined,
      paymentStartDate: searchParams.get("paymentDateStart") || undefined,
      paymentEndDate: searchParams.get("paymentDateEnd") || undefined,
      minAmount: searchParams.get("minAmount") || undefined,
      maxAmount: searchParams.get("maxAmount") || undefined,
      page: searchParams.get("page") || undefined,
      perPage: searchParams.get("perPage") || undefined,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.toJSON() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
    const internalError = new ServiceError(ERROR_CODES.INTERNAL_SERVER_ERROR, message);
    return NextResponse.json({ success: false, error: internalError.toJSON() }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";