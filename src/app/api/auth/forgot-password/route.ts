import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email"; // Import depuis le nouveau fichier
import crypto from "crypto";

// Forcer le runtime Node.js
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ message: "Si cet email existe, un lien de réinitialisation a été envoyé." }, { status: 200 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await db.insert(passwordResets).values({
      userId: user.id,
      token,
      expiresAt,
      createdAt: new Date(),
    });

    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    await sendEmail(
      user.email as string,
      "Réinitialisation de votre mot de passe",
      `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${resetLink}\nCe lien expire dans 1 heure.`,
      `<p>Cliquez sur ce lien pour réinitialiser votre mot de passe : <a href="${resetLink}">${resetLink}</a></p><p>Ce lien expire dans 1 heure.</p>`
    );

    return NextResponse.json({ message: "Si cet email existe, un lien de réinitialisation a été envoyé." }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la demande" }, { status: 500 });
  }
}