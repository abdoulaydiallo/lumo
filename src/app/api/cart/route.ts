import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import * as queries from "@/features/cart/api/queries";
import * as actions from "@/features/cart/api/actions";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = Number(searchParams.get("userId"));

  if (isNaN(userId) || user.id !== userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const cart = await queries.getUserCart(userId);
    return NextResponse.json(cart);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { productId, quantity = 1, variantId } = await req.json();

  if (!productId || quantity < 1) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const result = await actions.addToCart(user.id, productId, quantity, variantId);
    return NextResponse.json(result);
  } catch {
    console.error("Erreur dans POST /api/cart:");
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = Number(searchParams.get("productId"));

  if (isNaN(productId)) {
    return NextResponse.json({ error: "productId invalide" }, { status: 400 });
  }

  try {
    const result = await actions.removeFromCart(user.id, productId);
    return NextResponse.json(result);
  } catch {
    console.error("Erreur dans DELETE /api/cart:");
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}