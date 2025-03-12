// @/app/products/components/ProductCard.tsx
"use client";

import { ProductCardProps } from "../types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function ProductCard({ product }: ProductCardProps) {
  const mainImage = product.images[0]?.imageUrl || "/placeholder-image.jpg";
  const discount = product.promotions[0]?.discountPercentage;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="relative w-full h-48">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-cover rounded-t-md"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardTitle className="text-lg">{product.name}</CardTitle>
        <p className="text-sm text-gray-600 line-clamp-2">
          {product.description}
        </p>
        <div className="mt-2">
          {discount ? (
            <div>
              <span className="text-lg font-bold text-green-600">
                {(product.price * (1 - discount / 100)).toFixed(2)} FCFA
              </span>
              <span className="text-sm text-gray-500 line-through ml-2">
                {product.price} FCFA
              </span>
              <Badge variant="destructive" className="ml-2">
                -{discount}%
              </Badge>
            </div>
          ) : (
            <span className="text-lg font-bold">{product.price} GNF</span>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Badge
          variant={product.stockStatus === "in_stock" ? "default" : "secondary"}
        >
          {product.stockStatus === "in_stock" ? "En stock" : "Rupture"}
        </Badge>
      </CardFooter>
    </Card>
  );
}
