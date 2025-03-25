// @/features/products/api/actions.ts
"use server";

import { db } from "@/lib/db";
import {
  products,
  productImages,
  productVariants,
  productCategoryRelation,
  productPromotions,
  productStocks,
  productCategories,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function createProduct(storeId: number, formData: FormData) {
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));
  const weight = Number(formData.get("weight"));
  const description = formData.get("description") as string | undefined;
  const imageUrls = JSON.parse(formData.get("imageUrls") as string) as string[];
  const variants = JSON.parse(formData.get("variants") as string) as Array<{
    variantType: string;
    variantValue: string;
    price: number;
    stock: number;
  }>;
  const categoryId = formData.get("categoryId") ? Number(formData.get("categoryId")) : undefined;
  const promotionId = formData.get("promotionId") ? Number(formData.get("promotionId")) : undefined;
  const stockLevelInput = Number(formData.get("stockLevel")); // Stock fourni dans le formulaire

  // Calculer le stock global en fonction des variantes
  const hasVariants = variants && variants.length > 0;
  const calculatedStockLevel = hasVariants
    ? variants.reduce((sum, variant) => sum + variant.stock, 0) // Somme des stocks des variantes
    : stockLevelInput; // Si pas de variantes, utiliser la valeur du formulaire

  // Insérer le produit principal
  const [newProduct] = await db
    .insert(products)
    .values({
      storeId,
      name,
      price,
      weight,
      description,
      stockStatus: calculatedStockLevel > 0 ? "in_stock" : "out_of_stock",
    })
    .returning();

  // Insérer les images
  if (imageUrls.length > 0) {
    await db.insert(productImages).values(
      imageUrls.map((url) => ({
        productId: newProduct.id,
        imageUrl: url,
      }))
    );
  }

  // Insérer les variantes (si présentes)
  if (hasVariants) {
    await db.insert(productVariants).values(
      variants.map((variant) => ({
        productId: newProduct.id,
        variantType: variant.variantType,
        variantValue: variant.variantValue,
        price: variant.price,
        stock: variant.stock,
      }))
    );
  }

  // Insérer la catégorie
  if (categoryId) {
    await db.insert(productCategoryRelation).values({
      productId: newProduct.id,
      categoryId,
    });
  }

  // Insérer la promotion
  if (promotionId) {
    await db.insert(productPromotions).values({
      productId: newProduct.id,
      promotionId,
      targetAudience: "all",
    });
  }

  // Insérer le stock (synchronisé avec les variantes ou le stockLevel fourni)
  await db.insert(productStocks).values({
    productId: newProduct.id,
    stockLevel: calculatedStockLevel,
    reservedStock: 0,
    availableStock: calculatedStockLevel,
  });

  return newProduct;
}

export async function updateProduct(productId: number, storeId: number, formData: FormData) {
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));
  const weight = Number(formData.get("weight"));
  const description = formData.get("description") as string | undefined;
  const imageUrls = JSON.parse(formData.get("imageUrls") as string) as string[];
  const variants = JSON.parse(formData.get("variants") as string) as Array<{
    variantType: string;
    variantValue: string;
    price: number;
    stock: number;
  }>;
  const categoryId = formData.get("categoryId") ? Number(formData.get("categoryId")) : undefined;
  const promotionId = formData.get("promotionId") ? Number(formData.get("promotionId")) : undefined;
  const stockLevelInput = Number(formData.get("stockLevel")); // Stock fourni dans le formulaire

  // Calculer le stock global en fonction des variantes
  const hasVariants = variants && variants.length > 0;
  const calculatedStockLevel = hasVariants
    ? variants.reduce((sum, variant) => sum + variant.stock, 0) // Somme des stocks des variantes
    : stockLevelInput; // Si pas de variantes, utiliser la valeur du formulaire

  // Mettre à jour le produit principal
  await db
    .update(products)
    .set({
      name,
      price,
      weight,
      description,
      stockStatus: calculatedStockLevel > 0 ? "in_stock" : "out_of_stock",
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)));

  // Mettre à jour les images (supprimer puis réinsérer)
  await db.delete(productImages).where(eq(productImages.productId, productId));
  if (imageUrls.length > 0) {
    await db.insert(productImages).values(
      imageUrls.map((url) => ({
        productId,
        imageUrl: url,
      }))
    );
  }

  // Mettre à jour les variantes (supprimer puis réinsérer)
  await db.delete(productVariants).where(eq(productVariants.productId, productId));
  if (hasVariants) {
    await db.insert(productVariants).values(
      variants.map((variant) => ({
        productId,
        variantType: variant.variantType,
        variantValue: variant.variantValue,
        price: variant.price,
        stock: variant.stock,
      }))
    );
  }

  // Mettre à jour la catégorie
  await db.delete(productCategoryRelation).where(eq(productCategoryRelation.productId, productId));
  if (categoryId) {
    await db.insert(productCategoryRelation).values({
      productId,
      categoryId,
    });
  }

  // Mettre à jour la promotion
  await db.delete(productPromotions).where(eq(productPromotions.productId, productId));
  if (promotionId) {
    await db.insert(productPromotions).values({
      productId,
      promotionId,
      targetAudience: "all",
    });
  }

  // Mettre à jour le stock (synchronisé avec les variantes ou le stockLevel fourni)
  await db
    .update(productStocks)
    .set({
      stockLevel: calculatedStockLevel,
      availableStock: calculatedStockLevel, // Supposant que reservedStock reste 0 pour simplifier
      updatedAt: new Date(),
    })
    .where(eq(productStocks.productId, productId));
}

export async function createCategory(storeId: number, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | undefined;
  const icon = formData.get("icon") as string | undefined;

  await db.insert(productCategories).values({
    name,
    description,
    icon,
    storeId,
  } as any); // "as any" à éviter à long terme, utiliser un typage correct
}

export async function deleteProduct(productId: number, storeId: number) {
  try {
    // Vérifier que le produit appartient au magasin spécifié
    const product = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
      .limit(1);

    if (!product.length) {
      throw new Error("Produit non trouvé ou non autorisé pour ce magasin");
    }

    // Supprimer les données associées dans les tables liées
    await db.delete(productImages).where(eq(productImages.productId, productId));
    await db.delete(productVariants).where(eq(productVariants.productId, productId));
    await db.delete(productCategoryRelation).where(eq(productCategoryRelation.productId, productId));
    await db.delete(productPromotions).where(eq(productPromotions.productId, productId));
    await db.delete(productStocks).where(eq(productStocks.productId, productId));

    // Supprimer le produit lui-même
    await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)));
  } catch (error) {
    console.error("Erreur lors de la suppression du produit:", error);
    throw new Error("Échec de la suppression du produit");
  }
}