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
  promotions: ProductPromotion[];
  stock?: ProductStock; // Ajout de la relation avec productStocks
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