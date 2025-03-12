import { db } from "@/lib/db";
import { products, productStocks, productCategoryRelation, productPromotions } from "@/lib/db/schema";
import { SQL, eq, gte, lte, or, like, sql, inArray, and } from "drizzle-orm";
import { getProductImages, getProductVariants, getProductCategories, getProductPromotions, getProductStock } from "./queries";
import { Product } from "./types";

interface FilterOptions {
  storeId?: number;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  promotionId?: number;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "newest" | "popularity";
  inStock?: boolean; // Nouveau filtre
}

interface PaginationOptions {
  limit: number;
  offset: number;
}

export async function getProductsWithFiltersAndPagination(
  filters: FilterOptions = {},
  pagination: PaginationOptions = { limit: 10, offset: 0 }
): Promise<{ products: Product[]; total: number }> {
  const { storeId, categoryIds, minPrice, maxPrice, searchTerm, promotionId, sortBy = "relevance", inStock } = filters;
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

  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    whereConditions.push(
      or(
        like(products.name, `%${searchLower}%`),
        like(products.description, `%${searchLower}%`)
      )as any
    ) ;
  }

  if (inStock) {
    whereConditions.push(
      sql`EXISTS (SELECT 1 FROM ${productStocks} WHERE ${productStocks.productId} = ${products.id} AND ${productStocks.availableStock} > 0)`
    );
  }

  // Filtre par catégories
  let productIdsByCategory: number[] = [];
  if (categoryIds && categoryIds.length > 0) {
    const relations = await db
      .select({ productId: productCategoryRelation.productId })
      .from(productCategoryRelation)
      .where(inArray(productCategoryRelation.categoryId, categoryIds));
    productIdsByCategory = relations.map((r) => r.productId) as any;
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
    productIdsByPromotion = promoRelations.map((r) => r.productId) as any;
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

  // Tri (inchangé pour cet exemple, mais peut être étendu)
  const orderBy = searchTerm
    ? sql`
        CASE
          WHEN LOWER(${products.name}) LIKE ${`%${searchTerm.toLowerCase()}%`} THEN 1.0
          WHEN LOWER(${products.description}) LIKE ${`%${searchTerm.toLowerCase()}%`} THEN 0.5
          ELSE 0.0
        END DESC, ${products.createdAt} DESC`
    : sql`${products.createdAt} DESC`;

  // Récupérer les produits
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
    .where(and(...whereConditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

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