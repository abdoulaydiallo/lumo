// @/features/overview/types.ts
import { InferSelectModel } from "drizzle-orm";
import { orders, products, productStocks, storeDocuments } from "@/lib/db/schema";

export type Order = InferSelectModel<typeof orders>;
export type Product = InferSelectModel<typeof products>;
export type ProductStock = InferSelectModel<typeof productStocks>;
export type StoreDocument = InferSelectModel<typeof storeDocuments>;

export interface OverviewData {
  orders: Order[];
  products: Product[];
  productStocks: ProductStock[];
  storeDocuments: StoreDocument[];
  metrics: {
    totalOrders: number;
    pendingOrders: number;
    revenue: number;
    lowStockItems: number;
  };
}