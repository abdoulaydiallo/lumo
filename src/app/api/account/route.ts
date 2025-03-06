import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
        phoneNumber: users.phoneNumber,
      })
      .from(users)
      .where(eq(users.id, Number(session.user.id)))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { name, image, phoneNumber } = await request.json();

    const [updatedUser] = await db
      .update(users)
      .set({
        name: name || undefined,
        image: image || undefined,
        phoneNumber: phoneNumber || undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, Number(session.user.id)))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
        phoneNumber: users.phoneNumber,
      });

    if (!updatedUser) {
      return NextResponse.json({ error: "Mise à jour échouée" }, { status: 400 });
    }

    return NextResponse.json({ message: "Profil mis à jour", user: updatedUser });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}