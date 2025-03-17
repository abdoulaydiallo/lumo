"use client";

import { useState, useEffect } from "react";
import { Product } from "@/features/products/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Heart, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ProductImageCarousel from "./product-image-carousel";
import { useSession } from "next-auth/react";
import { useCart } from "@/features/cart/hooks/useCart";
import { useWishlist } from "@/features/wishlists/hooks/useWishlist";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    product.variants.length > 0 ? product.variants[0].id : null
  );
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const { data: session, status } = useSession();
  const userId = Number(session?.user?.id) || 0;
  const { addToCart, isAdding } = useCart(userId);
  const {
    addToWishlist,
    removeFromWishlist,
    isWishlisted,
    isLoading: isWishlistLoading,
  } = useWishlist(userId);

  const formatNumber = (value: number) => value.toLocaleString("fr-GN");
  const hasPromotion = product.promotions.length > 0;
  const discountPercentage = hasPromotion
    ? product.promotions[0].promotion.discountPercentage
    : 0;
  const isNew =
    new Date(product.createdAt as Date) >
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const selectedVariant = product.variants.find(
    (v) => v.id === selectedVariantId
  );
  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const discountedPrice = hasPromotion
    ? basePrice * (1 - discountPercentage / 100)
    : basePrice;
  const stockAvailable = selectedVariant
    ? selectedVariant.stock
    : product.stock?.availableStock ?? 0;

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

  const handleAddToCart = () => {
    if (status === "unauthenticated") {
      toast.error("Veuillez vous connecter pour ajouter au panier");
      return;
    }
    addToCart({
      productId: product.id,
      quantity,
      variantId: selectedVariantId || undefined,
    });
    toast.success("Ajouté au panier !", {
      action: {
        label: "Voir le panier",
        onClick: () => (window.location.href = "/cart"),
      },
    });
  };

  const handleToggleWishlist = () => {
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

  const handleBuyNow = () => {
    if (status === "unauthenticated") {
      toast.error("Veuillez vous connecter pour acheter");
      return;
    }
    toast.info("Fonctionnalité d'achat immédiat en cours de développement");
  };

  // Placeholder pour les avis (à implémenter plus tard)
  const renderStars = () =>
    Array(5)
      .fill(0)
      .map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      ));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="py-8"
    >
      <Card className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-md overflow-hidden">
        <div className="relative">
          <ProductImageCarousel images={product.images} />
          <div className="absolute top-2 left-2 flex gap-2">
            {hasPromotion && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-red-500 text-white px-1.5 py-0.5 text-xs rounded"
              >
                -{discountPercentage}% {timeLeft && `(${timeLeft})`}
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
          {!isOwner && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-2 right-2"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleWishlist}
                disabled={isWishlistLoading}
                aria-label={
                  isWishlisted(product.id)
                    ? "Retirer des favoris"
                    : "Ajouter aux favoris"
                }
              >
                <Heart
                  className={cn(
                    "w-5 h-5 transition-colors duration-200",
                    isWishlisted(product.id)
                      ? "text-red-500 fill-red-500"
                      : "text-gray-500"
                  )}
                />
              </Button>
            </motion.div>
          )}
        </div>

        <CardContent className="p-4 flex flex-col space-y-4">
          <div>
            <h1 className="text-xl font-medium line-clamp-2 text-gray-900">
              {product.name}
            </h1>
            <div className="flex items-center gap-1 mt-1">
              {renderStars()}
              <span className="text-xs text-muted-foreground ml-1">
                (12 avis)
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {product.categories[0]?.name || "Catégorie inconnue"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">
                {formatNumber(Math.round(discountedPrice))} GNF
              </span>
              {hasPromotion && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatNumber(basePrice)} GNF
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Stock :{" "}
              {stockAvailable > 0
                ? `${formatNumber(stockAvailable)} disponibles`
                : "Rupture de stock"}
            </p>
            <p className="text-xs text-gray-500">
              Livraison estimée : 2-3 jours
            </p>
          </div>

          <div>
            <p
              className={cn(
                "text-sm text-gray-600",
                !isDescriptionExpanded ? "line-clamp-3" : ""
              )}
            >
              {product.description || "Aucune description disponible."}
            </p>
            {product.description && product.description.length > 100 && (
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-gray-700"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? "Réduire" : "Lire plus"}
              </Button>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Variantes :</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <Button
                    key={variant.id}
                    variant={
                      selectedVariantId === variant.id ? "default" : "outline"
                    }
                    size="sm"
                    className={cn(
                      "text-xs px-3 py-1 rounded-full",
                      selectedVariantId === variant.id
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                    )}
                    onClick={() => setSelectedVariantId(variant.id)}
                  >
                    {variant.variantValue} ({formatNumber(variant.price)} GNF)
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!isOwner && (
            <>
              {stockAvailable > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Quantité :
                  </span>
                  <div className="flex items-center border rounded-full overflow-hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      className="px-2 py-1"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="px-3 py-1 text-sm min-w-[30px] text-center">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={increaseQuantity}
                      disabled={stockAvailable <= quantity}
                      className="px-2 py-1"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "flex gap-2 flex-wrap mt-auto",
                  "md:static sticky bottom-0 bg-white py-2 z-10"
                )}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1"
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full text-xs bg-blue-600 hover:bg-blue-700"
                    onClick={handleAddToCart}
                    disabled={stockAvailable === 0 || isAdding}
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
                    variant="default"
                    size="sm"
                    className="w-full text-xs bg-orange-500 hover:bg-orange-600"
                    onClick={handleBuyNow}
                    disabled={stockAvailable === 0}
                  >
                    <span className="text-xs">Acheter maintenant</span>
                  </Button>
                </motion.div>
              </div>
            </>
          )}

          {isOwner && (
            <div className="flex gap-2 mt-auto">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1"
              >
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="w-full text-xs bg-green-600 hover:bg-green-700"
                >
                  <Link
                    href={`/marketplace/stores/${storeId}/products/${product.id}/edit`}
                  >
                    Modifier le produit
                  </Link>
                </Button>
              </motion.div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
