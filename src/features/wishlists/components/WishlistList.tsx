"use client";

import { useSession } from "next-auth/react";
import { useWishlist } from "../hooks/useWishlist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingCart, Eye } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { WishlistButton } from "./WishListButton";
import { useRouter } from "next/navigation";
import { startTransition, useCallback } from "react";

export function WishlistList() {
  const { data: session, status } = useSession();
  const router = useRouter()
  
  const handleClearSearch = useCallback(() => {
    startTransition(() => {
      router.push("/marketplace/products");
    });
  }, [router]);

  if (status === "loading") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 text-muted-foreground"
      >
        Chargement de la wishlist...
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 text-muted-foreground"
      >
        Veuillez vous connecter pour voir votre wishlist.{" "}
        <Button variant="link" asChild className="p-0">
          <Link href="/login">Connexion</Link>
        </Button>
      </motion.div>
    );
  }

  const userId = Number(session?.user?.id);
  const { wishlist, isLoading, removeFromWishlist } = useWishlist(userId);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 text-muted-foreground"
      >
        Chargement des éléments...
      </motion.div>
    );
  }

  if (!wishlist || wishlist.items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 text-muted-foreground"
      >
        Votre wishlist est vide.{" "}
        <Button variant="link" onClick={handleClearSearch} className="p-0">
         Ajouter des produits
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border border-gray-200 dark:border-gray-700 rounded-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Votre Wishlist ({wishlist.total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <ul className="space-y-4">
              {wishlist.items.map((item, index: number) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between border-b pb-4 last:border-b-0"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Image du produit */}
                    <div className="relative w-16 h-16">
                      <Image
                        src={item.productImage || "/placeholder-image.jpg"}
                        alt={item.productName || `Produit #${item.productId}`}
                        fill
                        className="object-contain rounded-md"
                        loading="lazy"
                        sizes="64px"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-base font-medium line-clamp-1">
                        {item.productName || `Produit #${item.productId}`}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.productPrice
                          ? `${item.productPrice.toLocaleString()} GNF`
                          : "Prix non disponible"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="default" size="sm" className="text-xs">
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Ajouter au panier
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        asChild
                      >
                        <Link
                          href={`/marketplace/stores/${
                            item.storeId || 0
                          }/products/${item.productId}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Détails
                        </Link>
                      </Button>
                    </motion.div>
                    <WishlistButton productId={item.productId} />
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromWishlist(item.productId)}
                        aria-label="Retirer de la wishlist"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
