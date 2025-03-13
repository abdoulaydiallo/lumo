import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/db/search.engine";
import { SearchParams, SortOption } from "@/lib/db/search.engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursorString = searchParams.get("cursor");
  const filters: SearchParams["filters"] = {
    searchTerm: searchParams.get("searchTerm") || "",
    inStock: searchParams.get("inStock") === "false" ? false : true,
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    categoryIds: searchParams.get("categoryIds")?.split(",").map(Number).filter(Boolean) || [],
    minRating: searchParams.get("minRating") ? Number(searchParams.get("minRating")) : undefined,
    region: searchParams.get("region") || undefined,
  };
  const sort = (searchParams.get("sort") as SortOption) || "relevance";
  const limit = Number(searchParams.get("limit")) || 8;

  let cursor: { id: string; sortValue: string } | null = null;
  if (cursorString) {
    try {
      const parsedCursor = JSON.parse(cursorString);
      cursor = {
        id: parsedCursor.id,
        sortValue: parsedCursor.sortValue || sort,
      };
    } catch (e) {
      cursor = { id: cursorString, sortValue: sort };
    }
  }

  const params: SearchParams = {
    filters,
    sort,
    pagination: { limit, cursor },
  };

  try {
    const result = await searchProducts(params);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const params: SearchParams = await request.json();
  try {
    const result = await searchProducts(params);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}