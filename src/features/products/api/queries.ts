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
import { eq, and, SQL, lte, gte, or, like, inArray, sql } from "drizzle-orm";
import {
  ProductImage,
  ProductVariant,
  ProductCategory,
  ProductPromotion,
  Promotion,
  ProductStock,
  Product,
} from "./types";

export interface FilterOptions {
  storeId?: number;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  promotionId?: number;
  sortBy?: 
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "popularity"
  | "rating_desc"
  | "stock_desc"
  | "discount_desc";

  inStock?: boolean;
}

interface PaginationOptions {
  limit: number;
  offset: number;
}

export async function getProductsWithFiltersAndPagination(
  filters: FilterOptions = {},
  pagination: PaginationOptions = { limit: 10, offset: 0 }
): Promise<{ products: Product[]; total: number }> {
  const {
    storeId,
    categoryIds,
    minPrice,
    maxPrice,
    searchTerm,
    promotionId,
    sortBy = "relevance"
  } = filters;
  const { limit, offset } = pagination;

  // Conditions de filtre
  const whereConditions: SQL[] = [];

  if (storeId) {
    whereConditions.push(eq(products.storeId, storeId));
  }

  if (minPrice !== undefined) {
    whereConditions.push(gte(products.price, minPrice));
  }

  if (maxPrice !== undefined) {
    whereConditions.push(lte(products.price, maxPrice));
  }

  // Recherche textuelle avec pertinence
  let relevanceScore: SQL | undefined;
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    whereConditions.push(
      or(
        like(products.name, `%${searchLower}%`),
        like(products.description, `%${searchLower}%`)
      ) as any
    );
    // Calcul de la pertinence (pondération : nom = 1, description = 0.5)
    relevanceScore = sql`
      CASE
        WHEN LOWER(${products.name}) LIKE ${`%${searchLower}%`} THEN 1.0
        WHEN LOWER(${products.description}) LIKE ${`%${searchLower}%`} THEN 0.5
        ELSE 0.0
      END
    `;
  }

  // Filtre par catégories
  let productIdsByCategory: number[] = [];
  if (categoryIds && categoryIds.length > 0) {
    const relations = await db
      .select({ productId: productCategoryRelation.productId })
      .from(productCategoryRelation)
      .where(inArray(productCategoryRelation.categoryId, categoryIds));
    productIdsByCategory = relations.map((r) => r.productId) as number[];
    if (productIdsByCategory.length > 0) {
      whereConditions.push(inArray(products.id, productIdsByCategory));
    } else {
      return { products: [], total: 0 };
    }
  }

  // Filtre par promotion
  let productIdsByPromotion: number[] = [];
  if (promotionId) {
    const promoRelations = await db
      .select({ productId: productPromotions.productId })
      .from(productPromotions)
      .where(eq(productPromotions.promotionId, promotionId));
    productIdsByPromotion = promoRelations.map((r) => r.productId) as number[];
    if (productIdsByPromotion.length > 0) {
      whereConditions.push(inArray(products.id, productIdsByPromotion));
    } else {
      return { products: [], total: 0 };
    }
  }

  // Compter le total
  const totalQuery = await db
    .select({ count: sql<number>`count(${products.id})` })
    .from(products)
    .where(and(...whereConditions));
  const total = totalQuery[0].count;

  // Tri
  let orderBy: SQL;
  switch (sortBy) {
    case "price_asc":
      orderBy = sql`${products.price} ASC`;
      break;
    case "price_desc":
      orderBy = sql`${products.price} DESC`;
      break;
    case "newest":
      orderBy = sql`${products.createdAt} DESC`;
      break;
    case "popularity":
      // À implémenter avec une métrique (ex. ventes, vues)
      orderBy = sql`${products.createdAt} DESC`; // Placeholder
      break;
    case "relevance":
    default:
      orderBy = relevanceScore ? sql`${relevanceScore} DESC, ${products.createdAt} DESC` : sql`${products.createdAt} DESC`;
      break;
  }

  // Récupérer les produits avec pagination et tri
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
      ...(relevanceScore ? { relevance: relevanceScore } : {}), // Ajouter la pertinence si applicable
    })
    .from(products)
    .where(and(...whereConditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Ajouter les relations
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
      } as Product;
    })
  );

  return {
    products: productsWithRelations,
    total,
  };
}

// Récupérer un produit par ID
export async function getProductById(productId: number, storeId: number): Promise<Product | null> {
  const [product] = await db
    .select()
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

export async function getPromotionsByStoreId(storeId: number): Promise<Promotion[]> {
  return await db
    .select()
    .from(promotions)
    .where(eq(promotions.storeId, storeId))
  
}