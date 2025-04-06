// lib/validations/delivery.ts
import { z } from 'zod';

export const DeliveryEstimationSchema = z.object({
  userId: z.number().int().positive(),
  destinationAddressId: z.number().int().positive(),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      variantId: z.number().int().positive().optional(),
      quantity: z.number().int().positive()
    })
  ).min(1),
  deliveryType: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
  vehicleType: z.enum(['MOTO', 'CAR', 'TRUCK']).optional()
});

export const DeliveryRuleUpdateSchema = z.object({
  baseFee: z.number().int().positive().optional(),
  weightSurchargeRate: z.number().positive().optional(),
  distanceSurchargeRate: z.number().positive().optional(),
  minFee: z.number().int().positive().optional(),
  maxFee: z.number().int().positive().optional(),
  isActive: z.boolean().optional()
});