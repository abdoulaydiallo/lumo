// @/features/products/components/product-card.tsx
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "@/features/products/api/types";
import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  product: Product;
  storeId?: number;
}

export default function ProductCard({ product, storeId }: ProductCardProps) {
  const primaryImage = product.images[0]?.imageUrl || "/placeholder-image.jpg";
  const hasPromotion = product.promotions.length > 0;
  const discountPercentage = hasPromotion
    ? product.promotions[0].discountPercentage
    : 0;
  const discountedPrice = hasPromotion
    ? product.price * (1 - discountPercentage / 100)
    : product.price;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="relative w-full h-48">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover rounded-t-lg"
          />
          {hasPromotion && (
            <span className="absolute top-2 -left-2 bg-red-500 text-white px-2 py-1 text-xs rounded">
              -{discountPercentage}%
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardTitle className="text-lg">{product.name}</CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        <div className="mt-2">
          {hasPromotion ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                {discountedPrice.toLocaleString()} GNF
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {product.price.toLocaleString()} GNF
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold">
              {product.price.toLocaleString()} GNF
            </span>
          )}
        </div>
        <p className="text-sm mt-1">
          Stock :{" "}
          <span
            className={
              product.stockStatus === "in_stock"
                ? "text-green-500"
                : product.stockStatus === "low_stock"
                ? "text-yellow-500"
                : "text-red-500"
            }
          >
            {product.stockStatus === "in_stock"
              ? "En stock"
              : product.stockStatus === "low_stock"
              ? "Stock faible"
              : "Rupture"}
          </span>
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/marketplace/stores/${storeId}/products/${product.id}`}>
            Voir les détails
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
