"use client";

import { useSession } from "next-auth/react";
import { useWishlist } from "../hooks/useWishlist";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WishlistButtonProps {
  productId: number;
  className?: string;
  size?: "sm" | "default" | "lg"; // Nouvelle prop pour la taille
  variant?: "default" | "outline" | "ghost"; // Nouvelle prop pour le style
}

export function WishlistButton({
  productId,
  className,
  size = "default",
  variant = "ghost",
}: WishlistButtonProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Button
        disabled
        variant={variant}
        size={size}
        className={cn("rounded-full", className)}
      >
        <Heart className="h-4 w-4" />
      </Button>
    );
  }

  if (status === "unauthenticated") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled
              variant={variant}
              size={size}
              className={cn("rounded-full", className)}
              aria-label="Connexion requise pour ajouter à la wishlist"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connectez-vous pour ajouter à la wishlist</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const userId = Number(session?.user?.id);
  const {
    wishlist,
    addToWishlist,
    removeFromWishlist,
    isLoading,
    isAdding,
    isRemoving,
  } = useWishlist(userId);

  const isInWishlist = wishlist?.items.some(
    (item: any) => item.productId === productId
  );

  const handleClick = () => {
    if (isInWishlist) {
      removeFromWishlist(productId);
    } else {
      addToWishlist(productId);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={isLoading || isAdding || isRemoving}
            className={cn("rounded-full transition-all", className)}
            aria-label={
              isInWishlist ? "Retirer de la wishlist" : "Ajouter à la wishlist"
            }
          >
            <motion.div
              animate={{
                scale: isAdding || isRemoving ? [1, 1.2, 1] : 1,
                rotate: isInWishlist ? 360 : 0,
              }}
              transition={{
                scale: { duration: 0.3 },
                rotate: { duration: 0.5 },
              }}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isInWishlist ? "text-red-500 fill-red-500" : "text-gray-500",
                  (isAdding || isRemoving) && "animate-pulse"
                )}
              />
            </motion.div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isInWishlist ? "Retirer de la wishlist" : "Ajouter à la wishlist"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
