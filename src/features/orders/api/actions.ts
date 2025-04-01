"use server";

import orderService, {
  OrderInsert,
  OrderItemInsert,
  ValidOrderStatus,
  ValidPaymentStatus,
  ValidShipmentStatus,
  validOrderStatuses,
  validPaymentStatuses,
  validShipmentStatuses,
} from "@/services/orders.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

function validateParam<T>(param: any, validValues: readonly T[], paramName: string): T {
  if (!validValues.includes(param)) {
    throw new ServiceError(
      ERROR_CODES.VALIDATION_ERROR,
      `Valeur invalide pour ${paramName}: ${param}. Valeurs attendues: ${validValues.join(", ")}`
    );
  }
  return param;
}

function validateOrderData(orderData: OrderInsert) {
  if (!orderData.userId || typeof orderData.userId !== "number" || orderData.userId <= 0) {
    throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "userId invalide ou manquant");
  }
  if (orderData.paymentAmount !== undefined && orderData.paymentAmount < 0) {
    throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "totalAmount ne peut pas être négatif");
  }
}

function validateOrderItems(items: OrderItemInsert[]) {
  if (!Array.isArray(items) || !items.length) {
    throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "items doit être un tableau non vide");
  }
  for (const item of items) {
    if (!item.productId || item.quantity <= 0 || item.price < 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, `Item invalide: ${JSON.stringify(item)}`);
    }
  }
}

// Type de réponse standardisé
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

export async function createOrder(
  orderData: OrderInsert,
  items: OrderItemInsert[],
  callerUserId: number
): Promise<ActionResponse<any>> {
  try {
    validateOrderData(orderData);
    validateOrderItems(items);
    if (!callerUserId || callerUserId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "callerUserId invalide");
    }
    const result = await orderService.createOrder(orderData, items, callerUserId);
    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.toJSON() };
    }
    return {
      success: false,
      error: new ServiceError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        "Erreur serveur inattendue",
        { originalError: error instanceof Error ? error.message : String(error) }
      ).toJSON(),
    };
  }
}

export async function updateOrderStatus(
  orderId: number,
  status: ValidOrderStatus,
  callerUserId: number
): Promise<ActionResponse<any>> {
  try {
    if (!orderId || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "orderId invalide");
    }
    validateParam(status, validOrderStatuses, "status");
    if (!callerUserId || callerUserId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "callerUserId invalide");
    }
    const result = await orderService.updateOrderStatus(orderId, status, callerUserId);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.toJSON() };
    }
    return {
      success: false,
      error: new ServiceError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        "Erreur serveur inattendue",
        { originalError: error instanceof Error ? error.message : String(error) }
      ).toJSON(),
    };
  }
}

export async function updatePaymentStatus(
  orderId: number,
  status: ValidPaymentStatus,
  transactionId?: string,
  callerUserId?: number
): Promise<ActionResponse<any>> {
  try {
    if (!orderId || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "orderId invalide");
    }
    validateParam(status, validPaymentStatuses, "status");
    if (transactionId && typeof transactionId !== "string") {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "transactionId doit être une chaîne");
    }
    if (callerUserId && callerUserId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "callerUserId invalide");
    }
    const result = await orderService.updatePaymentStatus(orderId, status, transactionId, callerUserId);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.toJSON() };
    }
    return {
      success: false,
      error: new ServiceError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        "Erreur serveur inattendue",
       { originalError: error instanceof Error ? error.message : String(error) }
      ).toJSON(),
    };
  }
}

export async function cancelOrder(orderId: number, callerUserId: number): Promise<ActionResponse<any>> {
  try {
    if (!orderId || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "orderId invalide");
    }
    if (!callerUserId || callerUserId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "callerUserId invalide");
    }
    const result = await orderService.cancelOrder(orderId, callerUserId);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.toJSON() };
    }
    return {
      success: false,
      error: new ServiceError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        "Erreur serveur inattendue",
       { originalError: error instanceof Error ? error.message : String(error) }
      ).toJSON(),
    };
  }
}

// Actions spécifiques aux vendeurs
export async function sellerUpdateOrderStatus(
  orderId: number,
  status: ValidOrderStatus,
  sellerUserId: number
): Promise<ActionResponse<any>> {
  try {
    if (!orderId || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "orderId invalide");
    }
    validateParam(status, validOrderStatuses, "status");
    if (!sellerUserId || sellerUserId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "sellerUserId invalide");
    }
    const result = await orderService.sellerUpdateOrderStatus(orderId, status, sellerUserId);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.toJSON() };
    }
    return {
      success: false,
      error: new ServiceError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        "Erreur serveur inattendue",
       { originalError: error instanceof Error ? error.message : String(error) }
      ).toJSON(),
    };
  }
}

export async function sellerCreateShipment(
  orderId: number,
  sellerUserId: number,
  driverId?: number
): Promise<ActionResponse<any>> {
  try {
    if (!orderId || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "orderId invalide");
    }
    if (!sellerUserId || sellerUserId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "sellerUserId invalide");
    }
    if (driverId && driverId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "driverId invalide");
    }
    const result = await orderService.sellerCreateShipment(orderId, sellerUserId, driverId);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.toJSON() };
    }
    return {
      success: false,
      error: new ServiceError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        "Erreur serveur inattendue",
       { originalError: error instanceof Error ? error.message : String(error) }
      ).toJSON(),
    };
  }
}

export async function sellerUpdateShipmentStatus(
  shipmentId: number,
  status: ValidShipmentStatus,
  sellerUserId: number
): Promise<ActionResponse<any>> {
  try {
    if (!shipmentId || shipmentId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "shipmentId invalide");
    }
    validateParam(status, validShipmentStatuses, "status");
    if (!sellerUserId || sellerUserId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "sellerUserId invalide");
    }
    const result = await orderService.sellerUpdateShipmentStatus(shipmentId, status, sellerUserId);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.toJSON() };
    }
    return {
      success: false,
      error: new ServiceError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        "Erreur serveur inattendue",
       { originalError: error instanceof Error ? error.message : String(error) }
      ).toJSON(),
    };
  }
}

export async function sellerAssignDriverToShipment(
  shipmentId: number,
  driverId: number,
  sellerUserId: number
): Promise<ActionResponse<any>> {
  try {
    if (!shipmentId || shipmentId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "shipmentId invalide");
    }
    if (!driverId || driverId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "driverId invalide");
    }
    if (!sellerUserId || sellerUserId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "sellerUserId invalide");
    }
    const result = await orderService.sellerAssignDriverToShipment(shipmentId, driverId, sellerUserId);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.toJSON() };
    }
    return {
      success: false,
      error: new ServiceError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        "Erreur serveur inattendue",
       { originalError: error instanceof Error ? error.message : String(error) }
      ).toJSON(),
    };
  }
}

export async function sellerGetOrderItems(
  orderId: number,
  sellerUserId: number
): Promise<ActionResponse<any>> {
  try {
    if (!orderId || orderId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "orderId invalide");
    }
    if (!sellerUserId || sellerUserId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "sellerUserId invalide");
    }
    const result = await orderService.sellerGetOrderItems(orderId, sellerUserId);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.toJSON() };
    }
    return {
      success: false,
      error: new ServiceError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        "Erreur serveur inattendue",
       { originalError: error instanceof Error ? error.message : String(error) }
      ).toJSON(),
    };
  }
}