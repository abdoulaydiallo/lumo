// @/features/products/components/product-details.tsx
"use client";

import { useState, useEffect } from "react";
import { Product } from "@/features/products/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import Link from "next/link";
import Heading from "@/components/Heading";
import { cn } from "@/lib/utils";
import ProductImageCarousel from "./product-image-carousel";

interface ProductDetailsProps {
  product: Product;
  storeId: number;
  isOwner: boolean;
}

export default function ProductDetails({
  product,
  storeId,
  isOwner,
}: ProductDetailsProps) {
  const [quantity, setQuantity] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const formatNumber = (value: number) => value.toLocaleString("fr-GN");
  const hasPromotion = product.promotions.length > 0;
  const discountPercentage = hasPromotion
    ? product.promotions[0].promotion.discountPercentage
    : 0;
  const discountedPrice = hasPromotion
    ? product.price * (1 - discountPercentage / 100)
    : product.price;
  const stockAvailable = product.stock?.availableStock ?? 0;

  useEffect(() => {
    if (hasPromotion && product.promotions[0].promotion.endDate) {
      const endDate = new Date(product.promotions[0].promotion.endDate);
      const updateTimer = () => {
        const now = new Date();
        const diff = endDate.getTime() - now.getTime();
        if (diff <= 0) setTimeLeft("Expirée");
        else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`${days}j ${hours}h ${minutes}m`);
        }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }
  }, [hasPromotion, product.promotions]);

  const increaseQuantity = () =>
    setQuantity((prev) => Math.min(prev + 1, stockAvailable));
  const decreaseQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section carrousel */}
        <ProductImageCarousel images={product.images} />

        {/* Section détails */}
        <div className="space-y-2">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-900 font-bold leading-tight">
              {product.name}
            </h1>
            {product.categories.length > 0 && (
              <Badge variant="outline" className="mt-2">
                {product.categories[0].name}
              </Badge>
            )}
          </div>

          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-4">
              <span className="text-xl sm:text-2xl font-semibold text-gray-900">
                {formatNumber(Math.round(discountedPrice))} GNF
              </span>
              {hasPromotion && (
                <span className="text-md sm:text-lg text-gray-500 line-through">
                  {formatNumber(product.price)} GNF
                </span>
              )}
            </div>
            {hasPromotion && (
              <Badge className="bg-red-500 text-white text-sm animate-pulse">
                -{discountPercentage}% {timeLeft && `(${timeLeft})`}
              </Badge>
            )}
          </div>

          <div className="text-sm text-gray-500">
            Stock :{" "}
            {stockAvailable > 0
              ? `${formatNumber(stockAvailable)} disponibles`
              : "Rupture de stock"}
          </div>

          <div>
            <p
              className={cn(
                "text-sm sm:text-base text-gray-600",
                !isDescriptionExpanded ? "line-clamp-3" : ""
              )}
            >
              {product.description || "Aucune description disponible."}
            </p>
            {product.description && product.description.length > 100 && (
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-gray-700"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? "Réduire" : "Lire plus"}
              </Button>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="space-y-2 flex items-center gap-4">
              <Heading
                title="Variantes"
                level="h2"
                className="text-lg font-medium text-gray-700"
              />
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <Button
                    key={variant.id}
                    variant="outline"
                    className="text-sm px-4 py-2 rounded-full bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  >
                    {variant.variantType}: {variant.variantValue} (
                    {formatNumber(variant.price)} GNF,{" "}
                    {formatNumber(variant.stock)} en stock)
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!isOwner && stockAvailable > 0 && (
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-gray-700">Quantité :</p>
              <div className="flex items-center border rounded-full overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="px-3 py-1"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-4 py-1 text-center min-w-[40px]">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={increaseQuantity}
                  disabled={stockAvailable <= quantity}
                  className="px-3 py-1"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3 sticky bottom-0 bg-white py-4 md:static">
            {isOwner ? (
              <Button asChild className="flex-1">
                <Link
                  href={`/marketplace/stores/${storeId}/products/${product.id}/edit`}
                >
                  Modifier le produit
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  disabled={stockAvailable === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 flex items-center gap-2 text-sm md:text-base transition-all hover:scale-105"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Ajouter au panier
                </Button>
                <Button
                  disabled={stockAvailable === 0}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-sm md:text-base transition-all hover:scale-105"
                >
                  Acheter maintenant
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
