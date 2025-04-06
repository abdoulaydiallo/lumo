import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import orderService, {
  OrderInsert,
  OrderItemInsert,
  DeliveryEstimate,
  validOrderStatuses,
  validPaymentMethods,
  validPaymentStatuses,
} from "@/services/orders.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";
import { searchOrders, OrderFiltersBase, OrderPagination, OrderSearchResult } from "@/lib/db/orders.search";

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
    const { orderData, items, deliveryEstimates } = body;

    if (!orderData || !items || !Array.isArray(items) || !deliveryEstimates || !Array.isArray(deliveryEstimates)) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "orderData, items (tableau) et deliveryEstimates (tableau) sont requis"
      );
    }

    const orderDataWithUserId: OrderInsert = {
      userId: callerUserId,
      paymentMethod: "",
      paymentAmount: 0,
      ...orderData,
    };

    // Validation stricte des champs requis
    if (!orderDataWithUserId.paymentMethod || !validPaymentMethods.includes(orderDataWithUserId.paymentMethod)) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        `paymentMethod invalide. Valeurs attendues: ${validPaymentMethods.join(", ")}`
      );
    }
    if (typeof orderDataWithUserId.paymentAmount !== "number" || orderDataWithUserId.paymentAmount < 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "paymentAmount doit être un nombre positif");
    }
    if (orderDataWithUserId.userId !== callerUserId && user.role !== "admin") {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        "Seul un admin peut créer une commande pour un autre utilisateur"
      );
    }
    if (!orderDataWithUserId.destinationAddressId || typeof orderDataWithUserId.destinationAddressId !== "number") {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "destinationAddressId est requis et doit être un nombre");
    }

    // Validation des items
    for (const item of items) {
      if (
        !item.productId ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0 ||
        typeof item.price !== "number" ||
        item.price < 0 ||
        !item.storeId ||
        typeof item.storeId !== "number"
      ) {
        throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, `Item invalide: ${JSON.stringify(item)}`);
      }
      if (item.variantId && (typeof item.variantId !== "number" || item.variantId <= 0)) {
        throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, `variantId invalide: ${JSON.stringify(item)}`);
      }
    }

    // Validation des deliveryEstimates
    const storeIdsFromItems = new Set(items.map((item: OrderItemInsert) => item.storeId));
    for (const estimate of deliveryEstimates) {
      if (
        !estimate.storeId ||
        typeof estimate.fee !== "number" ||
        estimate.fee < 0 ||
        !estimate.deliveryType ||
        typeof estimate.estimatedDeliveryDays !== "number" ||
        estimate.estimatedDeliveryDays <= 0
      ) {
        throw new ServiceError(
          ERROR_CODES.VALIDATION_ERROR,
          `Estimation de livraison invalide: ${JSON.stringify(estimate)}`
        );
      }
      if (!storeIdsFromItems.has(estimate.storeId)) {
        throw new ServiceError(
          ERROR_CODES.VALIDATION_ERROR,
          `Estimation de livraison pour un storeId non présent dans les items: ${estimate.storeId}`
        );
      }
    }
    if (storeIdsFromItems.size !== deliveryEstimates.length) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "Le nombre de deliveryEstimates doit correspondre au nombre de magasins dans les items"
      );
    }

    const result = await orderService.createOrder(
      orderDataWithUserId,
      items as OrderItemInsert[],
      callerUserId,
      deliveryEstimates as DeliveryEstimate[]
    );
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

    const { searchParams } = new URL(req.url);
    const filters: OrderFiltersBase = {
      status: searchParams
        .get("status")
        ?.split(",")
        .filter((s) => validOrderStatuses.includes(s as any)) as OrderFiltersBase["status"],
      payment_status: searchParams
        .get("payment_status")
        ?.split(",")
        .filter((s) => validPaymentStatuses.includes(s as any)) as OrderFiltersBase["payment_status"],
      date_range: searchParams.has("date_start") && searchParams.has("date_end")
        ? {
            start: new Date(searchParams.get("date_start")!),
            end: new Date(searchParams.get("date_end")!),
          }
        : undefined,
      min_amount: searchParams.has("min_amount") ? Number(searchParams.get("min_amount")) : undefined,
      max_amount: searchParams.has("max_amount") ? Number(searchParams.get("max_amount")) : undefined,
      payment_method: searchParams
        .get("payment_method")
        ?.split(",")
        .filter((method) => validPaymentMethods.includes(method as any)) as OrderFiltersBase["payment_method"],
    };

    const pagination: OrderPagination = {
      page: Math.max(1, Number(searchParams.get("page") || 1)),
      per_page: Math.min(100, Math.max(1, Number(searchParams.get("per_page") || 20))),
    };

    // Validation des filtres
    if (filters.date_range && (isNaN(filters.date_range.start.getTime()) || isNaN(filters.date_range.end.getTime()))) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Plage de dates invalide");
    }
    if ((filters.min_amount && filters.min_amount < 0) || (filters.max_amount && filters.max_amount < 0)) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Montants minimum/maximum invalides");
    }

    if (user.role !== "store") {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Seul un utilisateur avec le rôle 'store' peut effectuer cette action");
    }
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