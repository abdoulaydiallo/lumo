import { NextRequest, NextResponse } from "next/server";
import * as actions from "@/features/wishlists/api/actions";
import * as queries from "@/features/wishlists/api/queries";
import { getUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = Number(searchParams.get("userId"));

  if (user.id !== userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const wishlist = await queries.getUserWishlist(userId);
    return NextResponse.json(wishlist);
  } catch (error:any) {
    console.error("Erreur dans GET /api/wishlists:", error); // Log détaillé
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { productId } = await req.json();

  try {
    const result = await actions.addToWishlist(user.id, productId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = Number(searchParams.get("productId"));

  try {
    const result = await actions.removeFromWishlist(user.id, productId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}