// @/lib/search.engine.ts
// Author: Abdoulaye Diallo
// Date: 10/03/2025
// Description: Moteur de recherche optimisé pour les produits avec pagination par curseur et mise en cache Redis.

import { and, sql, SQL } from "drizzle-orm";
import { db } from "./";
import {
  products,
  productCategoryRelation,
  productPromotions,
  orderItems,
  promotions,
  productVariants,
  productStocks,
  reviews,
  stores,
  addresses,
} from "./schema";
import { redis } from "@/lib/redis";

// Types locaux
export interface Product {
  id: number;
  storeId: number;
  name: string;
  description: string | null;
  price: number;
  weight: number;
  stockStatus: string;
  createdAt: Date;
  updatedAt: Date | null;
  images: { id: number; imageUrl: string; productId: number }[];
  variants: { id: number; variantType: string; variantValue: string; price: number; stock: number; productId: number }[];
  categories: { id: number; name: string }[];
  promotions: { id: number; promotionId: number; productId: number; discountPercentage: number }[];
  stock?: { id: number; stockLevel: number; reservedStock: number; availableStock: number; productId: number };
}

export interface SearchFilters {
  storeId?: number;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  promotionId?: number;
  inStock?: boolean;
  variantType?: string;
  variantValue?: string;
  minRating?: number;
  region?: string;
  availableStockMin?: number;
}

export type SortOption =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "popularity"
  | "rating_desc"
  | "stock_desc"
  | "discount_desc";

export interface Pagination {
  limit: number;
  cursor?: { id: string; sortValue: string } | null; // Curseur composite avec id et valeur de tri
}

export interface SearchParams {
  filters?: SearchFilters;
  sort?: SortOption;
  pagination?: Pagination;
}

export interface SearchResult {
  products: Product[];
  total: number;
  nextCursor: { id: string; sortValue: string } | null;
  metadata?: {
    filtersApplied: SearchFilters;
    sortApplied: SortOption;
    paginationApplied: Pagination;
  };
}

// Alias SQL pour les tables relationnelles
const TABLES = {
  productImages: sql.raw("product_images pi"),
  productVariants: sql.raw("product_variants pv"),
  productCategories: sql.raw("product_categories pc"),
  productStocks: sql.raw("product_stocks ps"),
  productPromotions: sql.raw("product_promotions pp"),
};

/**
 * Retourne la valeur du champ de tri pour un produit donné en fonction de l'option de tri.
 */
function getSortValue(product: Product, sort: SortOption): string {
  switch (sort) {
    case "price_asc":
    case "price_desc":
      return product.price.toString();
    case "newest":
      return product.createdAt.toISOString();
    case "popularity":
      return "0"; // À ajuster selon la logique réelle (ex: nombre de commandes)
    case "rating_desc":
      return "0"; // À ajuster selon la logique réelle (ex: moyenne des avis)
    case "stock_desc":
      return product.stock?.availableStock?.toString() || "0";
    case "discount_desc":
      return product.promotions[0]?.discountPercentage?.toString() || "0";
    case "relevance":
    default:
      return product.id.toString();
  }
}

/**
 * Construit les conditions SQL WHERE en fonction des filtres et du curseur composite.
 */
function buildWhereConditions(filters: SearchFilters, sort: SortOption, cursor?: Pagination["cursor"]): SQL[] {
  const conditions: SQL[] = [];

  if (filters.storeId !== null && filters.storeId !== undefined) {
    conditions.push(sql`${products.storeId} = ${filters.storeId}`);
  }

  if (filters.minPrice !== null && filters.minPrice !== undefined) {
    conditions.push(sql`${products.price} >= ${filters.minPrice}`);
  }

  if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
    conditions.push(sql`${products.price} <= ${filters.maxPrice}`);
  }

  if (filters.inStock !== null && filters.inStock !== undefined) {
    conditions.push(
      filters.inStock
        ? sql`${products.stockStatus} IN ('in_stock', 'low_stock') AND ${products.stockStatus} IS NOT NULL`
        : sql`${products.stockStatus} = 'out_of_stock' OR ${products.stockStatus} IS NULL`
    );
  }

  if (filters.searchTerm && filters.searchTerm.trim().length > 0) {
    try {
      // Nettoyer le searchTerm : supprimer les caractères non alphanumériques sauf espaces
      const cleanedSearchTerm = filters.searchTerm
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, "") // Supprimer les caractères spéciaux
        .replace(/\s+/g, " & "); // Remplacer les espaces multiples par " & "

      if (cleanedSearchTerm.length !== 0){
        const searchQuery = cleanedSearchTerm + ":*"; // Ajouter le préfixe pour la recherche

        const condition = sql`to_tsvector('french', COALESCE(${products.name}, '') || ' ' || COALESCE(${products.description}, '')) 
          @@ to_tsquery('french', ${searchQuery})`;
        conditions.push(condition);
      }
    } catch (error) {
      console.error("Erreur lors de la génération de la condition de recherche:", error);
      // Ne pas ajouter la condition en cas d'erreur
    }
  }

  if ((filters.categoryIds ?? []).length > 0) {
    conditions.push(
      sql`${products.id} IN (
        SELECT ${productCategoryRelation.productId}
        FROM ${productCategoryRelation}
        WHERE ${productCategoryRelation.categoryId} IN (${sql.join(filters.categoryIds ?? [], sql`,`)})
      )`
    );
  }

  if (filters.promotionId !== null && filters.promotionId !== undefined) {
    conditions.push(
      sql`${products.id} IN (
        SELECT ${productPromotions.productId}
        FROM ${productPromotions}
        WHERE ${productPromotions.promotionId} = ${filters.promotionId}
      )`
    );
  }

  if (filters.variantType && filters.variantValue) {
    conditions.push(
      sql`${products.id} IN (
        SELECT ${productVariants.productId}
        FROM ${productVariants}
        WHERE ${productVariants.variantType} = ${filters.variantType}
        AND ${productVariants.variantValue} = ${filters.variantValue}
      )`
    );
  }

  if (filters.minRating !== null && filters.minRating !== undefined) {
    conditions.push(
      sql`${products.id} IN (
        SELECT ${reviews.productId}
        FROM ${reviews}
        GROUP BY ${reviews.productId}
        HAVING AVG(${reviews.rating}) >= ${filters.minRating}
      )`
    );
  }

  if (filters.region) {
    conditions.push(
      sql`${products.storeId} IN (
        SELECT ${stores.id}
        FROM ${stores}
        JOIN ${addresses} ON ${stores.addressId} = ${addresses.id}
        WHERE ${addresses.region} = ${filters.region}
      )`
    );
  }

  if (filters.availableStockMin !== null && filters.availableStockMin !== undefined) {
    conditions.push(
      sql`${products.id} IN (
        SELECT ${productStocks.productId}
        FROM ${productStocks}
        WHERE ${productStocks.availableStock} >= ${filters.availableStockMin}
      )`
    );
  }

  // Ajout des conditions pour le curseur composite
  if (cursor) {
    const cursorId = parseInt(cursor.id);
    const cursorSortValue = cursor.sortValue;

    switch (sort) {
      case "price_asc":
        conditions.push(
          sql`(${products.price} > ${parseFloat(cursorSortValue)}) OR 
             (${products.price} = ${parseFloat(cursorSortValue)} AND ${products.id} > ${cursorId})`
        );
        break;
      case "price_desc":
        conditions.push(
          sql`(${products.price} < ${parseFloat(cursorSortValue)}) OR 
             (${products.price} = ${parseFloat(cursorSortValue)} AND ${products.id} > ${cursorId})`
        );
        break;
      case "newest":
        conditions.push(
          sql`(${products.createdAt} < ${new Date(cursorSortValue)}) OR 
             (${products.createdAt} = ${new Date(cursorSortValue)} AND ${products.id} > ${cursorId})`
        );
        break;
      case "relevance":
      default:
        conditions.push(sql`${products.id} > ${cursorId}`);
    }
  }

  return conditions;
}

/**
 * Construit la clause ORDER BY en fonction de l'option de tri et du terme de recherche.
 */
function buildOrderBy(sort: SortOption, searchTerm?: string): SQL {
  const baseOrder = sql`${products.id} ASC`; // Tri stable par id

  if (sort === "relevance" && (searchTerm?.trim()?.length ?? 0) > 0) {
    const searchLower = (searchTerm ?? "").toLowerCase().trim().replace(/ /g, " & ");
    return sql`ts_rank(
      to_tsvector('french', COALESCE(${products.name}, '') || ' ' || COALESCE(${products.description}, '')),
      to_tsquery('french', ${searchLower})
    ) DESC, ${baseOrder}`;
  }

  switch (sort) {
    case "price_asc":
      return sql`${products.price} ASC, ${baseOrder}`;
    case "price_desc":
      return sql`${products.price} DESC, ${baseOrder}`;
    case "newest":
      return sql`${products.createdAt} DESC, ${baseOrder}`;
    case "popularity":
      return sql`(SELECT COUNT(*) FROM ${orderItems} WHERE ${orderItems.productId} = ${products.id}) DESC, ${baseOrder}`;
    case "rating_desc":
      return sql`(SELECT AVG(${reviews.rating}) FROM ${reviews} WHERE ${reviews.productId} = ${products.id}) DESC NULLS LAST, ${baseOrder}`;
    case "stock_desc":
      return sql`(SELECT ${productStocks.availableStock} FROM ${productStocks} WHERE ${productStocks.productId} = ${products.id} LIMIT 1) DESC NULLS LAST, ${baseOrder}`;
    case "discount_desc":
      return sql`(SELECT ${promotions.discountPercentage} FROM ${promotions} JOIN ${productPromotions} ON ${promotions.id} = ${productPromotions.promotionId} WHERE ${productPromotions.productId} = ${products.id} LIMIT 1) DESC NULLS LAST, ${baseOrder}`;
    default:
      return baseOrder;
  }
}

/**
 * Recherche des produits avec filtres, tri et pagination par curseur, avec mise en cache Redis.
 */
export async function searchProducts({
  filters = {},
  sort = "relevance",
  pagination = { limit: 8, cursor: null },
}: SearchParams = {}): Promise<SearchResult> {
  const cacheKey = `search:${JSON.stringify({ filters, sort, pagination })}`;

  try {
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return cachedResult as SearchResult;
    }

    if (pagination.limit <= 0) {
      throw new Error("La limite de pagination doit être positive.");
    }

    const whereConditions = buildWhereConditions(filters, sort, pagination.cursor);

    // Calcul du total sans curseur pour refléter tous les produits disponibles
    const totalQueryConditions = buildWhereConditions(filters, sort); // Sans cursor
    const totalQuery = await db
      .select({ count: sql<number>`COUNT(${products.id})` })
      .from(products)
      .where(and(...totalQueryConditions));
    const total = Number(totalQuery[0]?.count ?? 0);

    if (total === 0) {
      console.log("Aucun produit trouvé.");
      return { products: [], total: 0, nextCursor: null };
    }

    const orderBy = buildOrderBy(sort, filters.searchTerm);

    const query = db
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
        images: sql`COALESCE((
          SELECT json_agg(json_build_object(
            'id', pi.id,
            'imageUrl', pi.image_url,
            'productId', pi.product_id
          ))
          FROM ${TABLES.productImages}
          WHERE pi.product_id = "products"."id"
        ), '[]'::json) AS images`,
        variants: sql`COALESCE((
          SELECT json_agg(json_build_object(
            'id', pv.id,
            'variantType', pv.variant_type,
            'variantValue', pv.variant_value,
            'price', pv.price,
            'stock', pv.stock,
            'productId', pv.product_id
          ))
          FROM ${TABLES.productVariants}
          WHERE pv.product_id = "products"."id"
        ), '[]'::json) AS variants`,
        categories: sql`COALESCE((
          SELECT json_agg(json_build_object(
            'id', pc.id,
            'name', pc.name
          ))
          FROM ${TABLES.productCategories}
          INNER JOIN ${productCategoryRelation} pcr ON pc.id = pcr.category_id
          WHERE pcr.product_id = "products"."id"
        ), '[]'::json) AS categories`,
        promotions: sql`COALESCE((
          SELECT json_agg(json_build_object(
            'id', pp.id,
            'promotionId', pp.promotion_id,
            'productId', pp.product_id,
            'discountPercentage', p.discount_percentage
          ))
          FROM ${TABLES.productPromotions}
          INNER JOIN ${promotions} p ON pp.promotion_id = p.id
          WHERE pp.product_id = "products"."id"
        ), '[]'::json) AS promotions`,
        stock: sql`COALESCE((
          SELECT json_build_object(
            'id', ps.id,
            'stockLevel', ps.stock_level,
            'reservedStock', ps.reserved_stock,
            'availableStock', ps.available_stock,
            'productId', ps.product_id
          )
          FROM ${TABLES.productStocks}
          WHERE ps.product_id = "products"."id"
          LIMIT 1
        ), '{}'::json) AS stock`,
      })
      .from(products)
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(pagination.limit);

    const productList = await query;

    const lastProduct = productList[productList.length - 1];
    const nextCursor =
      productList.length === pagination.limit && productList.length > 0
        ? { id: lastProduct.id.toString(), sortValue: getSortValue(lastProduct as Product, sort) }
        : null;

    const result: SearchResult = {
      products: productList as Product[],
      total,
      nextCursor,
      metadata: {
        filtersApplied: filters,
        sortApplied: sort,
        paginationApplied: pagination,
      },
    };

    await redis.set(cacheKey, result, { ex: 300 });
    return result;
  } catch (error: unknown) {
    console.error("Erreur lors de la recherche des produits :", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    throw new Error(`Impossible de rechercher les produits : ${errorMessage}`);
  }
}

export async function invalidateProductCache(productId: number) {
  const cacheKeys: any = await redis.keys(`search:*"id":${productId}*`);
  if (cacheKeys.length > 0) {
    await redis.del(cacheKeys);
    console.log(`Cache invalidé pour ${cacheKeys.length} clés liées au produit ${productId}`);
  }
}