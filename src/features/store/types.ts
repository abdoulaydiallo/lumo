// @/features/store/types.ts
import { InferSelectModel } from "drizzle-orm";
import {
    stores, users,
    notifications, orders, products, drivers,
    supportTickets, promotions, reports
} from "@/lib/db/schema";

export type User = InferSelectModel<typeof users>;
export type Store = InferSelectModel<typeof stores>;
export type Notification = InferSelectModel<typeof notifications>;
export type Order = InferSelectModel<typeof orders>;
export type Product = InferSelectModel<typeof products>;
export type Driver = InferSelectModel<typeof drivers>;
export type SupportTicket = InferSelectModel<typeof supportTickets>;
export type Promotion = InferSelectModel<typeof promotions>;
export type Report = InferSelectModel<typeof reports>;

export interface StoreLayoutData {
  user: User;
  stores: Store[];
  notifications: Notification[];
  orders: { inProgress: number; completed: number };
  products: { total: number };
  drivers: { total: number };
  supportTickets: { total: number };
  promotions: { total: number };
  reports: { total: number };
}