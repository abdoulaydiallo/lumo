// @/features/stores/api/queries.ts
"use server";

import { db } from "@/lib/db";
import { stores, users, products } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { Store } from "./types"; // Assurez-vous que Store inclut tous les champs nécessaires

// Fonction utilitaire pour réessayer en cas d'échec (optionnel)
async function retry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retry ${i + 1}/${retries} after error:`, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
}

export async function getAllStores(): Promise<Store[] | any[]> {
  try {
    const allStores = await retry(async () => {
      return await db
        .select({
          id: stores.id,
          name: stores.name,
          phoneNumber: stores.phoneNumber,
          email: stores.email,
          profileImageUrl: stores.profileImageUrl,
          isOpenNow: stores.isOpenNow,
          activityType: stores.activityType,
          description: stores.description,
          coverImageUrl: stores.coverImageUrl,
          verificationStatus: stores.verificationStatus,
          openingHours: stores.openingHours,
          userId: stores.userId,
          updatedAt: stores.updatedAt,
          createdAt: stores.createdAt,
        })
        .from(stores)
        .leftJoin(users, eq(stores.userId, users.id));
    });

    const storeIds = allStores.map((s) => s.id);

    const productsData = storeIds.length
      ? await db
          .select({
            storeId: products.storeId,
            id: products.id,
            name: products.name,
            price: products.price,
          })
          .from(products)
          .where(inArray(products.storeId, storeIds))
      : [];

    const result = allStores.map((store) => ({
      id: Number(store.id),
      name: String(store.name),
      phoneNumber: String(store.phoneNumber),
      email: String(store.email),
      profileImageUrl: store.profileImageUrl ? String(store.profileImageUrl) : null,
      isOpenNow: Boolean(store.isOpenNow),
      activityType: String(store.activityType),
      description: store.description ? String(store.description) : null,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      products: productsData
        .filter((p) => p.storeId === store.id)
        .map((p) => ({
          id: Number(p.id),
          name: String(p.name),
          price: Number(p.price),
        })),
      // Champs non inclus dans la sélection mais requis par StoreCard
      coverImageUrl: String(store.coverImageUrl), // Ajoutez stores.coverImageUrl dans select si nécessaire
      verificationStatus: String(store.verificationStatus), // Valeur par défaut ou ajoutez au select
      openingHours: store.openingHours, // Valeur par défaut ou ajoutez au select 
      userId: Number(store.userId),
    }));

    return result;
  } catch (error) {
    console.error("Error in getAllStores:", error);
    throw new Error("Erreur lors de la récupération des boutiques");
  }
}

export async function getStoreById(id: number): Promise<any | null> {
  try {
    const [store] = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
    if (!store) return null;

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, store.userId))
      .limit(1);

    const storeProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
      })
      .from(products)
      .where(eq(products.storeId, id));

    const result = {
      id: Number(store.id),
      name: String(store.name),
      phoneNumber: String(store.phoneNumber),
      email: String(store.email),
      description: store.description ? String(store.description) : null,
      coverImageUrl: store.coverImageUrl ? String(store.coverImageUrl) : null,
      profileImageUrl: store.profileImageUrl ? String(store.profileImageUrl) : null,
      isOpenNow: Boolean(store.isOpenNow),
      activityType: String(store.activityType),
      verificationStatus: String(store.verificationStatus),
      openingHours: store.openingHours || {},
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      userId: Number(store.userId),
      user: user
        ? {
            id: Number(user.id),
            name: user.name ? String(user.name) : null,
            email: String(user.email),
          }
        : null,
      products: storeProducts.map((p) => ({
        id: Number(p.id),
        name: String(p.name),
        price: Number(p.price),
      })),
    };

    return result;
  } catch (error) {
    console.error("Error in getStoreById:", error);
    throw new Error("Erreur lors de la récupération de la boutique");
  }
}

export async function getStoreByUserId(userId: number): Promise<Partial<Store> | null> {
  try {
    const [store] = await db
      .select({
        id: stores.id,
        name: stores.name,
        phoneNumber: stores.phoneNumber,
        email: stores.email,
        userId: stores.userId,
        profileImageUrl: stores.profileImageUrl,
        coverImageUrl: stores.coverImageUrl,
        description: stores.description,
        activityType: stores.activityType,
        openingHours: stores.openingHours,
        isOpenNow: stores.isOpenNow,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt,
      })
      .from(stores)
      .where(eq(stores.userId, userId))
      .limit(1);

    if (!store) return null;

    const result = {
      id: Number(store.id),
      name: String(store.name),
      phoneNumber: String(store.phoneNumber),
      email: String(store.email),
      userId: Number(store.userId),
      profileImageUrl: store.profileImageUrl ? String(store.profileImageUrl) : null,
      coverImageUrl: store.coverImageUrl ? String(store.coverImageUrl) : null,
      description: store.description ? String(store.description) : null,
      activityType: String(store.activityType) as any,
      openingHours: store.openingHours as any,
      isOpenNow: Boolean(store.isOpenNow),
      createdAt: store.createdAt as any,
      updatedAt: store.updatedAt as any,
    };

    return result;
  } catch (error) {
    console.error("Error in getStoreByUserId:", error);
    throw new Error("Erreur lors de la récupération de la boutique par utilisateur");
  }
}