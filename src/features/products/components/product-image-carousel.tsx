// @/features/products/components/product-image-carousel.tsx
"use client";

import { useState } from "react";
import { ProductImage } from "@/features/products/api/types";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageCarouselProps {
  images: ProductImage[];
  className?: string;
}

export default function ProductImageCarousel({
  images,
  className,
}: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () =>
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  const goToImage = (index: number) => setCurrentIndex(index);

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "relative w-full h-64 sm:h-72 md:h-96 bg-gray-100 rounded-lg",
          className
        )}
      >
        <Image
          src="/placeholder-image.jpg"
          alt="Image placeholder"
          fill
          className="object-cover rounded-lg"
        />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full space-y-4", className)}>
      {/* Image principale */}
      <div className="relative w-full border h-64 sm:h-72 md:h-96 overflow-hidden rounded-lg shadow-sm">
        <Image
          src={images[currentIndex].imageUrl}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          fill
          className="object-contain transition-all duration-300"
        />
        {images.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-gray-100 text-gray-600 border-gray-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-gray-100 text-gray-600 border-gray-300"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Miniatures */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 justify-start">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                "relative w-16 h-16 sm:w-20 sm:h-20 cursor-pointer flex-shrink-0 rounded-md overflow-hidden border-2",
                currentIndex === index
                  ? "border-blue-500"
                  : "border-gray-200 hover:border-gray-400"
              )}
              onClick={() => goToImage(index)}
            >
              <Image
                src={image.imageUrl}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
