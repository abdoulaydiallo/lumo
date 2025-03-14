import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, productStocks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { userId, productId, quantity } = await req.json();

  if (isNaN(userId) || user.id !== userId || !productId || quantity < 1) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    // Vérifier le stock disponible
    const [stock] = await db
      .select({ availableStock: productStocks.availableStock })
      .from(productStocks)
      .where(eq(productStocks.productId, productId))
      .limit(1);

    if (!stock || stock.availableStock < quantity) {
      return NextResponse.json({ error: "Stock insuffisant" }, { status: 400 });
    }

    await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));

    return NextResponse.json({ success: true, message: "Quantité mise à jour" });
  } catch (error) {
    console.error("Erreur dans PATCH /api/cart/update-quantity:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}