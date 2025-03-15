"use client";

import { useSession } from "next-auth/react";
import { useCart } from "../hooks/useCart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function CartList() {
  const { data: session, status } = useSession();
  const userId = Number(session?.user?.id) || 0;
  const { cart, isLoading, removeFromCart } = useCart(userId);
  const queryClient = useQueryClient();

  // Mutation pour mettre à jour la quantité
  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      productId,
      quantity,
    }: {
      productId: number;
      quantity: number;
    }) => {
      const response = await fetch("/api/cart/update-quantity", {
        method: "PATCH",
        body: JSON.stringify({ userId, productId, quantity }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok)
        throw new Error("Erreur lors de la mise à jour de la quantité");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      toast.success("Quantité mise à jour");
    },
    onError: (error) =>
      toast.error(error.message || "Erreur lors de la mise à jour"),
  });

  // Mutation pour vider le panier
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/cart/clear", {
        method: "DELETE",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok)
        throw new Error("Erreur lors de la suppression du panier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      toast.success("Panier vidé avec succès");
    },
    onError: () => toast.error("Erreur lors de la suppression du panier"),
  });

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

  const totalPrice = cart.items.reduce(
    (sum: number, item: { variantPrice: any; productPrice: any; quantity: number; }) =>
      sum + (item.variantPrice || item.productPrice || 0) * item.quantity,
    0
  );

  const handleQuantityChange = (productId: number, delta: number) => {
    const item = cart.items.find((i: any) => i.productId === productId);
    if (!item) return;
    const newQuantity = Math.max(1, item.quantity + delta); // Minimum 1
    updateQuantityMutation.mutate({ productId, quantity: newQuantity });
  };

  const handleCheckout = () => {
    // Simulation de checkout (à développer plus tard)
    toast.info("Fonctionnalité de commande en cours de développement");
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
              Votre Panier ({cart.total})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearCartMutation.mutate()}
              disabled={clearCartMutation.isPending}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Vider le panier
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <ul className="space-y-4">
              {cart.items.map((item: any, index: number) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between border-b pb-4 last:border-b-0"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-16 h-16">
                      <Image
                        src={item.productImage || "/placeholder-image.jpg"}
                        alt={item.productName}
                        fill
                        className="object-contain rounded-md"
                        loading="lazy"
                        sizes="64px"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-base font-medium line-clamp-1">
                        {item.productName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.variantValue
                          ? `${item.variantType}: ${item.variantValue}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(
                          item.variantPrice || item.productPrice
                        ).toLocaleString()}{" "}
                        GNF x {item.quantity} =
                        {(
                          item.quantity *
                          (item.variantPrice || item.productPrice)
                        ).toLocaleString()}{" "}
                        GNF
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            handleQuantityChange(item.productId, -1)
                          }
                          disabled={
                            item.quantity <= 1 ||
                            updateQuantityMutation.isPending
                          }
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            handleQuantityChange(item.productId, 1)
                          }
                          disabled={updateQuantityMutation.isPending}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                          href={`/marketplace/stores/${item.storeId}/products/${item.productId}`}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Détails
                        </Link>
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.productId)}
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
                onClick={handleCheckout}
                disabled={cart.items.length === 0}
              >
                Passer la commande
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
