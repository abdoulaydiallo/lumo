"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useReviews } from "../hooks/useReviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  productId: number;
}

export function ReviewForm({ productId }: ReviewFormProps) {
  const { addReview, isAdding } = useReviews(productId);
  const [newRating, setNewRating] = useState<number>(0);
  const [newComment, setNewComment] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRating === 0) return;
    addReview({ productId, rating: newRating, comment: newComment });
    setNewRating(0);
    setNewComment("");
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <motion.div
        key={i}
        whileHover={{ scale: 1.2 }}
        onClick={() => setNewRating(i + 1)}
        className="cursor-pointer"
      >
        <Star
          className={cn(
            "h-5 w-5",
            i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          )}
        />
      </motion.div>
    ));
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <h4 className="mb-4 text-lg font-semibold text-gray-800">
        Laisser un avis
      </h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Votre note
          </label>
          <div className="mt-2 flex gap-2">{renderStars(newRating)}</div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">
            Votre commentaire
          </label>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Partagez votre expérience..."
            className="mt-2"
            rows={4}
          />
        </div>
        <Button type="submit" disabled={isAdding || newRating === 0}>
          {isAdding ? "Ajout en cours..." : "Soumettre"}
        </Button>
      </form>
    </div>
  );
}
