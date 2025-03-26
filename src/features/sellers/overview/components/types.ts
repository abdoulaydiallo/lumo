export type OverviewProps = {
  initialData: OverviewData;
  userId?: number;
  lowStockThreshold?: number;
};

export type IconType = 
  | "orders" 
  | "pending" 
  | "revenue" 
  | "stock" 
  | "documents";

export type DocumentStatusCardProps = {
  status: "pending" | "approved" | "rejected";
};

export type UrgentActionsAlertProps = {
  lowStockItems: number;
  pendingOrders: number;
  lowStockThreshold?: number;
};

import { InferSelectModel } from "drizzle-orm";
import { 
  orders, 
  products, 
  productStocks, 
  storeDocuments,
  orderItems
} from "@/lib/db/schema";

// Types de base
export type Order = InferSelectModel<typeof orders> & {
  items?: OrderItem[];
};

export type Product = InferSelectModel<typeof products> & {
  stocks?: ProductStock[];
};

export type ProductStock = InferSelectModel<typeof productStocks>;
export type StoreDocument = InferSelectModel<typeof storeDocuments>;
export type OrderItem = InferSelectModel<typeof orderItems>;

// Interface pour les métriques
export interface OverviewMetrics {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  lowStockItems: number;
  totalProducts?: number;
  activePromotions?: number;
}

// Interface étendue pour les données d'aperçu
export interface OverviewData {
  orders: Order[];
  products: Product[];
  productStocks: ProductStock[];
  storeDocuments: StoreDocument[];
  metrics: OverviewMetrics;
}

// Types supplémentaires utiles
export interface ProductWithStocks extends Product {
  stocks: ProductStock[];
  currentStock?: number;
}

export interface OrderWithItems extends Order {
  items: (OrderItem & {
    product: Product;
  })[];
}

// Types pour les enums
export type OrderStatus = "pending" | "in_progress" | "delivered";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type StoreDocumentStatus = "pending" | "approved" | "rejected";