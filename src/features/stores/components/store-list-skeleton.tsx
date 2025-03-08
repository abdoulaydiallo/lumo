// @/features/stores/components/stores-list-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function StoresListSkeleton() {
  // Simuler 4 cartes pour correspondre à la grille lg:grid-cols-4
  const skeletonCards = Array(4).fill(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {skeletonCards.map((_, index) => (
        <div
          key={index}
          className="border border-border rounded-lg bg-background"
        >
          <Skeleton className="w-full h-32 rounded-t-lg" /> {/* Image */}
          <div className="p-4 space-y-2">
            <Skeleton className="h-6 w-3/4" /> {/* Titre */}
            <Skeleton className="h-4 w-full" /> {/* Description */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" /> {/* Badge */}
              <Skeleton className="h-4 w-20" /> {/* Type d'activité */}
            </div>
          </div>
          <div className="p-4 pt-0">
            <Skeleton className="h-3 w-1/2" /> {/* Date */}
          </div>
        </div>
      ))}
    </div>
  );
}
