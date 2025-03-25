// app/api/products/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
    stores, products, productStocks,
    productImages,
    productCategories,
    promotions, productPromotions,
    productCategoryRelation
} from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = Number(session.user.id);

  // Récupérer les stores de l'utilisateur
  const userStores = await db.select().from(stores).where(eq(stores.userId, userId));
  const storeIds = userStores.map((store) => store.id);

  // Récupérer les produits
  const userProducts = await db
    .select()
    .from(products)
    .where(storeIds.length > 0 ? and(...storeIds.map((id) => eq(products.storeId, id))) : eq(products.storeId, -1));

  // Récupérer les images, variantes, promotions, et catégories associées
  const productIds = userProducts.map((p) => p.id);
  const userProductImages = await db
    .select()
    .from(productImages)
    .where(productIds.length > 0 ? and(...productIds.map((id) => eq(productImages.productId, id))) : eq(productImages.productId, -1));
  const userProductStocks = await db
    .select()
    .from(productStocks)
    .where(productIds.length > 0 ? and(...productIds.map((id) => eq(productStocks.productId, id))) : eq(productStocks.productId, -1));
  const userProductPromotions = await db
    .select()
    .from(productPromotions)
    .where(productIds.length > 0 ? and(...productIds.map((id) => eq(productPromotions.productId, id))) : eq(productPromotions.productId, -1));
  const userPromotions = await db
    .select()
    .from(promotions)
    .where(userProductPromotions.length > 0 ? and(...userProductPromotions.map((pp) => eq(promotions.id, pp.promotionId as number))) : eq(promotions.id, -1));
  const userProductCategoryRelations = await db
    .select()
    .from(productCategoryRelation)
    .where(productIds.length > 0 ? and(...productIds.map((id) => eq(productCategoryRelation.productId, id))) : eq(productCategoryRelation.productId, -1));
  const userProductCategories = await db
    .select()
    .from(productCategories)
    .where(userProductCategoryRelations.length > 0 ? and(...userProductCategoryRelations.map((pcr) => eq(productCategories.id, pcr.categoryId as number))) : eq(productCategories.id, -1));

  return NextResponse.json({
    products: userProducts,
    images: userProductImages,
    variants: userProductStocks.map((stock) => ({
      id: stock.id,
      productId: stock.productId,
      variantType: "stock", // Simplification pour l'exemple
      variantValue: "default",
      price: userProducts.find((p) => p.id === stock.productId)?.price || 0,
      stock: stock.availableStock,
      updatedAt: stock.updatedAt,
    })),
    promotions: userPromotions,
    productPromotions: userProductPromotions,
    categories: userProductCategories,
    productCategoryRelations: userProductCategoryRelations,
  });
}