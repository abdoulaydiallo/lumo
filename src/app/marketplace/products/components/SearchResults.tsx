// src/app/marketplace/products/SearchResults.tsx
"use client";

import { useMemo } from "react";
import type { SearchResult } from "@/lib/db/search.engine";
import Image from "next/image";

interface SearchResultsProps {
  products: SearchResult["products"];
  total: number;
  nextCursor: SearchResult["nextCursor"];
}

export default function SearchResults({
  products,
  total,
  nextCursor,
}: SearchResultsProps) {
  const essentialProducts = useMemo(() => {
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0]?.imageUrl || "",
    }));
  }, [products]);

  return (
    <div>
      <p>{total} produits trouvés</p>
      <ul>
        {essentialProducts.map((product) => (
          <li key={product.id}>
            <Image
              src={product.image}
              alt={product.name}
              width={50}
              height={50}
              loading="lazy"
            />
            <span>{product.name}</span> - <span>{product.price / 100} GNF</span>
          </li>
        ))}
      </ul>
      {nextCursor && <button>Charger plus</button>}
    </div>
  );
}
