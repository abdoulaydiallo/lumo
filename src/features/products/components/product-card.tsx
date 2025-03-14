"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useWishlist } from "@/features/wishlists/hooks/useWishlist"; // Ajout du hook wishlist
import { useCart } from "@/features/cart/hooks/useCart"; // Ajout du hook cart
import { WishlistButton } from "@/features/wishlists/components/WishListButton";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    stockStatus: string;
    storeId: number;
    images: { id: number; imageUrl: string; productId: number }[];
    promotions: { id: number; discountPercentage: number; productId: number }[];
    stock: {
      availableStock: number;
      reservedStock: number;
      stockLevel: number;
    };
    variants: {
      id: number;
      variantType: string;
      variantValue: string;
      price: number;
      stock: number;
    }[];
    categories: { id: number; name: string }[];
    createdAt: string;
    updatedAt: string;
    weight: number;
    store?: { name: string };
    reviews?: { rating: number };
  };
  storeId?: number;
}

export default function ProductCard({ product, storeId }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const { data: session, status } = useSession();
  const userId = Number(session?.user?.id) || 0;

  // Hook pour la wishlist
  useWishlist(userId);
  // Hook pour le panier
  const { addToCart, isAdding } = useCart(userId);

  const images = product.images.map((img) => img.imageUrl);
  const hasPromotion = product.promotions.length > 0;
  const discountPercentage = hasPromotion
    ? product.promotions[0].discountPercentage
    : 0;
  const discountedPrice = hasPromotion
    ? product.price * (1 - discountPercentage / 100)
    : product.price;
  const rating = product.reviews?.rating || 0;
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

  // Fonction pour ajouter au panier
  const handleAddToCart = () => {
    if (status === "unauthenticated") return;
    addToCart({ productId: product.id, quantity: 1 });
  };

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
          {/* Bouton Wishlist intégré */}
          <WishlistButton
            productId={product.id}
            className="absolute top-2 right-2"
          />
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
              product.stock.availableStock > 0 && (
                <span className="text-xs text-green-600">
                  En stock ({product.stock.availableStock} disponibles)
                </span>
              )}
            {product.stockStatus === "low_stock" && (
              <span className="text-xs text-yellow-600">
                Stock faible ({product.stock.availableStock} restants)
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

          {/* Actions avec icônes sur mobile */}
          <div className="flex gap-2 mt-auto flex-wrap">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1"
            >
              <Button
                variant="default"
                size="sm"
                className="w-full text-xs"
                onClick={handleAddToCart}
                disabled={
                  isAdding ||
                  status === "unauthenticated" ||
                  product.stock.availableStock <= 0
                }
              >
                <ShoppingCart className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">
                  {isAdding ? "Ajout..." : "Ajouter au panier"}
                </span>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1"
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                asChild
              >
                <Link
                  href={`/marketplace/stores/${storeId}/products/${product.id}`}
                >
                  <Eye className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Voir détails</span>
                </Link>
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
