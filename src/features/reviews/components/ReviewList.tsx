"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useReviews } from "../hooks/useReviews";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ReviewListProps {
  productId: number;
}

export function ReviewList({ productId }: ReviewListProps) {
  const { reviews, averageRating, total, isLoading } = useReviews(productId);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <motion.div key={i}>
        <Star
          className={cn(
            "h-5 w-5",
            i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          )}
        />
      </motion.div>
    ));
  };

  const getDisplayName = (review: any) =>
    review.userName ||
    review.userEmail?.split("@")[0] ||
    `Utilisateur ${review.userId}`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-800">
          Avis des clients
        </h3>
        <div className="mt-2 flex items-center gap-2">
          {renderStars(Math.round(averageRating))}
          <span className="text-sm text-gray-500">
            {typeof averageRating === "number"
              ? averageRating.toFixed(1)
              : "0.0"}{" "}
            / 5 ({total} avis)
          </span>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Chargement des avis...</p>
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3 border-t border-gray-200 pt-6"
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                      getDisplayName(review)
                    )}`}
                    alt={getDisplayName(review)}
                  />
                  <AvatarFallback>
                    {(review.userName?.[0] || review.userEmail?.[0] || "U") +
                      (review.userName?.[1] ||
                        review.userEmail?.[1] ||
                        review.userId)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800">
                      {getDisplayName(review)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                  <p className="mt-2 text-sm text-gray-700">
                    {review.comment || "Aucun commentaire"}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Aucun avis pour le moment.</p>
      )}
    </div>
  );
}
