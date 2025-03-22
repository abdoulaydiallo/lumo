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
  popularity: number; // Nombre de commandes (basé sur orderItems)
  rating: number | null; // Moyenne des avis (basé sur reviews)
  relevanceScore?: number; // Score de pertinence (optionnel, pour "relevance")
}

export interface SuggestionResult {
  suggestions: string[];
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
      return product.popularity.toString(); // Nombre de commandes
    case "rating_desc":
      return (product.rating ?? 0).toString(); // Moyenne des avis, 0 si null
    case "stock_desc":
      return product.stock?.availableStock?.toString() || "0";
    case "discount_desc":
      return product.promotions[0]?.discountPercentage?.toString() || "0";
    case "relevance":
      return product.relevanceScore?.toString() ?? product.id.toString(); // Score de pertinence, sinon ID
    default:
      return product.id.toString();
  }
}

/**
 * Construit les conditions SQL WHERE en fonction des filtres et du curseur composite.
 */

function buildWhereConditions(filters: SearchFilters, sort: SortOption, cursor?: Pagination["cursor"]): SQL[] {
  const conditions: SQL[] = [];

  // Filtre storeId
  if (filters.storeId !== undefined && filters.storeId >= 0) {
    conditions.push(sql`${products.storeId} = ${filters.storeId}`);
  }

  // Filtre minPrice (entier positif ou zéro)
  if (filters.minPrice !== undefined && Number.isInteger(filters.minPrice) && filters.minPrice >= 0) {
    conditions.push(sql`${products.price} >= ${filters.minPrice}`);
  }

  // Filtre maxPrice (entier positif ou zéro, cohérent avec minPrice)
  if (filters.maxPrice !== undefined && Number.isInteger(filters.maxPrice) && filters.maxPrice >= 0 &&
      (filters.minPrice === undefined || filters.maxPrice >= filters.minPrice)) {
    conditions.push(sql`${products.price} <= ${filters.maxPrice}`);
  }

  // Filtre inStock
  if (filters.inStock !== undefined) {
    conditions.push(
      filters.inStock
        ? sql`${products.stockStatus} IN ('in_stock', 'low_stock')`
        : sql`${products.stockStatus} = 'out_of_stock' OR ${products.stockStatus} IS NULL`
    );
  }

  // Filtre searchTerm (recherche textuelle)
  if (filters.searchTerm?.trim() && filters.searchTerm.trim().length >= 2) {
    const cleanedSearchTerm = filters.searchTerm
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " & ");
    conditions.push(sql`to_tsvector('french', COALESCE(${products.name}, '') || ' ' || COALESCE(${products.description}, '')) 
      @@ to_tsquery('french', ${cleanedSearchTerm + ':*'})`);
  }

  // Filtre categoryIds
  if (filters.categoryIds?.length! > 0) {
    const validCategoryIds = filters.categoryIds!.filter(id => Number.isInteger(id) && id >= 0);
    if (validCategoryIds.length > 0) {
      conditions.push(
        sql`${products.id} IN (
          SELECT ${productCategoryRelation.productId}
          FROM ${productCategoryRelation}
          WHERE ${productCategoryRelation.categoryId} IN (${sql.join(validCategoryIds, sql`,`)})
        )`
      );
    }
  }

  // Filtre promotionId
  if (filters.promotionId !== undefined && Number.isInteger(filters.promotionId) && filters.promotionId >= 0) {
    conditions.push(
      sql`${products.id} IN (
        SELECT ${productPromotions.productId}
        FROM ${productPromotions}
        WHERE ${productPromotions.promotionId} = ${filters.promotionId}
      )`
    );
  }

  // Filtre variantType et variantValue
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

  // Filtre minRating
  if (filters.minRating !== undefined && Number.isInteger(filters.minRating) && filters.minRating >= 0 && filters.minRating <= 5) {
    conditions.push(
      sql`${products.id} IN (
        SELECT ${reviews.productId}
        FROM ${reviews}
        GROUP BY ${reviews.productId}
        HAVING AVG(${reviews.rating}) >= ${filters.minRating}
      )`
    );
  }

  // Filtre region
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

  // Filtre availableStockMin
  if (filters.availableStockMin !== undefined && Number.isInteger(filters.availableStockMin) && filters.availableStockMin >= 0) {
    conditions.push(
      sql`${products.id} IN (
        SELECT ${productStocks.productId}
        FROM ${productStocks}
        WHERE ${productStocks.availableStock} >= ${filters.availableStockMin}
      )`
    );
  }

  // Gestion du curseur
  if (cursor) {
    const cursorId = parseInt(cursor.id);
    if (!Number.isInteger(cursorId) || cursorId < 0) {
      throw new Error("ID du curseur invalide");
    }
    const cursorSortValue = cursor.sortValue;

    switch (sort) {
      case "price_asc":
        conditions.push(
          sql`(${products.price} > ${parseInt(cursorSortValue)}) OR 
             (${products.price} = ${parseInt(cursorSortValue)} AND ${products.id} > ${cursorId})`
        );
        break;
      case "price_desc":
        conditions.push(
          sql`(${products.price} < ${parseInt(cursorSortValue)}) OR 
             (${products.price} = ${parseInt(cursorSortValue)} AND ${products.id} > ${cursorId})`
        );
        break;
      case "newest":
        conditions.push(
          sql`(${products.createdAt} < ${new Date(cursorSortValue)}) OR 
             (${products.createdAt} = ${new Date(cursorSortValue)} AND ${products.id} > ${cursorId})`
        );
        break;
      case "popularity":
        conditions.push(
          sql`(COALESCE((
            SELECT COUNT(${orderItems.id})
            FROM ${orderItems}
            WHERE ${orderItems.productId} = ${products.id}
          ), 0) < ${parseInt(cursorSortValue)}) OR 
          (COALESCE((
            SELECT COUNT(${orderItems.id})
            FROM ${orderItems}
            WHERE ${orderItems.productId} = ${products.id}
          ), 0) = ${parseInt(cursorSortValue)} AND ${products.id} > ${cursorId})`
        );
        break;
      case "rating_desc":
        conditions.push(
          sql`(COALESCE((
            SELECT AVG(${reviews.rating})
            FROM ${reviews}
            WHERE ${reviews.productId} = ${products.id}
          ), 0) < ${parseFloat(cursorSortValue)}) OR 
          (COALESCE((
            SELECT AVG(${reviews.rating})
            FROM ${reviews}
            WHERE ${reviews.productId} = ${products.id}
          ), 0) = ${parseFloat(cursorSortValue)} AND ${products.id} > ${cursorId})`
        );
        break;
      case "stock_desc":
        conditions.push(
          sql`(COALESCE((
            SELECT ${productStocks.availableStock}
            FROM ${productStocks}
            WHERE ${productStocks.productId} = ${products.id}
            LIMIT 1
          ), 0) < ${parseInt(cursorSortValue)}) OR 
          (COALESCE((
            SELECT ${productStocks.availableStock}
            FROM ${productStocks}
            WHERE ${productStocks.productId} = ${products.id}
            LIMIT 1
          ), 0) = ${parseInt(cursorSortValue)} AND ${products.id} > ${cursorId})`
        );
        break;
      case "discount_desc":
        conditions.push(
          sql`(COALESCE((
            SELECT ${promotions.discountPercentage}
            FROM ${promotions}
            JOIN ${productPromotions} ON ${promotions.id} = ${productPromotions.promotionId}
            WHERE ${productPromotions.productId} = ${products.id}
            LIMIT 1
          ), 0) < ${parseInt(cursorSortValue)}) OR 
          (COALESCE((
            SELECT ${promotions.discountPercentage}
            FROM ${promotions}
            JOIN ${productPromotions} ON ${promotions.id} = ${productPromotions.promotionId}
            WHERE ${productPromotions.productId} = ${products.id}
            LIMIT 1
          ), 0) = ${parseInt(cursorSortValue)} AND ${products.id} > ${cursorId})`
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
        popularity: sql`COALESCE((
          SELECT COUNT(${orderItems.id})
          FROM ${orderItems}
          WHERE ${orderItems.productId} = "products"."id"
        ), 0) AS popularity`,
        rating: sql`(
          SELECT AVG(${reviews.rating})
          FROM ${reviews}
          WHERE ${reviews.productId} = "products"."id"
        ) AS rating`,
        relevanceScore: sort === "relevance" && filters.searchTerm?.trim()
          ? sql`ts_rank(
              to_tsvector('french', COALESCE(${products.name}, '') || ' ' || COALESCE(${products.description}, '')),
              to_tsquery('french', ${(filters.searchTerm ?? "").toLowerCase().trim().replace(/ /g, " & ")})
            ) AS relevance_score`
          : sql`NULL AS relevance_score`,
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

/**
 * Récupère des suggestions de recherche basées sur un terme partiel.
 * @param query Terme de recherche partiel (minimum 2 caractères).
 * @param limit Nombre maximum de suggestions (par défaut 8).
 * @returns Liste de suggestions.
 */
export async function getSearchSuggestions(query: string, limit: number = 8): Promise<SuggestionResult> {
  const cacheKey = `suggestions:${query.toLowerCase().trim()}:${limit}`;

  try {
    const cachedSuggestions = await redis.get(cacheKey);
    if (cachedSuggestions) {
      return cachedSuggestions as SuggestionResult;
    }

    if (!query?.trim() || query.trim().length < 2) {
      return { suggestions: [] };
    }

    const cleanedQuery = query
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " & ") + ":*";

    const suggestionsQuery = db
      .selectDistinct({
        name: products.name,
        rank: sql`ts_rank(
          to_tsvector('french', COALESCE(${products.name}, '') || ' ' || COALESCE(${products.description}, '')),
          to_tsquery('french', ${cleanedQuery})
        )`.as("rank"), // Ajouter ts_rank comme colonne
      })
      .from(products)
      .where(
        sql`to_tsvector('french', COALESCE(${products.name}, '') || ' ' || COALESCE(${products.description}, '')) 
        @@ to_tsquery('french', ${cleanedQuery})`
      )
      .orderBy(sql`rank DESC`) // Référencer la colonne rank
      .limit(limit);

    const result = await suggestionsQuery;
    const suggestions = result.map((item) => item.name);

    const suggestionResult: SuggestionResult = { suggestions };
    await redis.set(cacheKey, suggestionResult, { ex: 300 });

    return suggestionResult;
  } catch (error: unknown) {
    console.error("Erreur lors de la récupération des suggestions :", error);
    return { suggestions: [] };
  }
}

/**
 * Invalide le cache des suggestions.
 */
export async function invalidateSuggestionsCache(query: string) {
  const cacheKeys: any = await redis.keys(`suggestions:${query.toLowerCase().trim()}:*`);
  if (cacheKeys.length > 0) {
    await redis.del(cacheKeys);
    console.log(`Cache invalidé pour ${cacheKeys.length} clés liées à la requête "${query}"`);
  }
}

export async function invalidateProductCache(productId: number) {
  const cacheKeys: any = await redis.keys(`search:*"id":${productId}*`);
  if (cacheKeys.length > 0) {
    await redis.del(cacheKeys);
    console.log(`Cache invalidé pour ${cacheKeys.length} clés liées au produit ${productId}`);
  }
}