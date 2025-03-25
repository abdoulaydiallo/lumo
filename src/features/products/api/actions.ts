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
  productCategories
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function createProduct(storeId: number, formData: FormData) {
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));
  const weight = Number(formData.get("weight"));
  const description = formData.get("description") as string | undefined;
  const imageUrls = JSON.parse(formData.get("imageUrls") as string) as string[];
  const variantType = formData.get("variantType") as string | undefined;
  const variantValue = formData.get("variantValue") as string | undefined;
  const variantPrice = formData.get("variantPrice") ? Number(formData.get("variantPrice")) : undefined;
  const variantStock = formData.get("variantStock") ? Number(formData.get("variantStock")) : undefined;
  const categoryId = formData.get("categoryId") ? Number(formData.get("categoryId")) : undefined;
  const promotionId = formData.get("promotionId") ? Number(formData.get("promotionId")) : undefined;
  const stockLevel = Number(formData.get("stockLevel"));

  const [newProduct] = await db
    .insert(products)
    .values({
      storeId,
      name,
      price,
      weight,
      description,
      stockStatus: stockLevel > 0 ? "in_stock" : "out_of_stock",
    })
    .returning();

  if (imageUrls.length > 0) {
    await db.insert(productImages).values(
      imageUrls.map((url) => ({
        productId: newProduct.id,
        imageUrl: url,
      }))
    );
  }

  if (variantType && variantValue && variantPrice !== undefined && variantStock !== undefined) {
    await db.insert(productVariants).values({
      productId: newProduct.id,
      variantType,
      variantValue,
      price: variantPrice,
      stock: variantStock,
    });
  }

  if (categoryId) {
    await db.insert(productCategoryRelation).values({
      productId: newProduct.id,
      categoryId,
    });
  }

  if (promotionId) {
    await db.insert(productPromotions).values({
      productId: newProduct.id,
      promotionId,
      targetAudience: "all",
    });
  }

  await db.insert(productStocks).values({
    productId: newProduct.id,
    stockLevel,
    reservedStock: 0,
    availableStock: stockLevel,
  });
}

export async function updateProduct(productId: number, storeId: number, formData: FormData) {
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));
  const weight = Number(formData.get("weight"));
  const description = formData.get("description") as string | undefined;
  const imageUrls = JSON.parse(formData.get("imageUrls") as string) as string[];
  const variantType = formData.get("variantType") as string | undefined;
  const variantValue = formData.get("variantValue") as string | undefined;
  const variantPrice = formData.get("variantPrice") ? Number(formData.get("variantPrice")) : undefined;
  const variantStock = formData.get("variantStock") ? Number(formData.get("variantStock")) : undefined;
  const categoryId = formData.get("categoryId") ? Number(formData.get("categoryId")) : undefined;
  const promotionId = formData.get("promotionId") ? Number(formData.get("promotionId")) : undefined;
  const stockLevel = Number(formData.get("stockLevel"));

  await db
    .update(products)
    .set({
      name,
      price,
      weight,
      description,
      stockStatus: stockLevel > 0 ? "in_stock" : "out_of_stock",
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)));

  await db.delete(productImages).where(eq(productImages.productId, productId));
  if (imageUrls.length > 0) {
    await db.insert(productImages).values(
      imageUrls.map((url) => ({
        productId,
        imageUrl: url,
      }))
    );
  }

  await db.delete(productVariants).where(eq(productVariants.productId, productId));
  if (variantType && variantValue && variantPrice !== undefined && variantStock !== undefined) {
    await db.insert(productVariants).values({
      productId,
      variantType,
      variantValue,
      price: variantPrice,
      stock: variantStock,
    });
  }

  await db.delete(productCategoryRelation).where(eq(productCategoryRelation.productId, productId));
  if (categoryId) {
    await db.insert(productCategoryRelation).values({
      productId,
      categoryId,
    });
  }

  await db.delete(productPromotions).where(eq(productPromotions.productId, productId));
  if (promotionId) {
    await db.insert(productPromotions).values({
      productId,
      promotionId,
      targetAudience: "all",
    });
  }

  await db
    .update(productStocks)
    .set({
      stockLevel,
      availableStock: stockLevel,
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
  } as any);
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
    await db
      .delete(productImages)
      .where(eq(productImages.productId, productId));
    await db
      .delete(productVariants)
      .where(eq(productVariants.productId, productId));
    await db
      .delete(productCategoryRelation)
      .where(eq(productCategoryRelation.productId, productId));
    await db
      .delete(productPromotions)
      .where(eq(productPromotions.productId, productId));
    await db
      .delete(productStocks)
      .where(eq(productStocks.productId, productId));

    // Supprimer le produit lui-même
    await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)));
  } catch (error) {
    console.error("Erreur lors de la suppression du produit:", error);
    throw new Error("Échec de la suppression du produit");
  }
}