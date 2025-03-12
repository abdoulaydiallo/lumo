// @/app/api/search/route.ts
import { NextResponse } from "next/server";
import { SearchParams, searchProducts } from "@/lib/db/search.engine";

export async function POST(request: Request) {
  try {
    const params: SearchParams = await request.json();
    const result = await searchProducts(params);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur API de recherche :", error);
    return NextResponse.json({ error: "Erreur lors de la recherche" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await searchProducts({
      filters: { searchTerm: "" },
      sort: "relevance",
      pagination: { limit: 8, cursor: null },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur API de recherche initiale :", error);
    return NextResponse.json({ error: "Erreur lors de la recherche initiale" }, { status: 500 });
  }
}