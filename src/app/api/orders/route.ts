import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import orderService, { OrderInsert, OrderItemInsert } from "@/services/orders.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";
import { searchOrders, 
  OrderFiltersBase,
  OrderPagination,
  OrderSearchResult
} from "@/lib/db/orders.search";

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

    const body = await req.json();
    const { orderData, items } = body;

    if (!orderData || !items) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "orderData et items sont requis"
      );
    }

    const orderDataWithUserId: OrderInsert = {
      ...orderData,
      userId: orderData.userId || callerUserId,
    };
    if (orderDataWithUserId.userId !== callerUserId && user.role !== "admin") {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Vous ne pouvez créer une commande que pour vous-même, sauf si vous êtes admin"
      );
    }

    const result = await orderService.createOrder(orderDataWithUserId, items as OrderItemInsert[], callerUserId);
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

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<OrderSearchResult>>> {
  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }

    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(req.url);
    const filters: OrderFiltersBase = {
      status: searchParams.get("status")?.split(",") as OrderFiltersBase["status"],
      payment_status: searchParams.get("payment_status")?.split(",") as OrderFiltersBase["payment_status"],
      date_range: searchParams.has("date_start") && searchParams.has("date_end") ? {
        start: new Date(searchParams.get("date_start")!),
        end: new Date(searchParams.get("date_end")!),
      } : undefined,
      min_amount: searchParams.has("min_amount") ? Number(searchParams.get("min_amount")) : undefined,
      max_amount: searchParams.has("max_amount") ? Number(searchParams.get("max_amount")) : undefined,
      payment_method: undefined
    };
    const pagination: OrderPagination = {
      page: Number(searchParams.get("page")) || 1,
      per_page: Number(searchParams.get("per_page")) || 20,
    };

    const result = await searchOrders(user.id, user.role, { filters, pagination });
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