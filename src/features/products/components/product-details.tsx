"use client";

import { useState, useEffect, useRef } from "react";
import { Product } from "@/features/products/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Plus,
  Minus,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useCart } from "@/features/cart/hooks/useCart";
import { useWishlist } from "@/features/wishlists/hooks/useWishlist";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { ReviewList } from "@/features/reviews/components/ReviewList";
import { ReviewForm } from "@/features/reviews/components/ReviewForm";

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
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    product.variants.length > 0 ? product.variants[0].id : null
  );
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const touchStartX = useRef<number | null>(null);

  const { data: session, status } = useSession();
  const userId = Number(session?.user?.id) || 0;
  const { addToCart, isAdding } = useCart(userId);
  const {
    addToWishlist,
    removeFromWishlist,
    isWishlisted,
    isLoading: isWishlistLoading,
  } = useWishlist(userId);

  const images = product.images.map((img) => img.imageUrl);
  const formatNumber = (value: number): string => value.toLocaleString("fr-GN");
  const hasPromotion = product.promotions.length > 0;
  const discountPercentage = hasPromotion
    ? product.promotions[0].promotion.discountPercentage
    : 0;
  const isNew = product.createdAt
    ? new Date(product.createdAt) >
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : false;
  const selectedVariant = product.variants.find(
    (v) => v.id === selectedVariantId
  );
  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const discountedPrice = hasPromotion
    ? Number(basePrice) * (1 - Number(discountPercentage) / 100)
    : basePrice;
  const stockAvailable = selectedVariant
    ? selectedVariant.stock
    : product.stock?.availableStock ?? 0;

  useEffect(() => {
    if (!hasPromotion || !product.promotions[0].promotion?.endDate) return;

    const endDate = new Date(product.promotions[0].promotion.endDate);
    const updateTimer = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Expirée");
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${days}j ${hours}h ${minutes}m`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60_000);
    return () => clearInterval(interval);
  }, [hasPromotion, product.promotions]);

  const increaseQuantity = (): void =>
    setQuantity((prev) => Math.min(prev + 1, stockAvailable));
  const decreaseQuantity = (): void =>
    setQuantity((prev) => Math.max(1, prev - 1));

  const handleAddToCart = (): void => {
    if (status === "unauthenticated") {
      toast.error("Veuillez vous connecter pour ajouter au panier");
      return;
    }
    addToCart({
      productId: product.id,
      quantity,
      variantId: selectedVariantId ?? undefined,
    });
    toast.success("Ajouté au panier !", {
      action: {
        label: "Voir le panier",
        onClick: () => (window.location.href = "/cart"),
      },
    });
  };

  const handleToggleWishlist = (): void => {
    if (status === "unauthenticated") {
      toast.error("Veuillez vous connecter pour gérer votre wishlist");
      return;
    }
    if (isWishlisted(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>): void => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>): void => {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 max-w-6xl"
    >
      <div className="grid gap-8 md:grid-cols-2">
        {/* Galerie d'images */}
        <div className="relative">
          <div
            className="relative h-[500px] w-full overflow-hidden rounded-lg shadow-md"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative h-full w-full"
            >
              <Image
                src={images[currentImageIndex] || "/placeholder-image.jpg"}
                alt={product.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </motion.div>
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-sm hover:bg-white"
                  onClick={() =>
                    setCurrentImageIndex((prev) => Math.max(0, prev - 1))
                  }
                >
                  <ChevronLeft className="h-6 w-6 text-gray-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-sm hover:bg-white"
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      Math.min(images.length - 1, prev + 1)
                    )
                  }
                >
                  <ChevronRight className="h-6 w-6 text-gray-600" />
                </Button>
              </>
            )}
          </div>
          <div className="absolute left-4 top-4 flex gap-2">
            {hasPromotion && (
              <Badge
                variant="destructive"
                className="animate-pulse rounded-full bg-red-600 px-2 py-1 text-sm font-semibold text-white shadow-md"
              >
                -{discountPercentage}% {timeLeft && `(${timeLeft})`}
              </Badge>
            )}
            {isNew && (
              <Badge
                variant="secondary"
                className="rounded-full bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-md"
              >
                Nouveau
              </Badge>
            )}
          </div>
          {!isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 rounded-full bg-white/80 shadow-sm hover:bg-white"
              onClick={handleToggleWishlist}
              disabled={isWishlistLoading}
            >
              <Heart
                className={cn(
                  "h-6 w-6 transition-all",
                  isWishlisted(product.id)
                    ? "fill-red-500 text-red-500"
                    : "text-gray-600 hover:text-red-400"
                )}
              />
            </Button>
          )}
        </div>

        {/* Détails produit */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              {product.name}
            </h1>
            <p className="mt-1 text-sm italic text-gray-600">
              Catégorie: {product.categories.map((c) => c.name).join(", ")}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {formatNumber(Math.round(discountedPrice))} GNF
              </span>
              {hasPromotion && (
                <span className="text-lg text-gray-400 line-through">
                  {formatNumber(basePrice)} GNF
                </span>
              )}
            </div>
            <Badge
              variant={stockAvailable > 0 ? "default" : "destructive"}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium",
                stockAvailable > 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {stockAvailable > 0
                ? `${formatNumber(stockAvailable)} en stock`
                : "Rupture de stock"}
            </Badge>
          </div>

          {product.variants.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {product.variants[0].variantType} :
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <Button
                    key={variant.id}
                    variant={
                      selectedVariantId === variant.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className="rounded-full px-4 py-1 text-sm font-medium transition-all hover:shadow-md"
                  >
                    {variant.variantValue} ({formatNumber(variant.price)} GNF)
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!isOwner && stockAvailable > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-full border bg-gray-50 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="rounded-l-full hover:bg-gray-100"
                >
                  <Minus className="h-4 w-4 text-gray-600" />
                </Button>
                <span className="px-4 py-2 text-sm font-medium text-gray-700">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={increaseQuantity}
                  disabled={stockAvailable <= quantity}
                  className="rounded-r-full hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
              <Button
                size="lg"
                className="flex-1 rounded-full bg-blue-600 text-white shadow-md transition-all hover:bg-blue-700"
                onClick={handleAddToCart}
                disabled={isAdding}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {isAdding ? "Ajout..." : "Ajouter au panier"}
              </Button>
            </div>
          )}

          <div className="space-y-1 text-sm text-gray-600">
            <p>
              Poids: <span className="font-medium">{product.weight}g</span>
            </p>
            <p>
              Livraison estimée: <span className="font-medium">2-3 jours</span>
            </p>
          </div>

          {isOwner && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full rounded-full border-gray-300 text-gray-700 shadow-sm transition-all hover:bg-gray-50"
            >
              <Link
                href={`/marketplace/stores/${storeId}/products/${product.id}/edit`}
              >
                Modifier le produit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs pour description, détails et avis */}
      <Tabs defaultValue="description" className="mt-10">
        <TabsList className="grid w-full max-w-md grid-cols-3 rounded-full bg-gray-100 p-1">
          <TabsTrigger
            value="description"
            className="rounded-full text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Description
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="rounded-full text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Détails
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-full text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Avis
          </TabsTrigger>
        </TabsList>
        <TabsContent value="description">
          <Card className="mt-4 border-none shadow-sm">
            <CardContent className="pt-6 leading-relaxed text-gray-700">
              {product.description || "Aucune description disponible."}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details">
          <Card className="mt-4 border-none shadow-sm">
            <CardContent className="space-y-3 pt-6 text-sm text-gray-600">
              <p>
                Créé le:{" "}
                <span className="font-medium">
                  {product.createdAt
                    ? new Date(product.createdAt).toLocaleDateString()
                    : "Date inconnue"}
                </span>
              </p>
              {product.updatedAt && (
                <p>
                  Mis à jour le:{" "}
                  <span className="font-medium">
                    {new Date(product.updatedAt).toLocaleDateString()}
                  </span>
                </p>
              )}
              <p>
                Poids: <span className="font-medium">{product.weight}g</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reviews">
          <Card className="mt-4 border-none shadow-sm">
            <CardContent className="pt-6 space-y-6">
              <ReviewList productId={product.id} />
              <ReviewForm productId={product.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
