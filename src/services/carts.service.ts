// @/services/carts.service.ts
import { db } from "@/lib/db";
import { cartItems, products, productVariants, productPromotions, promotions, productStocks } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

export interface CartItemInput {
  productId: number;
  variantId?: number;
  quantity: number;
  promoCode?: string;
}

export interface CartItem {
  id: number;
  userId: number;
  productId: number;
  variantId?: number;
  quantity: number;
  originalPrice: number;
  discountedPrice: number;
  productName: string;
  variantName?: string;
  stockAvailable: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export async function addToCart(userId: number, productId: number, quantity: number, variantId?: number): Promise<CartItem> {
  try {
    if (!productId || quantity <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "productId et quantity (> 0) sont requis");
    }

    const result = await db.transaction(async (tx) => {
      const [product] = await tx
        .select({
          name: products.name,
          price: products.price,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        throw new ServiceError(ERROR_CODES.NOT_FOUND, `Produit ${productId} non trouvé`);
      }

      let price = product.price;
      let stockAvailable: number;
      let variantName: string | undefined;
      let discount = 0;

      if (variantId) {
        const [variant] = await tx
          .select({
            price: productVariants.price,
            stock: productVariants.stock,
            name: sql<string>`concat(${productVariants.variantType}, ': ', ${productVariants.variantValue})`,
          })
          .from(productVariants)
          .where(eq(productVariants.id, variantId))
          .limit(1);

        if (!variant) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Variante ${variantId} non trouvée`);
        }
        if (variant.stock < quantity) {
          throw new ServiceError(ERROR_CODES.INSUFFICIENT_STOCK, `Stock insuffisant pour la variante ${variantId}`, {
            available: variant.stock,
            requested: quantity,
          });
        }
        price = variant.price;
        stockAvailable = variant.stock;
        variantName = variant.name;
      } else {
        const [stock] = await tx
          .select({ availableStock: productStocks.availableStock })
          .from(productStocks)
          .where(eq(productStocks.productId, productId))
          .limit(1);

        if (!stock || stock.availableStock < quantity) {
          throw new ServiceError(ERROR_CODES.INSUFFICIENT_STOCK, `Stock insuffisant pour le produit ${productId}`, {
            available: stock?.availableStock || 0,
            requested: quantity,
          });
        }
        stockAvailable = stock.availableStock;
      }

      const [existingItem] = await tx
        .select({ id: cartItems.id, quantity: cartItems.quantity })
        .from(cartItems)
        .where(
          and(
            eq(cartItems.userId, userId),
            eq(cartItems.productId, productId),
            variantId ? eq(cartItems.variantId, variantId) : sql`cart_items.variant_id IS NULL`
          )
        )
        .limit(1);

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > stockAvailable) {
          throw new ServiceError(ERROR_CODES.INSUFFICIENT_STOCK, "La quantité totale dépasse le stock disponible", {
            available: stockAvailable,
            requested: newQuantity,
          });
        }

        const [updatedItem] = await tx
          .update(cartItems)
          .set({ quantity: newQuantity, updatedAt: new Date() })
          .where(eq(cartItems.id, existingItem.id))
          .returning();

        return { ...updatedItem, price, discount, stockAvailable, productName: product.name, variantName };
      }

      const [newItem] = await tx
        .insert(cartItems)
        .values({
          userId,
          productId,
          variantId,
          quantity,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { ...newItem, price, discount, stockAvailable, productName: product.name, variantName };
    });

    return {
      ...result,
      variantId: result.variantId ?? undefined,
      originalPrice: result.price,
      discountedPrice: result.price - result.discount,
      productName: result.productName,
      variantName: result.variantName,
      stockAvailable: result.stockAvailable,
    };
  } catch (error) {
    throw error instanceof ServiceError
      ? error
      : new ServiceError(ERROR_CODES.DATABASE_ERROR, "Erreur lors de l'ajout au panier", {
          originalError: error instanceof Error ? error.message : String(error),
        });
  }
}

export async function getUserCart(userId: number): Promise<CartItem[]> {
  try {
    if (isNaN(userId) || userId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "ID utilisateur invalide");
    }

    const items = await db
      .select({
        id: cartItems.id,
        userId: cartItems.userId,
        productId: cartItems.productId,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        createdAt: cartItems.createdAt,
        updatedAt: cartItems.updatedAt,
        price: productVariants.price ?? products.price,
        productName: products.name,
        variantName: productVariants.id !== null
          ? sql<string>`concat(${productVariants.variantType}, ': ', ${productVariants.variantValue})`
          : sql`NULL`,
        stockAvailable: productVariants.stock ?? productStocks.availableStock,
      })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .leftJoin(productStocks, eq(productStocks.productId, cartItems.productId))
      .where(eq(cartItems.userId, userId));

    return items.map((item) => ({
      ...item,
      variantId: item.variantId ?? undefined,
      originalPrice: item.price || 0,
      discountedPrice: item.price || 0,
      variantName: typeof item.variantName === 'string' ? item.variantName : undefined,
      stockAvailable: item.stockAvailable || 0,
    }));
  } catch (error) {
    throw error instanceof ServiceError
      ? error
      : new ServiceError(ERROR_CODES.DATABASE_ERROR, "Erreur lors de la récupération du panier", {
          originalError: error instanceof Error ? error.message : String(error),
        });
  }
}

export async function removeFromCart(userId: number, productId: number): Promise<{ message: string }> {
  try {
    if (isNaN(productId) || productId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "productId invalide");
    }

    const [deletedItem] = await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
      .returning();

    if (!deletedItem) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Article avec productId ${productId} non trouvé dans le panier`);
    }

    return { message: "Article supprimé du panier" };
  } catch (error) {
    throw error instanceof ServiceError
      ? error
      : new ServiceError(ERROR_CODES.DATABASE_ERROR, "Erreur lors de la suppression du panier", {
          originalError: error instanceof Error ? error.message : String(error),
        });
  }
}

export async function clearCart(userId: number): Promise<{ message: string }> {
  try {
    if (isNaN(userId) || userId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "ID utilisateur invalide");
    }

    await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return { message: "Panier vidé" };
  } catch (error) {
    throw error instanceof ServiceError
      ? error
      : new ServiceError(ERROR_CODES.DATABASE_ERROR, "Erreur lors de la suppression du panier", {
          originalError: error instanceof Error ? error.message : String(error),
        });
  }
}

export async function updateCartQuantity(userId: number, productId: number, quantity: number): Promise<CartItem> {
  try {
    if (isNaN(productId) || productId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "productId invalide");
    }
    if (quantity <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "La quantité doit être positive");
    }

    const result = await db.transaction(async (tx) => {
      const [cartItem] = await tx
        .select({
          id: cartItems.id,
          userId: cartItems.userId,
          productId: cartItems.productId,
          variantId: cartItems.variantId,
          quantity: cartItems.quantity,
          createdAt: cartItems.createdAt,
          updatedAt: cartItems.updatedAt,
        })
        .from(cartItems)
        .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
        .limit(1);

      if (!cartItem) {
        throw new ServiceError(ERROR_CODES.NOT_FOUND, `Article avec productId ${productId} non trouvé dans le panier`);
      }

      const [product] = await tx
        .select({
          name: products.name,
          price: products.price,
        })
        .from(products)
        .where(eq(products.id, cartItem.productId))
        .limit(1);

      let price = product.price;
      let stockAvailable: number;
      let variantName: string | undefined;

      if (cartItem.variantId) {
        const [variant] = await tx
          .select({
            price: productVariants.price,
            stock: productVariants.stock,
            name: sql<string>`concat(${productVariants.variantType}, ': ', ${productVariants.variantValue})`,
          })
          .from(productVariants)
          .where(eq(productVariants.id, cartItem.variantId))
          .limit(1);

        if (!variant) {
          throw new ServiceError(ERROR_CODES.NOT_FOUND, `Variante ${cartItem.variantId} non trouvée`);
        }
        if (variant.stock < quantity) {
          throw new ServiceError(ERROR_CODES.INSUFFICIENT_STOCK, `Stock insuffisant pour la variante ${cartItem.variantId}`, {
            available: variant.stock,
            requested: quantity,
          });
        }
        price = variant.price;
        stockAvailable = variant.stock;
        variantName = variant.name;
      } else {
        const [stock] = await tx
          .select({ availableStock: productStocks.availableStock })
          .from(productStocks)
          .where(eq(productStocks.productId, cartItem.productId))
          .limit(1);

        if (!stock || stock.availableStock < quantity) {
          throw new ServiceError(ERROR_CODES.INSUFFICIENT_STOCK, `Stock insuffisant pour le produit ${cartItem.productId}`, {
            available: stock?.availableStock || 0,
            requested: quantity,
          });
        }
        stockAvailable = stock.availableStock;
      }

      const [updatedItem] = await tx
        .update(cartItems)
        .set({ quantity, updatedAt: new Date() })
        .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
        .returning();

      return {
        ...updatedItem,
        price,
        discount: 0, // No promo code in this route
        stockAvailable,
        productName: product.name,
        variantName,
      };
    });

    return {
      ...result,
      variantId: result.variantId ?? undefined,
      originalPrice: result.price,
      discountedPrice: result.price - result.discount,
      productName: result.productName,
      variantName: result.variantName,
      stockAvailable: result.stockAvailable,
    };
  } catch (error) {
    throw error instanceof ServiceError
      ? error
      : new ServiceError(ERROR_CODES.DATABASE_ERROR, "Erreur lors de la mise à jour de la quantité", {
          originalError: error instanceof Error ? error.message : String(error),
        });
  }
}