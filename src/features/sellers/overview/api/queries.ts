"use server";

import { db } from "@/lib/db";
import { eq, and, lt, sql, inArray } from "drizzle-orm";
import { orders, orderItems, products, productStocks, storeDocuments } from "@/lib/db/schema";
import { OverviewData } from "./types";

// Fonction utilitaire pour construire les conditions WHERE
function buildWhereConditions(storeId: number, productIds: number[]) {
  return {
    products: eq(products.storeId, storeId),
    orders: productIds.length > 0 
      ? inArray(orderItems.productId, productIds)
      : sql`1 = 0`,
    stocks: productIds.length > 0
      ? inArray(productStocks.productId, productIds)
      : sql`1 = 0`,
    documents: eq(storeDocuments.storeId, storeId),
  };
}

// Récupération optimisée des données d'aperçu avec pourcentages
export async function getOverviewDataByUserId(
  userId: number, 
  storeId: number
): Promise<OverviewData> {
  try {
    // Étape 1 : Récupérer les produits de la boutique
    const userProducts = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        weight: products.weight,
        stockStatus: products.stockStatus,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.storeId, storeId));
    
    const productIds = userProducts.map((p) => p.id);
    const conditions = buildWhereConditions(storeId, productIds);

    // Étape 2 : Récupérer les commandes
    const userOrders = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(conditions.orders);

    // Étape 3 : Récupérer les stocks
    const userProductStocks = await db
      .select({
        productId: productStocks.productId,
        id: productStocks.id,
        stockLevel: productStocks.stockLevel,
        reservedStock: productStocks.reservedStock,
        availableStock: productStocks.availableStock,
        updatedAt: productStocks.updatedAt,
      })
      .from(productStocks)
      .where(conditions.stocks);

    // Étape 4 : Récupérer les documents
    const userStoreDocuments = await db
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
      .where(conditions.documents);

    // Étape 5 : Calcul des métriques et pourcentages
    const [
      totalOrdersResult,
      pendingOrdersResult,
      deliveredOrdersResult,
      revenueResult,
      lowStockItemsResult,
      totalProductsCount
    ] = await Promise.all([
      db.select({ count: sql<number>`count(distinct ${orders.id})` })
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .where(conditions.orders),

      db.select({ count: sql<number>`count(distinct ${orders.id})` })
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .where(and(conditions.orders, eq(orders.status, "pending"))),

      db.select({ count: sql<number>`count(distinct ${orders.id})` })
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .where(and(conditions.orders, eq(orders.status, "delivered"))),

      db.select({ total: sql<number>`sum(${orderItems.price} * ${orderItems.quantity})` })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(and(conditions.orders, eq(orders.status, "delivered"))),

      db.select({ count: sql<number>`count(*)` })
        .from(productStocks)
        .where(and(conditions.stocks, lt(productStocks.availableStock, 5))),

      db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.storeId, storeId))
    ]);

    const totalOrders = totalOrdersResult[0]?.count || 0;
    const pendingOrders = pendingOrdersResult[0]?.count || 0;
    const deliveredOrders = deliveredOrdersResult[0]?.count || 0;
    const revenue = revenueResult[0]?.total || 0;
    const lowStockItems = lowStockItemsResult[0]?.count || 0;
    const totalProducts = totalProductsCount[0]?.count || 0;

    // Calcul des pourcentages
    const pendingPercentage = totalOrders > 0 
      ? Math.round((pendingOrders / totalOrders) * 100) 
      : 0;
    const deliveredPercentage = totalOrders > 0 
      ? Math.round((deliveredOrders / totalOrders) * 100) 
      : 0;
    const lowStockPercentage = totalProducts > 0 
      ? Math.round((lowStockItems / totalProducts) * 100) 
      : 0;

    return {
      orders: userOrders,
      products: userProducts,
      productStocks: userProductStocks,
      storeDocuments: userStoreDocuments,
      metrics: {
        totalOrders,
        pendingOrders,
        pendingPercentage,
        deliveredOrders,
        deliveredPercentage,
        revenue,
        lowStockItems,
        lowStockPercentage,
        totalProducts,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des données d'aperçu :", error);
    throw new Error(`Impossible de récupérer les données d'aperçu: ${error instanceof Error ? error.message : String(error)}`);
  }
}