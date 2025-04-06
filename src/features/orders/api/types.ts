// @/types/orders.ts
export const validOrderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
export type ValidOrderStatus = typeof validOrderStatuses[number];

export const validPaymentStatuses = ["pending", "paid", "failed"] as const;
export type ValidPaymentStatus = typeof validPaymentStatuses[number];

export const validPaymentMethods = ["orange_money", "mobile_money", "cash_on_delivery"] as const;
export type ValidPaymentMethod = typeof validPaymentMethods[number];