// @/features/products/api/queries.ts
"use server";

import { db } from "@/lib/db";
import {
  products,
  productImages,
  productVariants,
  productCategories,
  productCategoryRelation,
  promotions,
  productPromotions,
  productStocks,
} from "@/lib/db/schema";
import { eq, and, SQL, lte, gte, or, gt, lt } from "drizzle-orm";
import {
  ProductImage,
  ProductVariant,
  ProductCategory,
  ProductPromotion,
  Promotion,
  ProductStock,
  Product,
} from "./types";

// Récupérer un produit par ID
export async function getProductById(productId: number, storeId: number): Promise<Product | null> {
  const [product] = await db
    .select({
      id: products.id,
      storeId: products.storeId,
      name: products.name,
      description: products.description,
      price: products.price,
      weight: products.weight,
      stockStatus: products.stockStatus,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .limit(1);

  if (!product) return null;

  const images = await getProductImages(product.id);
  const variants = await getProductVariants(product.id);
  const categories = await getProductCategories(product.id);
  const promotions = await getProductPromotions(product.id);
  const stock = await getProductStock(product.id);

  return {
    ...product,
    images,
    variants,
    categories,
    promotions,
    stock,
  } as any;
}

// Fonctions existantes
export async function getProductsByStoreId(storeId: number): Promise<Product[]> {
  const productList = await db
    .select({
      id: products.id,
      storeId: products.storeId,
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

  const productsWithRelations = await Promise.all(
    productList.map(async (product) => {
      const images = await getProductImages(product.id);
      const variants = await getProductVariants(product.id);
      const categories = await getProductCategories(product.id);
      const promotions = await getProductPromotions(product.id);
      const stock = await getProductStock(product.id);

      return {
        ...product,
        images,
        variants,
        categories,
        promotions,
        stock,
      } as any;
    })
  );

  return productsWithRelations;
}

export async function getProductImages(productId: number): Promise<ProductImage[]> {
  return await db
    .select({
      id: productImages.id,
      productId: productImages.productId,
      imageUrl: productImages.imageUrl,
      createdAt: productImages.createdAt,
      updatedAt: productImages.updatedAt,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId));
}

export async function getProductVariants(productId: number): Promise<ProductVariant[]> {
  return await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      variantType: productVariants.variantType,
      variantValue: productVariants.variantValue,
      price: productVariants.price,
      stock: productVariants.stock,
      createdAt: productVariants.createdAt,
      updatedAt: productVariants.updatedAt,
    })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
}

export async function getProductCategories(productId: number): Promise<ProductCategory[]> {
  return await db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      description: productCategories.description,
      icon: productCategories.icon,
      createdAt: productCategories.createdAt,
      updatedAt: productCategories.updatedAt,
    })
    .from(productCategories)
    .innerJoin(
      productCategoryRelation,
      eq(productCategoryRelation.categoryId, productCategories.id)
    )
    .where(eq(productCategoryRelation.productId, productId));
}

export async function getProductPromotions(productId: number): Promise<ProductPromotion[]> {
  return await db
    .select({
      id: productPromotions.id,
      productId: productPromotions.productId,
      promotionId: productPromotions.promotionId,
      targetAudience: productPromotions.targetAudience,
      createdAt: productPromotions.createdAt,
      promotion: {
        id: promotions.id,
        code: promotions.code,
        storeId: promotions.storeId,
        discountPercentage: promotions.discountPercentage,
        startDate: promotions.startDate,
        isExpired: promotions.isExpired,
        endDate: promotions.endDate,
        createdAt: promotions.createdAt,
      },
    })
    .from(productPromotions)
    .innerJoin(promotions, eq(productPromotions.promotionId, promotions.id))
    .where(eq(productPromotions.productId, productId));
}

export async function getProductStock(productId: number): Promise<ProductStock | null> {
  const [stock] = await db
    .select({
      id: productStocks.id,
      productId: productStocks.productId,
      stockLevel: productStocks.stockLevel,
      reservedStock: productStocks.reservedStock,
      availableStock: productStocks.availableStock,
      updatedAt: productStocks.updatedAt,
    })
    .from(productStocks)
    .where(eq(productStocks.productId, productId))
    .limit(1);
  return stock || null;
}

export async function getAllCategories(): Promise<ProductCategory[]> {
  return await db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      description: productCategories.description,
      icon: productCategories.icon,
      createdAt: productCategories.createdAt,
      updatedAt: productCategories.updatedAt,
    })
    .from(productCategories);
}

export async function getAllPromotions(): Promise<Promotion[]> {
  return await db
    .select({
      id: promotions.id,
      code: promotions.code,
      storeId: promotions.storeId,
      discountPercentage: promotions.discountPercentage,
      startDate: promotions.startDate,
      endDate: promotions.endDate,
      isExpired: promotions.isExpired,
      createdAt: promotions.createdAt,
    })
    .from(promotions);
}
