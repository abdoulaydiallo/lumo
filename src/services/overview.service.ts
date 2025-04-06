"use server";

import { db } from "@/lib/db";
import { eq, sql, inArray } from "drizzle-orm";
import { orders, orderItems, products, productStocks, storeDocuments, payments } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { getStoreByUserId } from "@/features/stores/api/queries";

export interface OverviewMetrics {
  totalOrders: number;
  pendingOrders: number;
  pendingPercentage: number;
  deliveredPercentage: number;
  revenue: number;
  lowStockItems: number;
  lowStockPercentage: number;
}

export interface Order {
  id: number;
  userId: number | null;
  status: "pending" | "in_progress" | "delivered" | "cancelled";
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoreDocument {
  id: number;
  storeId: number | null;
  documentType: string;
  documentUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface OverviewData {
  orders: Order[];
  storeDocuments: StoreDocument[];
  metrics: OverviewMetrics;
}

function buildWhereConditions(storeId: number, productIds: number[]) {
  return {
    orders: productIds.length > 0 
      ? inArray(orderItems.productId, productIds)
      : sql`1 = 0`,
    stocks: productIds.length > 0
      ? inArray(productStocks.productId, productIds)
      : sql`1 = 0`,
    documents: eq(storeDocuments.storeId, storeId),
  };
}

export async function getOverviewDataByUserId(lowStockThreshold: number = 5): Promise<OverviewData> {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Authentification utilisateur invalide.");
    }

    const userId = Number(session.user.id);
    if (isNaN(userId) || userId <= 0) {
      throw new Error("ID utilisateur invalide.");
    }

    const store = await getStoreByUserId(userId);
    if (!store) {
      throw new Error("Store invalide.");
    }
    const storeId = store.id;

    if (!Number.isInteger(storeId) || storeId <= 0) {
      throw new Error("L'ID du magasin doit être un entier positif.");
    }

    const productIdsResult = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.storeId, storeId));
    
    const productIds = productIdsResult.map((p) => p.id);
    const conditions = buildWhereConditions(storeId, productIds);

    const userOrders = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        destinationAddressId: orders.destinationAddressId,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(conditions.orders);

    const userStoreDocuments = (await db
      .select({
        id: storeDocuments.id,
        storeId: storeDocuments.storeId,
        documentType: storeDocuments.documentType,
        documentUrl: storeDocuments.documentUrl,
        status: storeDocuments.status,
        createdAt: storeDocuments.createdAt,
        updatedAt: storeDocuments.updatedAt,
      })
      .from(storeDocuments)
      .where(conditions.documents))
      .filter((doc) => doc.status !== null) as StoreDocument[];

    const metricsResult = await db
      .select({
        totalOrders: sql<number>`count(distinct ${orders.id})`.as("total_orders"),
        pendingOrders: sql<number>`count(distinct ${orders.id}) filter (where ${orders.status} = 'pending')`.as("pending_orders"),
        deliveredOrders: sql<number>`count(distinct ${orders.id}) filter (where ${orders.status} = 'delivered')`.as("delivered_orders"),
        revenue: sql<number>`coalesce(sum(${payments.amount}) filter (where ${orders.status} = 'delivered'), 0)`.as("revenue"),
        totalProducts: sql<number>`count(distinct ${products.id})`.as("total_products"),
        lowStockItems: sql<number>`count(distinct ${products.id}) filter (where ${productStocks.availableStock} < ${lowStockThreshold} OR ${products.stockStatus} = 'low_stock')`.as("low_stock_items"),
      })
      .from(products)
      .leftJoin(productStocks, eq(products.id, productStocks.productId))
      .leftJoin(orderItems, eq(products.id, orderItems.productId))
      .leftJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(payments, eq(orders.id, payments.orderId))
      .where(eq(products.storeId, storeId))
      .then((result) => result[0] || {
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        revenue: 0,
        totalProducts: 0,
        lowStockItems: 0,
      });

    const { totalOrders, pendingOrders, deliveredOrders, revenue, totalProducts, lowStockItems } = metricsResult;

    const pendingPercentage = totalOrders > 0 
      ? Math.round((pendingOrders / totalOrders) * 100) 
      : 0;
    const deliveredPercentage = totalOrders > 0 
      ? Math.round((deliveredOrders / totalOrders) * 100) 
      : 0;
    const lowStockPercentage = totalProducts > 0 
      ? Math.round((lowStockItems / totalProducts) * 100) 
      : 0;

    const metrics: OverviewMetrics = {
      totalOrders,
      pendingOrders,
      pendingPercentage,
      deliveredPercentage,
      revenue,
      lowStockItems,
      lowStockPercentage,
    };

    return {
      orders: userOrders,
      storeDocuments: userStoreDocuments,
      metrics,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des données d'aperçu :", error);
    throw new Error(`Impossible de récupérer les données: ${error instanceof Error ? error.message : String(error)}`);
  }
}