// @/app/api/stores/[storeId]/promotions/[promotionId]/route.ts
import { NextResponse } from "next/server";
import { getPromotionById } from "@/features/promotions/api/queries";
import { deletePromotion } from "@/features/promotions/api/actions";
import { auth } from "@/lib/auth";
import { getStoreById } from "@/features/stores/api/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; promotionId: string }> }
) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);
  const promotionId = Number(resolvedParams.promotionId);

  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const store = await getStoreById(storeId);
  if (!store) {
    return NextResponse.json({ error: "Magasin non trouvé" }, { status: 404 });
  }

  const isOwner = session.user.role === "store" && Number(session.user.id) === store.userId;
  if (!isOwner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const promotion = await getPromotionById(promotionId, storeId);
    if (!promotion) return NextResponse.json({ error: "Promotion non trouvée" }, { status: 404 });
    return NextResponse.json(promotion, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /promotion:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; promotionId: string }> }
) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);
  const promotionId = Number(resolvedParams.promotionId);

  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const store = await getStoreById(storeId);
  if (!store) {
    return NextResponse.json({ error: "Magasin non trouvé" }, { status: 404 });
  }

  const isOwner = session.user.role === "store" && Number(session.user.id) === store.userId;
  if (!isOwner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const promotion = await getPromotionById(promotionId, storeId);
    if (!promotion) {
      return NextResponse.json({ error: "Promotion non trouvée" }, { status: 404 });
    }

    await deletePromotion(promotionId, storeId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur dans DELETE /promotion:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}