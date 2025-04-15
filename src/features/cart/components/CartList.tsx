"use client";

import { useSession } from "next-auth/react";
import { useCart } from "../hooks/useCart"; // Hook non modifié
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CartItem } from "../api/queries";
import { useRouter } from "next/navigation";

export function CartList() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userId = Number(session?.user?.id) || 0;
  const { cart, isLoading, removeFromCart, updateQuantity, clearCart, isUpdating, isClearing } = useCart(userId);

  // Mutation pour le checkout (à implémenter côté serveur)
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      router.push("/marketplace/checkout")
    },
    
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la commande");
    },
  });

  // Gestion des états de chargement et d'authentification
  if (status === "loading" || isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 text-muted-foreground"
      >
        Chargement du panier...
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
        Veuillez vous connecter pour voir votre panier.{" "}
        <Button variant="link" asChild className="p-0">
          <Link href="/login">Connexion</Link>
        </Button>
      </motion.div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 text-muted-foreground"
      >
        Votre panier est vide.{" "}
        <Button variant="link" asChild className="p-0">
          <Link href="/marketplace/products">Ajouter des produits</Link>
        </Button>
      </motion.div>
    );
  }

  // Calcul du prix total avec validation
  const totalPrice = cart.items.reduce((sum, item) => {
    const price = item.variantPrice ?? item.productPrice;
    if (price == null) {
      console.error(`Prix manquant pour le produit ${item.productId}`);
      return sum; // Ignorer l'article sans prix
    }
    return sum + price * item.quantity;
  }, 0);

  // Gestion de la quantité (pas de vérification de stock car non disponible dans le hook actuel)
  const handleQuantityChange = (productId: number, delta: number) => {
    const item = cart.items.find((i: CartItem) => i.productId === productId);
    if (!item) return;
    const newQuantity = Math.max(1, item.quantity + delta); // Minimum 1
    updateQuantity({ productId, quantity: newQuantity });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border border-gray-200 dark:border-gray-700 rounded-md">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-lg font-semibold">
              Votre Panier ({cart.items.length} article{cart.items.length > 1 ? "s" : ""})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearCart()}
              disabled={isClearing || cart.items.length === 0}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Vider le panier
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <ul className="space-y-4">
              {cart.items.map((item: CartItem, index: number) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between border-b pb-4 last:border-b-0"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 relative overflow-hidden">
                      <Image
                        src={item.productImage || "/placeholder-image.jpg"}
                        alt={item.productName || "Produit sans nom"}
                        width={64}
                        height={64}
                        className="object-contain object-center rounded-md overflow-hidden"
                        loading="lazy"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-base font-medium line-clamp-1">
                        {item.productName || "Produit sans nom"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.variantValue
                          ? `${item.variantType}: ${item.variantValue}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(item.variantPrice ?? item.productPrice)?.toLocaleString() || "Prix indisponible"} GNF x {item.quantity} ={" "}
                        {(((item.variantPrice ?? item.productPrice) ?? 0) * item.quantity).toLocaleString()} GNF
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleQuantityChange(item.productId, -1)}
                          disabled={item.quantity <= 1 || isUpdating}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleQuantityChange(item.productId, 1)}
                          disabled={isUpdating}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <Link href={`/marketplace/stores/${item.storeId}/products/${item.productId}`}>
                          <Eye className="w-4 h-4 mr-1" /> Détails
                        </Link>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.productId)}
                        disabled={isUpdating || isClearing}
                        aria-label="Retirer du panier"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.li>
              ))}
            </ul>
            <div className="flex justify-between items-center mt-4">
              <p className="text-base font-semibold">
                Total: {totalPrice.toLocaleString()} GNF
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => checkoutMutation.mutate()}
                disabled={cart.items.length === 0 || checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? "Traitement..." : "Passer la commande"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}