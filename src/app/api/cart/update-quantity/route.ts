import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, productStocks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" }, 
        { status: 401 }
      );
    }

    // Check content type
    const contentType = req.headers.get("content-type");
    if (contentType !== "application/json") {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide" },
        { status: 400 }
      );
    }

    const { userId, productId, quantity } = body;

    if (!userId || !productId || typeof quantity !== "number") {
      return NextResponse.json(
        { error: "Données requises manquantes" },
        { status: 400 }
      );
    }

    if (user.id !== userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: "La quantité doit être au moins 1" },
        { status: 400 }
      );
    }

    // Check available stock
    const [stock] = await db
      .select({ availableStock: productStocks.availableStock })
      .from(productStocks)
      .where(eq(productStocks.productId, productId))
      .limit(1);

    if (!stock) {
      return NextResponse.json(
        { error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    if (stock.availableStock < quantity) {
      return NextResponse.json(
        { 
          error: "Stock insuffisant",
          availableStock: stock.availableStock 
        },
        { status: 400 }
      );
    }

    // Update cart item
    await db
      .update(cartItems)
      .set({ 
        quantity, 
        updatedAt: new Date() 
      })
      .where(
        and(
          eq(cartItems.userId, userId), 
          eq(cartItems.productId, productId)
        )
      );

    return NextResponse.json({ 
      success: true, 
      message: "Quantité mise à jour",
      availableStock: stock.availableStock
    });

  } catch (error) {
    console.error("Erreur dans PATCH /api/cart/update-quantity:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}