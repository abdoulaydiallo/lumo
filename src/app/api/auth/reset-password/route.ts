import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResets } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword } from "@/lib/utils";

// Forcer le runtime Node.js
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token et mot de passe requis" }, { status: 400 });
    }

    const [reset] = await db
      .select({ userId: passwordResets.userId })
      .from(passwordResets)
      .where(and(
        eq(passwordResets.token, token),
        gt(passwordResets.expiresAt, new Date())
      ))
      .limit(1);

    if (!reset) {
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, reset.userId));

    await db.delete(passwordResets).where(eq(passwordResets.token, token));

    return NextResponse.json({ message: "Mot de passe réinitialisé avec succès" }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la réinitialisation" }, { status: 500 });
  }
}