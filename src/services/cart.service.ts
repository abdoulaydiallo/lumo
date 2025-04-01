import { db } from "@/lib/db";
import { cartItems, productStocks, productVariants, products } from "@/lib/db/schema";
import { logActivity } from "./logs.service";
import { and, eq, sql } from "drizzle-orm";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

export interface CartItem {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  variantId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  productName?: string;
  productPrice?: number;
  variantDetails?: {
    type: string;
    value: string;
    price: number;
  };
}

export interface CartDetails {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
}

export interface AddToCartParams {
  userId: number;
  productId: number;
  quantity: number;
  variantId?: number;
}

export const addToCart = async ({
  userId,
  productId,
  quantity,
  variantId,
}: AddToCartParams): Promise<CartItem> => {
  try {
    if (quantity <= 0) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "La quantité doit être supérieure à zéro"
      );
    }

    return await db.transaction(async (tx) => {
      // Vérifier le produit
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        throw new ServiceError(
          ERROR_CODES.NOT_FOUND,
          "Produit non trouvé"
        );
      }

      // Vérifier le stock
      let availableStock: number;
      if (variantId) {
        const [variant] = await tx
          .select()
          .from(productVariants)
          .where(
            and(
              eq(productVariants.id, variantId),
              eq(productVariants.productId, productId)
            )
          )
          .limit(1);

        if (!variant) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            "Variante non trouvée pour ce produit"
          );
        }
        availableStock = variant.stock;
      } else {
        const [stock] = await tx
          .select()
          .from(productStocks)
          .where(eq(productStocks.productId, productId))
          .limit(1);

        if (!stock) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            "Information de stock non trouvée"
          );
        }
        availableStock = stock.availableStock;
      }

      // Vérifier l'article existant dans le panier
      const [existingItem] = await tx
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.userId, userId),
            eq(cartItems.productId, productId),
            variantId
              ? eq(cartItems.variantId, variantId)
              : eq(cartItems.variantId, sql`NULL`)
          )
        )
        .limit(1);

      const totalQuantity = existingItem
        ? existingItem.quantity + quantity
        : quantity;

      if (totalQuantity > availableStock) {
        throw new ServiceError(
          ERROR_CODES.INSUFFICIENT_STOCK,
          `Stock insuffisant (${availableStock} disponible${
            availableStock > 1 ? "s" : ""
          })`
        );
      }

      // Mettre à jour ou créer l'article du panier
      let cartItem: CartItem;
      if (existingItem) {
        [cartItem] = await tx
          .update(cartItems)
          .set({
            quantity: totalQuantity,
            updatedAt: new Date(),
          })
          .where(eq(cartItems.id, existingItem.id))
          .returning();
      } else {
        [cartItem] = await tx
          .insert(cartItems)
          .values({
            userId,
            productId,
            quantity,
            variantId,
          })
          .returning();
      }

      // Mettre à jour le stock
      if (variantId) {
        await tx
          .update(productVariants)
          .set({
            stock: availableStock - quantity,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, variantId));
      } else {
        await tx
          .update(productStocks)
          .set({
            reservedStock: sql`${productStocks.reservedStock} + ${quantity}`,
            availableStock: sql`${productStocks.availableStock} - ${quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(productStocks.productId, productId));
      }

      await logActivity(
        userId,
        existingItem ? "cart_update" : "cart_add",
        cartItem
      );

      return cartItem;
    });
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      "Erreur lors de l'ajout au panier",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};

export const removeFromCart = async (
  userId: number,
  cartItemId: number
): Promise<void> => {
  try {
    return await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.id, cartItemId),
            eq(cartItems.userId, userId)
          )
        )
        .limit(1);

      if (!item) {
        throw new ServiceError(
          ERROR_CODES.NOT_FOUND,
          "Article non trouvé dans le panier"
        );
      }

      await tx.delete(cartItems).where(eq(cartItems.id, cartItemId));

      // Restocker
      if (item.variantId) {
        await tx
          .update(productVariants)
          .set({
            stock: sql`${productVariants.stock} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, item.variantId));
      } else {
        await tx
          .update(productStocks)
          .set({
            reservedStock: sql`${productStocks.reservedStock} - ${item.quantity}`,
            availableStock: sql`${productStocks.availableStock} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(productStocks.productId, item.productId));
      }

      await logActivity(userId, "cart_remove", { cartItemId });
    });
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      "Erreur lors de la suppression du panier",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};

export const updateCartItemQuantity = async (
  userId: number,
  cartItemId: number,
  newQuantity: number
): Promise<CartItem> => {
  try {
    if (newQuantity <= 0) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        "La quantité doit être supérieure à zéro"
      );
    }

    return await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.id, cartItemId),
            eq(cartItems.userId, userId)
          )
        )
        .limit(1);

      if (!item) {
        throw new ServiceError(
          ERROR_CODES.NOT_FOUND,
          "Article non trouvé dans le panier"
        );
      }

      // Vérifier le stock disponible
      let availableStock: number;
      if (item.variantId) {
        const [variant] = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, item.variantId))
          .limit(1);

        if (!variant) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            "Variante non trouvée"
          );
        }
        availableStock = variant.stock + item.quantity; // On ajoute la quantité actuelle car elle va être libérée
      } else {
        const [stock] = await tx
          .select()
          .from(productStocks)
          .where(eq(productStocks.productId, item.productId))
          .limit(1);

        if (!stock) {
          throw new ServiceError(
            ERROR_CODES.NOT_FOUND,
            "Information de stock non trouvée"
          );
        }
        availableStock = stock.availableStock + item.quantity;
      }

      if (newQuantity > availableStock) {
        throw new ServiceError(
          ERROR_CODES.INSUFFICIENT_STOCK,
          `Stock insuffisant (${availableStock} disponible${
            availableStock > 1 ? "s" : ""
          })`
        );
      }

      // Calculer la différence de quantité
      const quantityDiff = newQuantity - item.quantity;

      // Mettre à jour l'article du panier
      const [updatedItem] = await tx
        .update(cartItems)
        .set({
          quantity: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, cartItemId))
        .returning();

      // Mettre à jour le stock
      if (item.variantId) {
        await tx
          .update(productVariants)
          .set({
            stock: sql`${productVariants.stock} - ${quantityDiff}`,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, item.variantId));
      } else {
        await tx
          .update(productStocks)
          .set({
            reservedStock: sql`${productStocks.reservedStock} + ${quantityDiff}`,
            availableStock: sql`${productStocks.availableStock} - ${quantityDiff}`,
            updatedAt: new Date(),
          })
          .where(eq(productStocks.productId, item.productId));
      }

      await logActivity(userId, "cart_update_quantity", {
        cartItemId,
        oldQuantity: item.quantity,
        newQuantity,
      });

      return updatedItem;
    });
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      "Erreur lors de la mise à jour de la quantité",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};

export const getCartDetails = async (
  userId: number
): Promise<CartDetails> => {
  try {
    const items = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId));

    if (items.length === 0) {
      return {
        items: [],
        totalItems: 0,
        subtotal: 0,
      };
    }

    // Récupérer les détails des produits et variantes
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const [product] = await db
          .select({ name: products.name, price: products.price })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        let variantDetails: { type: string; value: string; price: number } | undefined = undefined;
        if (item.variantId) {
          const [variant] = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.id, item.variantId))
            .limit(1);
          if (variant) {
            variantDetails = {
              type: variant.variantType,
              value: variant.variantValue,
              price: variant.price,
            };
          }
        }

        return {
          ...item,
          productName: product?.name,
          productPrice: product?.price,
          variantDetails: variantDetails ?? undefined,
        };
      })
    );

    // Calculer le total
    const subtotal = enrichedItems.reduce((sum, item) => {
      const price = item.variantDetails?.price ?? item.productPrice ?? 0;
      return sum + price * item.quantity;
    }, 0);

    return {
      items: enrichedItems,
      totalItems: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
    };
  } catch (error) {
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      "Erreur lors de la récupération du panier",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};

export const clearCart = async (userId: number): Promise<void> => {
  try {
    return await db.transaction(async (tx) => {
      const items = await tx
        .select()
        .from(cartItems)
        .where(eq(cartItems.userId, userId));

      if (items.length === 0) return;

      // Restocker tous les articles
      await Promise.all(
        items.map(async (item) => {
          if (item.variantId) {
            await tx
              .update(productVariants)
              .set({
                stock: sql`${productVariants.stock} + ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(productVariants.id, item.variantId));
          } else {
            await tx
              .update(productStocks)
              .set({
                reservedStock: sql`${productStocks.reservedStock} - ${item.quantity}`,
                availableStock: sql`${productStocks.availableStock} + ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(productStocks.productId, item.productId));
          }
        })
      );

      await tx.delete(cartItems).where(eq(cartItems.userId, userId));

      await logActivity(userId, "cart_clear", {
        itemsCount: items.length,
      });
    });
  } catch (error) {
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      "Erreur lors de la vidange du panier",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};

export { ServiceError };
