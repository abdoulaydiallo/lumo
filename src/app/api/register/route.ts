import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { hashPassword } from "@/lib/utils";
import { registerSchema } from "@/lib/utils/schemas";
import { eq } from "drizzle-orm";

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
    await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      role,
      phoneNumber,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription" },
      { status: 500 }
    );
  }
}