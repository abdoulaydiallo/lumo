// @/features/products/api/types.ts
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
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

export type Product = InferSelectModel<typeof products> & {
  images: ProductImage[];
  variants: ProductVariant[];
  categories: ProductCategory[];
  promotions: ProductPromotion[] | any;
  stock?: ProductStock;
};

export type NewProduct = InferInsertModel<typeof products>;

export type ProductImage = InferSelectModel<typeof productImages>;
export type NewProductImage = InferInsertModel<typeof productImages>;

export type ProductVariant = InferSelectModel<typeof productVariants>;
export type NewProductVariant = InferInsertModel<typeof productVariants>;

export type ProductCategory = InferSelectModel<typeof productCategories>;
export type NewProductCategory = InferInsertModel<typeof productCategories>;

export type ProductCategoryRelation = InferSelectModel<typeof productCategoryRelation>;
export type NewProductCategoryRelation = InferInsertModel<typeof productCategoryRelation>;

export type Promotion = InferSelectModel<typeof promotions>;
export type NewPromotion = InferInsertModel<typeof promotions>;

export type ProductPromotion = InferSelectModel<typeof productPromotions> & {
  promotion: Promotion;
};
export type NewProductPromotion = InferInsertModel<typeof productPromotions>;

export type ProductStock = InferSelectModel<typeof productStocks>;
export type NewProductStock = InferInsertModel<typeof productStocks>;

export interface FilterOptions {
  storeId?: number;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  promotionId?: number;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "newest" | "popularity";
  inStock?: boolean;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

// Fonctions utilitaires (déjà définies ou à définir ailleurs)
export declare function getProductImages(productId: number): Promise<ProductImage[]>;
export declare function getProductVariants(productId: number): Promise<ProductVariant[]>;
export declare function getProductCategories(productId: number): Promise<ProductCategory[]>;
export declare function getProductPromotions(productId: number): Promise<ProductPromotion[]>;
export declare function getProductStock(productId: number): Promise<ProductStock>;