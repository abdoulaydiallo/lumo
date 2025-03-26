import { InferSelectModel } from "drizzle-orm";
import { orders, products, productStocks, storeDocuments } from "@/lib/db/schema";

export type Order = InferSelectModel<typeof orders>;
export type Product = InferSelectModel<typeof products>;
export type ProductStock = InferSelectModel<typeof productStocks>;
export type StoreDocument = InferSelectModel<typeof storeDocuments>;

export interface OverviewMetrics {
  totalOrders: number;
  pendingOrders: number;
  pendingPercentage: number;
  deliveredOrders: number;
  deliveredPercentage: number;
  revenue: number;
  lowStockItems: number;
  lowStockPercentage: number;
  totalProducts: number;
}

export interface OverviewData {
  orders: any[];
  products: any[];
  productStocks: ProductStock[];
  storeDocuments: StoreDocument[];
  metrics: OverviewMetrics;
}