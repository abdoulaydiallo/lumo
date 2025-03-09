// @/features/stores/api/actions.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStoreByUserId } from "./queries";
import { desc, eq, is } from "drizzle-orm";
import { Store } from "./types";
import { act } from "react";

const storeSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  phoneNumber: z.string().regex(/^\d{9,20}$/, "Numéro invalide"),
  email: z.string().email("Email invalide"),
  profileImageUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  description: z.string().optional(),
  activityType: z.string().optional(),
  isOpenNow: z.boolean().optional(),
  openingHours: z.any(), // À raffiner avec un schéma précis si nécessaire
});

export async function createStore(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "store") {
    throw new Error("Non autorisé");
  }

  const userId = Number(session.user.id);
  const existingStore = await getStoreByUserId(userId);
  if (existingStore) {
    redirect("/marketplace/stores");
  }

  const validatedData = storeSchema.parse({
    name: formData.get("name"),
    phoneNumber: formData.get("phoneNumber"),
    email: formData.get("email"),
    profileImageUrl: formData.get("profileImageUrl") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    description: formData.get("description") || undefined,
    activityType: formData.get("activityType") || undefined,
    isOpenNow: formData.get("isOpenNow") === "true",
    openingHours: JSON.parse(formData.get("openingHours") as string),
  });

  await db.insert(stores).values({
    userId,
    name: validatedData.name,
    phoneNumber: validatedData.phoneNumber,
    email: validatedData.email,
    profileImageUrl: validatedData.profileImageUrl || null, // Explicitement null si undefined
    coverImageUrl: validatedData.coverImageUrl || null,     // Explicitement null si undefined
    description: validatedData.description,
    openingHours: validatedData.openingHours,
    verificationStatus: "pending",
    isOpenNow: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  redirect("/marketplace/stores");
}

export async function updateStore(storeId: number, formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "store") {
    throw new Error("Non autorisé");
  }

  const userId = Number(session.user.id);
  const existingStore = await getStoreByUserId(userId);
  if (!existingStore || existingStore.id !== storeId) {
    throw new Error("Boutique non trouvée ou non autorisée");
  }

  const validatedData = storeSchema.parse({
    name: formData.get("name"),
    phoneNumber: formData.get("phoneNumber"),
    email: formData.get("email"),
    profileImageUrl: formData.get("profileImageUrl") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    description: formData.get("description") || undefined,
    activityType: formData.get("activityType") || undefined,
    isOpenNow: formData.get("isOpenNow") === "true",
    openingHours: JSON.parse(formData.get("openingHours") as string),
  });

  await db
    .update(stores)
    .set({
      name: validatedData.name,
      phoneNumber: validatedData.phoneNumber,
      email: validatedData.email,
      profileImageUrl: validatedData.profileImageUrl || existingStore.profileImageUrl || null,
      coverImageUrl: validatedData.coverImageUrl || existingStore.coverImageUrl || null,
      description: validatedData.description,
      activityType: validatedData.activityType || existingStore.activityType,
      isOpenNow: validatedData.isOpenNow,
      openingHours: validatedData.openingHours || existingStore.openingHours,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId));
  
  redirect(`/marketplace/stores/${storeId}`);
  
}

export async function getStores(): Promise<Store[]> {
  const data: any = await db
    .select()
    .from(stores)
    .orderBy(desc(stores.createdAt));
  return data;
}

export async function getStoreById(storeId: number): Promise<Store | null> {
  const data: any = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  return data.length > 0 ? data[0] : null;
}

export async function deleteStore(storeId: number) {
  const session = await auth();
  if (!session?.user || session.user.role !== "store") {
    throw new Error("Non autorisé");
  }

  const userId = Number(session.user.id);
  const existingStore = await getStoreByUserId(userId);
  if (!existingStore || existingStore.id !== storeId) {
    throw new Error("Boutique non trouvée ou non autorisée");
  }

  try {
    await db.delete(stores).where(eq(stores.id, storeId));
    console.log(`Boutique ${storeId} supprimée avec succès par l'utilisateur ${userId}`);
  } catch (error) {
    console.error("Erreur lors de la suppression de la boutique:", error);
    throw new Error("Impossible de supprimer la boutique");
  }
}