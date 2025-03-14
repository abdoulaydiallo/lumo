"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useCart(userId: number) {
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart", userId],
    queryFn: async () => {
      const response = await fetch(`/api/cart?userId=${userId}`);
      if (!response.ok) throw new Error("Erreur lors de la récupération du panier");
      return response.json();
    },
    enabled: !!userId,
  });

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity, variantId }: { productId: number; quantity: number; variantId?: number }) => {
      const response = await fetch("/api/cart", {
        method: "POST",
        body: JSON.stringify({ productId, quantity, variantId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de l'ajout");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      toast.success(data.message);
    },
    onError: (error) => toast.error(error.message || "Erreur lors de l'ajout au panier"),
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/cart?productId=${productId}`, {
        method: "DELETE",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      toast.success(data.message);
    },
    onError: () => toast.error("Erreur lors de la suppression du panier"),
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      const response = await fetch("/api/cart/update-quantity", {
        method: "PATCH",
        body: JSON.stringify({ userId, productId, quantity }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de la mise à jour de la quantité");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      toast.success(data.message);
    },
    onError: (error) => toast.error(error.message || "Erreur lors de la mise à jour"),
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/cart/clear", {
        method: "DELETE",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression du panier");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      toast.success(data.message);
    },
    onError: () => toast.error("Erreur lors de la suppression du panier"),
  });

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    addToCart: addMutation.mutate,
    removeFromCart: removeMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
    clearCart: clearCartMutation.mutate,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    isUpdating: updateQuantityMutation.isPending,
    isClearing: clearCartMutation.isPending,
  };
}