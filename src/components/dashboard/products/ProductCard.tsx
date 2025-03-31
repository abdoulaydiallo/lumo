"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Product } from "@/lib/db/search.engine";

interface ProductCardProps {
  product: Product;
  storeId?: number;
}

export default function ProductCard({ product, storeId }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const images = product.images.map((img) => img.imageUrl);
  const hasPromotion = product.promotions.length > 0;
  const discountPercentage = hasPromotion
    ? product.promotions[0].discountPercentage
    : 0;
  const discountedPrice = hasPromotion
    ? product.price * (1 - discountPercentage / 100)
    : product.price;
  const rating = product.rating || 0;
  const isNew =
    new Date(product.createdAt) >
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Gestion des gestes tactiles pour le carrousel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.touches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50 && currentImageIndex < images.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    } else if (diff < -50 && currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
    touchStartX.current = null;
  };

  // Animation pour les étoiles
  const renderStars = () =>
    Array.from({ length: 5 }, (_, i) => (
      <motion.div
        key={i}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: i * 0.1, duration: 0.3 }}
      >
        <Star
          className={`w-3 h-3 ${
            i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-500"
          }`}
        />
      </motion.div>
    ));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[300px] mx-auto"
    >
      <Card className="flex flex-col w-full h-[400px] border border-gray-200 dark:border-gray-700 rounded-md">
        {/* Section Image */}
        <div
          className="relative w-full h-[180px]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full"
          >
            <Image
              src={images[currentImageIndex] || "/placeholder-image.jpg"}
              alt={product.name}
              fill
              className="object-contain rounded-t-md"
              loading="lazy"
              sizes="(max-width: 640px) 100vw, 300px"
            />
          </motion.div>
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 transform -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity"
                onClick={() =>
                  setCurrentImageIndex((prev) => Math.max(0, prev - 1))
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 transform -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity"
                onClick={() =>
                  setCurrentImageIndex((prev) =>
                    Math.min(images.length - 1, prev + 1)
                  )
                }
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {/* Badges avec gap et repositionnement */}
          <div className="absolute top-2 left-2 flex gap-2">
            {hasPromotion && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-red-500 text-white px-1.5 py-0.5 text-xs rounded"
              >
                -{discountPercentage}%
              </motion.span>
            )}
            {isNew && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-blue-500 text-white px-1.5 py-0.5 text-xs rounded"
              >
                Nouveau
              </motion.span>
            )}
          </div>
        </div>

        {/* Contenu */}
        <CardContent className="p-3 space-y-2 flex flex-col flex-grow">
          {/* Titre et catégorie */}
          <div>
            <h3 className="text-base font-medium line-clamp-1">
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {product.categories[0]?.name || "Catégorie inconnue"}
            </p>
          </div>

          {/* Note */}
          <div className="flex items-center gap-1">{renderStars()}</div>

          {/* Prix et stock */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {hasPromotion ? (
                <>
                  <span className="text-base font-semibold">
                    {discountedPrice.toLocaleString()} GNF
                  </span>
                  <span className="text-xs text-muted-foreground line-through">
                    {product.price.toLocaleString()} GNF
                  </span>
                </>
              ) : (
                <span className="text-base font-semibold">
                  {product.price.toLocaleString()} GNF
                </span>
              )}
            </div>
            {product.stockStatus === "in_stock" &&
              product.stock!.availableStock > 0 && (
                <span className="text-xs text-green-600">
                  En stock ({product.stock!.availableStock} disponibles)
                </span>
              )}
            {product.stockStatus === "low_stock" && (
              <span className="text-xs text-yellow-600">
                Stock faible ({product.stock!.availableStock} restants)
              </span>
            )}
          </div>

          {/* Variantes */}
          {product.variants.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">
              <span>Variantes : </span>
              {product.variants.map((v) => (
                <span key={v.id} className="mr-1">
                  {v.variantValue} ({v.price.toLocaleString()} GNF)
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
