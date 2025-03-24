import { auth } from "@/lib/auth";
import { markNotificationsAsRead } from "@/features/store/api/actions";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = Number(session.user.id);
  const data = await markNotificationsAsRead(userId);
  return NextResponse.json(data);
}