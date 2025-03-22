// app/api/suggestions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/db/search.engine";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  console.log("Requête reçue - query:", query, "limit:", limit);

  try {
    const result = await getSearchSuggestions(query, limit);
    console.log("Suggestions renvoyées:", result);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Erreur dans /api/suggestions:", error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}