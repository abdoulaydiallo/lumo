"use server";

import { db } from "@/lib/db";
import { 
  dynamicDeliveryFees,
  addresses, 
  products,
  stores,
  cartItems
} from "@/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ERROR_CODES, ServiceError } from "./orders.errors";
import mapboxgl from "mapbox-gl";

// Configuration de Mapbox
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

export interface DeliveryFeeEstimate {
  storeId: number;
  fee: number;
  ruleId: number | null;
  distance: number;
  vehicleType: string;
  breakdown: {
    base: number;
    weightSurcharge?: number;
    distanceSurcharge?: number;
    vehicleAdjustment?: number;
    minFee?: number;
    maxFee?: number;
    finalFee: number;
    currency: string;
    deliveryType: string;
    estimatedDeliveryDays: number;
    isDefaultRule?: boolean;
  };
}

export interface CartItemForDelivery {
  productId: number;
  variantId?: number;
  quantity: number;
}

interface Coordinates {
  lng: number;
  lat: number;
}

interface DeliveryConfig {
  expressThreshold: number;
  standardThreshold: number;
  expressShortDays: number;
  expressLongDays: number;
  standardShortDays: number;
  standardLongDays: number;
  regionModifier: number;
}

const deliveryConfigs: Record<string, DeliveryConfig> = {
  "CONAKRY": { expressThreshold: 15, standardThreshold: 20, expressShortDays: 1, expressLongDays: 2, standardShortDays: 2, standardLongDays: 3, regionModifier: 0 },
  "BOKE": { expressThreshold: 20, standardThreshold: 30, expressShortDays: 2, expressLongDays: 4, standardShortDays: 3, standardLongDays: 5, regionModifier: 1 },
  "KINDIA": { expressThreshold: 20, standardThreshold: 25, expressShortDays: 2, expressLongDays: 3, standardShortDays: 2, standardLongDays: 4, regionModifier: 0 },
  "LABE": { expressThreshold: 25, standardThreshold: 35, expressShortDays: 2, expressLongDays: 4, standardShortDays: 3, standardLongDays: 6, regionModifier: 1 },
  "MAMOU": { expressThreshold: 20, standardThreshold: 30, expressShortDays: 2, expressLongDays: 4, standardShortDays: 3, standardLongDays: 5, regionModifier: 1 },
  "FARANAH": { expressThreshold: 25, standardThreshold: 40, expressShortDays: 2, expressLongDays: 5, standardShortDays: 4, standardLongDays: 6, regionModifier: 2 },
  "KANKAN": { expressThreshold: 25, standardThreshold: 40, expressShortDays: 2, expressLongDays: 5, standardShortDays: 4, standardLongDays: 6, regionModifier: 2 },
  "NZEREKORE": { expressThreshold: 30, standardThreshold: 50, expressShortDays: 3, expressLongDays: 6, standardShortDays: 4, standardLongDays: 7, regionModifier: 2 },
  "DEFAULT": { expressThreshold: 20, standardThreshold: 30, expressShortDays: 2, expressLongDays: 4, standardShortDays: 3, standardLongDays: 5, regionModifier: 0 },
};

const defaultRule = {
  baseFee: 15000,
  weightSurchargeRate: "500",
  distanceSurchargeRate: "1000",
  minFee: 10000,
  maxFee: 50000,
  vehicleType: "CAR",
};

function normalizeRegionName(region: string): string {
  return region.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function validateCoordinates(coords: any): coords is Coordinates {
  if (typeof coords?.lat !== 'number' || typeof coords?.lng !== 'number') return false;
  const minLat = 7.2, maxLat = 12.7, minLng = -15.1, maxLng = -7.6;
  return coords.lat >= minLat && coords.lat <= maxLat && coords.lng >= minLng && coords.lng <= maxLng;
}

function calculateFeeFromRule(
  rule: typeof dynamicDeliveryFees.$inferSelect | typeof defaultRule,
  totalWeight: number,
  distance: number,
  deliveryType: string,
  region: string,
  isDefault: boolean = false
): Omit<DeliveryFeeEstimate, 'storeId'> {
  const baseFee = rule.baseFee;
  const weightSurchargeRate = Number(rule.weightSurchargeRate) || 0;
  const distanceSurchargeRate = Number(rule.distanceSurchargeRate) || 0;

  let weightSurcharge = 0;
  if (totalWeight > 1000 && weightSurchargeRate > 0) {
    weightSurcharge = Math.ceil((totalWeight - 1000) / 1000) * weightSurchargeRate;
  }

  let distanceSurcharge = 0;
  if (distance > 10 && distanceSurchargeRate > 0) {
    distanceSurcharge = Math.ceil((distance - 10) / 50) * distanceSurchargeRate;
  }

  let totalFee = baseFee + weightSurcharge + distanceSurcharge;
  totalFee = Math.max(rule.minFee ?? 0, Math.min(rule.maxFee ?? Infinity, totalFee));
  
  const vehicleAdjustments = { "MOTO": 0.9, "CAR": 1.0, "TRUCK": 1.2 };
  const vehicleAdjustmentFactor = rule.vehicleType ? (vehicleAdjustments[rule.vehicleType] || 1.0) : 1.0;
  let adjustedFee = totalFee * vehicleAdjustmentFactor;

  // Garantir que les frais ne sont jamais inférieurs au baseFee
  adjustedFee = Math.max(baseFee, adjustedFee);

  return {
    fee: Math.round(adjustedFee),
    ruleId: "id" in rule ? rule.id : null,
    distance,
    vehicleType: rule.vehicleType || "CAR",
    breakdown: {
      base: baseFee,
      weightSurcharge: Math.round(weightSurcharge),
      distanceSurcharge: Math.round(distanceSurcharge),
      vehicleAdjustment: Math.round(adjustedFee - totalFee),
      minFee: rule.minFee ?? undefined,
      maxFee: rule.maxFee ?? undefined,
      finalFee: Math.round(adjustedFee),
      currency: "GNF",
      deliveryType,
      estimatedDeliveryDays: estimateDeliveryDays(region, distance, deliveryType, rule.vehicleType ?? undefined),
      isDefaultRule: isDefault,
    },
  };
}

function estimateDeliveryDays(
  region: string,
  distance: number,
  deliveryType: string,
  vehicleType?: string,
  preparationTime: number = 0
): number {
  const config = deliveryConfigs[normalizeRegionName(region)] || deliveryConfigs["DEFAULT"];
  const isExpress = deliveryType === "EXPRESS";
  const threshold = isExpress ? config.expressThreshold : config.standardThreshold;
  const baseDays = isExpress 
    ? (distance <= threshold ? config.expressShortDays : config.expressLongDays)
    : (distance <= threshold ? config.standardShortDays : config.standardLongDays);

  const vehicleModifiers = { "MOTO": -0.5, "CAR": 0, "TRUCK": 0.5 };
  const vehicleAdjustment = vehicleType ? (vehicleModifiers[vehicleType] || 0) : 0;
  const totalDays = baseDays + config.regionModifier + vehicleAdjustment + preparationTime;

  return Math.max(1, Math.round(totalDays));
}

export async function estimateDeliveryFee(
  userId: number,
  destinationAddressId: number,
  deliveryType: string = "STANDARD",
  vehicleType?: string
): Promise<DeliveryFeeEstimate[]> {
  const session = await auth();
  if (!session?.user) throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");

  return await db.transaction(async (tx) => {
    const cartData = await tx
      .select({
        productId: cartItems.productId,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        storeId: products.storeId,
        weight: products.weight,
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));

    if (!cartData.length) throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Le panier est vide");

    const [destinationAddress] = await tx
      .select({ region: addresses.region, coordinates: addresses.coordinates })
      .from(addresses)
      .where(and(eq(addresses.id, destinationAddressId), eq(addresses.userId, userId)));

    if (!destinationAddress || !validateCoordinates(destinationAddress.coordinates)) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Adresse de livraison invalide ou hors Guinée");
    }

    const destCoords = destinationAddress.coordinates as Coordinates;
    const region = normalizeRegionName(destinationAddress.region);

    const itemsByStore = new Map<number, { items: CartItemForDelivery[]; totalWeight: number }>();
    for (const item of cartData) {
      if (!item.storeId) throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, `Produit ${item.productId} sans storeId`);
      const storeEntry = itemsByStore.get(item.storeId) || { items: [], totalWeight: 0 };
      storeEntry.items.push({ productId: item.productId, variantId: item.variantId ?? undefined, quantity: item.quantity });
      storeEntry.totalWeight += (item.weight ?? 0) * item.quantity;
      itemsByStore.set(item.storeId, storeEntry);
    }

    const feeEstimates: DeliveryFeeEstimate[] = [];
    for (const [storeId, { totalWeight }] of itemsByStore) {
      const [store] = await tx
        .select({ addressId: stores.addressId })
        .from(stores)
        .where(eq(stores.id, storeId))
        .limit(1);

      if (!store?.addressId) throw new ServiceError(ERROR_CODES.NOT_FOUND, `Adresse du magasin ${storeId} non trouvée`);

      const [originAddress] = await tx
        .select({ coordinates: addresses.coordinates })
        .from(addresses)
        .where(eq(addresses.id, store.addressId))
        .limit(1);

      if (!originAddress || !validateCoordinates(originAddress.coordinates)) {
        throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, `Coordonnées invalides pour le magasin ${storeId}`);
      }

      const originCoords = originAddress.coordinates as Coordinates;
      const distance = Math.round(await calculateDeliveryDistance(originCoords, destCoords, deliveryType, region));

      const applicableRules = await tx
        .select()
        .from(dynamicDeliveryFees)
        .where(
          and(
            eq(dynamicDeliveryFees.region, region),
            eq(dynamicDeliveryFees.deliveryType, deliveryType),
            vehicleType ? eq(dynamicDeliveryFees.vehicleType, vehicleType) : sql`true`,
            lte(dynamicDeliveryFees.weightMin, totalWeight),
            gte(dynamicDeliveryFees.weightMax, totalWeight),
            lte(dynamicDeliveryFees.distanceMin, distance),
            eq(dynamicDeliveryFees.isActive, true)
          )
        )
        .orderBy(sql`${dynamicDeliveryFees.baseFee} ASC`);

      const feeEstimate = applicableRules.length > 0
        ? calculateFeeFromRule(applicableRules[0], totalWeight, distance, deliveryType, region)
        : calculateFeeFromRule(defaultRule, totalWeight, distance, deliveryType, region, true);

      feeEstimates.push({ ...feeEstimate, storeId });
    }

    return feeEstimates;
  }).catch((error) => {
    console.error("Erreur estimation livraison:", error);
    throw error instanceof ServiceError
      ? error
      : new ServiceError(ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur estimation", { originalError: error.message });
  });
}

async function calculateDeliveryDistance(
  origin: Coordinates,
  destination: Coordinates,
  deliveryType: string,
  region: string
): Promise<number> {
  if (!mapboxgl.accessToken) throw new ServiceError(ERROR_CODES.INTERNAL_SERVER_ERROR, "Token Mapbox manquant");

  const originStr = `${origin.lng},${origin.lat}`;
  const destinationStr = `${destination.lng},${destination.lat}`;

  try {
    const response = await fetch(
      `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${originStr};${destinationStr}?annotations=distance&access_token=${mapboxgl.accessToken}`
    );
    if (!response.ok) throw new Error(`Erreur API Mapbox: ${response.statusText}`);
    const data = await response.json();
    return data.distances[0][1] / 1000;
  } catch (error) {
    console.warn("Erreur calcul distance:", error);
    const regionDefaults = {
      "CONAKRY": 10, "BOKE": 200, "KINDIA": 100, "LABE": 250, "MAMOU": 200, "FARANAH": 300, "KANKAN": 250, "NZEREKORE": 400, "DEFAULT": 50
    };
    return regionDefaults[region] || regionDefaults["DEFAULT"];
  }
}

export async function getDeliveryOptions(
  userId: number,
  destinationAddressId: number
): Promise<any[]> {
  try {
    const [address] = await db
      .select({ region: addresses.region, coordinates: addresses.coordinates })
      .from(addresses)
      .where(and(eq(addresses.id, destinationAddressId), eq(addresses.userId, userId)));

    if (!address || !validateCoordinates(address.coordinates)) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, "Adresse non trouvée ou hors Guinée");
    }

    const deliveryRules = await db
      .select({
        id: dynamicDeliveryFees.id,
        deliveryType: dynamicDeliveryFees.deliveryType,
        vehicleType: dynamicDeliveryFees.vehicleType,
        weightMax: dynamicDeliveryFees.weightMax,
        distanceMax: dynamicDeliveryFees.distanceMax,
        baseFee: dynamicDeliveryFees.baseFee,
        estimatedDeliveryDays: sql<number>`CASE 
          WHEN ${dynamicDeliveryFees.deliveryType} = 'EXPRESS' THEN 
            CASE WHEN ${dynamicDeliveryFees.distanceMax} <= ${deliveryConfigs[address.region]?.expressThreshold || 20} THEN ${deliveryConfigs[address.region]?.expressShortDays || 2} ELSE ${deliveryConfigs[address.region]?.expressLongDays || 4} END
          ELSE 
            CASE WHEN ${dynamicDeliveryFees.distanceMax} <= ${deliveryConfigs[address.region]?.standardThreshold || 30} THEN ${deliveryConfigs[address.region]?.standardShortDays || 3} ELSE ${deliveryConfigs[address.region]?.standardLongDays || 5} END
        END`,
      })
      .from(dynamicDeliveryFees)
      .where(and(eq(dynamicDeliveryFees.region, address.region), eq(dynamicDeliveryFees.isActive, true)));

    return deliveryRules.map(rule => ({
      ...rule,
      currency: "GNF",
      deliveryTypeLabel: rule.deliveryType === "EXPRESS" ? "Livraison Express" : "Livraison Standard",
      vehicleTypeLabel: getVehicleTypeLabel(rule.vehicleType),
    }));
  } catch (error) {
    console.error("Erreur options livraison:", error);
    throw error instanceof ServiceError
      ? error
      : new ServiceError(ERROR_CODES.DATABASE_ERROR, "Erreur récupération options", { originalError: error instanceof Error ? error.message : String(error) });
  }
}

function getVehicleTypeLabel(vehicleType?: string | null): string {
  return { "MOTO": "Moto", "CAR": "Voiture", "TRUCK": "Camion" }[vehicleType || ""] || "Standard";
}