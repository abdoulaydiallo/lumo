import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import * as queries from "@/features/reviews/api/queries";
import * as actions from "@/features/reviews/api/actions";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = Number(searchParams.get("productId"));
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: "productId invalide" }, { status: 400 });
  }

  try {
    const result = await queries.getReviewsByProductId(productId, { limit, offset });
    return NextResponse.json(result);
  } catch {
    console.error("Erreur dans GET /api/reviews:");
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { productId, rating, comment } = await req.json();

  if (!productId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const result = await actions.addReview(user.id, Number(productId), Number(rating), comment);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message === "Vous avez déjà laissé un avis pour ce produit.") {
      return NextResponse.json({ error: error.message }, { status: 409 }); // 409 Conflict
    }
    console.error("Erreur dans POST /api/reviews:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}