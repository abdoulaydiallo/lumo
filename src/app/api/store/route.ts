import { auth } from "@/lib/auth";
import { getStoreLayoutData } from "@/features/store/api/queries";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = Number(session.user.id);
  const data = await getStoreLayoutData(userId);
  return NextResponse.json(data);
}