// @/app/api/products/route.ts
import { NextResponse } from "next/server";
import { FilterOptions, getProductsWithFiltersAndPagination } from "@/features/products/api/queries";
import { SortOption } from "@/lib/db/search.engine";
import { deleteProduct } from "@/features/products/api/actions"; // Import de la fonction deleteProduct

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: FilterOptions = {
    storeId: searchParams.get("storeId") ? Number(searchParams.get("storeId")) : undefined,
    categoryIds: searchParams.get("categoryIds")?.split(",").map(Number).filter(Boolean),
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    searchTerm: searchParams.get("searchTerm") || undefined,
    promotionId: searchParams.get("promotionId") ? Number(searchParams.get("promotionId")) : undefined,
    sortBy: searchParams.get("sortBy") as SortOption || undefined,
    inStock: searchParams.get("inStock") === "true" ? true : undefined,
  };

  const pagination = {
    limit: Number(searchParams.get("limit")) || 8,
    offset: Number(searchParams.get("offset")) || 0,
  };

  try {
    const result = await getProductsWithFiltersAndPagination(filters, pagination);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /api/products:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") ? Number(searchParams.get("productId")) : null;
  const storeId = searchParams.get("storeId") ? Number(searchParams.get("storeId")) : null;

  if (!productId || !storeId) {
    return NextResponse.json(
      { error: "productId et storeId sont requis" },
      { status: 400 }
    );
  }

  try {
    await deleteProduct(productId, storeId);
    return NextResponse.json({ message: "Produit supprimé avec succès" }, { status: 200 });
  } catch (error) {
    console.error("Erreur dans DELETE /api/products:", error);
    return NextResponse.json(
      { error: "Échec de la suppression du produit" },
      { status: 500 }
    );
  }
}