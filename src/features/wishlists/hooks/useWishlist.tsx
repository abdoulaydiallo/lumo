"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner"; // Correction typo: "sonner" -> "sonner"
import { Wishlist } from "../api/types";

export function useWishlist(userId: number) {
  const queryClient = useQueryClient();

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      const response = await fetch(`/api/wishlists?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération de la wishlist");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const addMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch("/api/wishlists", {
        method: "POST",
        body: JSON.stringify({ userId, productId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de l'ajout");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
      toast.success(data.message);
    },
    onError: () => toast.error("Erreur lors de l'ajout à la wishlist"),
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/wishlists?productId=${productId}`, {
        method: "DELETE",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
      toast.success(data.message);
    },
    onError: () => toast.error("Erreur lors de la suppression de la wishlist"),
  });

  // Fonction pour vérifier si un produit est dans la wishlist
  const isWishlisted = (productId: number): boolean => {
    if (!wishlistQuery.data || wishlistQuery.isLoading) return false;
    return wishlistQuery.data.items.some(
      (item: Wishlist) => item.productId === productId
    );
  };

  return {
    wishlist: wishlistQuery.data,
    isLoading: wishlistQuery.isLoading,
    addToWishlist: addMutation.mutate,
    removeFromWishlist: removeMutation.mutate,
    isWishlisted, // Ajout de la fonction isWishlisted
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
