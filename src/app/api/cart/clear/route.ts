import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { userId } = await req.json();

  if (isNaN(userId) || user.id !== userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return NextResponse.json({ success: true, message: "Panier vidé" });
  } catch {
    console.error("Erreur dans DELETE /api/cart/clear:",);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}