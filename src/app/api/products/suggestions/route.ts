// @/app/api/products/suggestions/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productCategories, productCategoryRelation } from "@/lib/db/schema";
import { like, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get("term")?.toLowerCase() || "";

  if (!term || term.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  // Recherche dans les produits (nom et description) et catégories
  const suggestions = await db
    .select({
      type: sql<string>`'product'`.as("type"),
      value: products.name,
      relevance: sql<number>`
        CASE
          WHEN LOWER(${products.name}) LIKE ${`${term}%`} THEN 1.0
          WHEN LOWER(${products.name}) LIKE ${`%${term}%`} THEN 0.8
          WHEN LOWER(${products.description}) LIKE ${`%${term}%`} THEN 0.5
          ELSE 0.0
        END
      `,
    })
    .from(products)
    .where(
      sql`
        LOWER(${products.name}) LIKE ${`%${term}%`}
        OR LOWER(${products.description}) LIKE ${`%${term}%`}
      `
    )
    .union(
      db
        .select({
          type: sql<string>`'category'`.as("type"),
          value: productCategories.name,
          relevance: sql<number>`0.7`, // Catégories moins prioritaires que les noms exacts
        })
        .from(productCategories)
        .where(like(productCategories.name, `%${term}%`))
    )
    .orderBy(sql`relevance DESC`)
    .limit(10);

  return NextResponse.json(
    suggestions.map((s) => ({
      type: s.type,
      value: s.value,
      relevance: s.relevance,
    })),
    { status: 200 }
  );
}