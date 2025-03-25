// @/app/api/stores/user/[userId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStoreByUserId } from "@/features/stores/api/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const resolvedParams = await params;
  const userId = Number(resolvedParams.userId);

  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Non authent 401: Non authentifié" }, { status: 401 });
  }

  // Vérifie que l'utilisateur connecté est bien celui qui fait la requête
  if (Number(session.user.id) !== userId) {
    return NextResponse.json({ error: "403: Non autorisé" }, { status: 403 });
  }

  try {
    const store = await getStoreByUserId(userId);
    if (!store) {
      return NextResponse.json({ error: "404: Magasin non trouvé" }, { status: 404 });
    }
    return NextResponse.json(store, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /api/stores/user/[userId]:", error);
    return NextResponse.json({ error: "500: Erreur serveur" }, { status: 500 });
  }
}