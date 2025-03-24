"use client";

import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";

export function useReviews(productId: number) {
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const response = await fetch(
        `/api/reviews?productId=${productId}&limit=10&offset=0`
      );
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des avis");
      return response.json();
    },
    enabled: !!productId,
  });

  const addMutation = useMutation({
    mutationFn: async ({
      productId,
      rating,
      comment,
    }: {
      productId: number;
      rating: number;
      comment?: string;
    }) => {
      const response = await fetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ productId, rating, comment }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'ajout de l'avis");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["reviews", productId], (oldData: any) => {
        if (!oldData) return { reviews: [data.review], total: 1, averageRating: data.review.rating };
        const newReviews = [...oldData.reviews, data.review];
        const newTotal = oldData.total + 1;
        const newAverageRating =
          (oldData.averageRating * oldData.total + data.review.rating) / newTotal;
        return {
          reviews: newReviews,
          total: newTotal,
          averageRating: newAverageRating,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      toast.success(data.message);
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de l'ajout de l'avis"
      ),
  });

  return {
    reviews: reviewsQuery.data?.reviews || [],
    total: reviewsQuery.data?.total || 0,
    averageRating: reviewsQuery.data?.averageRating || 0,
    isLoading: reviewsQuery.isLoading || addMutation.isPending,
    fetchReviews: reviewsQuery.refetch,
    addReview: addMutation.mutate,
    isAdding: addMutation.isPending,
  };
}