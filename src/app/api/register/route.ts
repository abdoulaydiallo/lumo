import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { hashPassword } from "@/lib/utils";
import { registerSchema } from "@/lib/utils/schemas";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      const errorMap = validation.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          error: "Données invalides",
          details: errorMap,
        },
        { status: 400 }
      );
    }

    const { email, password, name, role, phoneNumber } = validation.data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    // Hacher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Insérer le nouvel utilisateur
    const newUserResult = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      role,
      phoneNumber,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: users.id });
    
    if (!newUserResult.length || !newUserResult[0]?.id) {
      throw new Error("Échec de la récupération de l'ID utilisateur après inscription");
    }
    
    const newUser = newUserResult[0];

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // expire dans 24h

    await db.insert(verificationTokens).values({
      identifier: email,
      userId: newUser.id,
      token: token,
      expires
    })

    const verifyLink = `${process.env.NEXTAUTH_URL}/verify?token=${token}`;

    await sendEmail(
      email,
      "Vérification de votre compte",
      `Veuillez vérifier votre compte en cliquant sur ce lien : ${verifyLink}\nCe lien expire dans 24 heures.`,
      `<p>Veuillez vérifier votre compte en cliquant sur ce lien : <a href="${verifyLink}">${verifyLink}</a></p><p>Ce lien expire dans 24 heures.</p>`
    );
    
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription" },
      { status: 500 }
    );
  }
}