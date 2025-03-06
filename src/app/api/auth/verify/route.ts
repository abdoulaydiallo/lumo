import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

// Forcer le runtime Node.js (si nécessaire pour d'autres dépendances)
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token requis" }, { status: 400 });
    }

    const [verification] = await db
      .select({ userId: verificationTokens.userId })
      .from(verificationTokens)
      .where(and(
        eq(verificationTokens.token, token),
        gt(verificationTokens.expires, new Date())
      ))
      .limit(1);

    if (!verification) {
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 400 });
    }

    await db
      .update(users)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(users.id, verification.userId));

    await db.delete(verificationTokens).where(eq(verificationTokens.token, token));

    return NextResponse.json({ message: "Compte vérifié avec succès" }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la vérification:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la vérification" }, { status: 500 });
  }
}