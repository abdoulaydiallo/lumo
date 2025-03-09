// @/app/api/stores/[storeId]/promotions/route.ts
import { NextResponse } from "next/server";
import { getPromotionsByStoreId } from "@/features/promotions/api/queries";
import { markExpiredPromotions } from "@/features/promotions/api/actions";
import { auth } from "@/lib/auth";
import { getStoreById } from "@/features/stores/api/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const filter = (searchParams.get("filter") as "active" | "inactive" | "expired" | "all") || "all";
  const limit = 10;
  const offset = (page - 1) * limit;

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
    await markExpiredPromotions(storeId);
    const data = await getPromotionsByStoreId(storeId, limit, offset, filter);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /promotions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}