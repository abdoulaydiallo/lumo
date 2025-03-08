import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  stores,
  users,
  addresses,
  storeDrivers,
  storeMessages,
  storeCommissions,
  storeDocuments,
  storeAnalytics,
  storeActivities,
  products,
} from "@/lib/db/schema";

// Types pour SELECT (lecture)
export type User = InferSelectModel<typeof users>;
export type Address = InferSelectModel<typeof addresses>;
export type StoreDriver = InferSelectModel<typeof storeDrivers>;
export type StoreMessage = InferSelectModel<typeof storeMessages>;
export type StoreCommission = InferSelectModel<typeof storeCommissions>;
export type StoreDocument = InferSelectModel<typeof storeDocuments>;
export type StoreAnalytics = InferSelectModel<typeof storeAnalytics>;
export type StoreActivity = InferSelectModel<typeof storeActivities>;
export type Product = InferSelectModel<typeof products>;

// Types pour INSERT (création)
export type NewStore = InferInsertModel<typeof stores>;
export type NewAddress = InferInsertModel<typeof addresses>;

// Type complet pour une boutique avec relations
export type FullStore = Store & {
  user: User;
  address: Address | null;
  drivers: StoreDriver[];
  messages: StoreMessage[];
  commissions: StoreCommission[];
  documents: StoreDocument[];
  analytics: StoreAnalytics | null;
  activities: StoreActivity[];
  products: Product[];
};

// @/features/stores/api/types.ts
export interface Store {
  id: number;
  userId: number;
  name: string;
  phoneNumber: string;
  email: string;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  activityType: "Mode" | "Électronique" | "Alimentation" | "Maison" | "Beauté" | "Sports" | "Autres";
  verificationStatus: string;
  isOpenNow: boolean;
  createdAt: Date;
  updatedAt: Date;
  products: Array<{ id: number; name: string; price: number }>;
  openingHours: OpeningHours;
}

// Type TypeScript pour les horaires
export type OpeningHours = {
  [key in "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"]: {
    open: string; // ex: "09:00"
    close: string; // ex: "17:00"
    isClosed: boolean;
  };
};