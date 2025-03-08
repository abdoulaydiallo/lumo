// @/features/stores/components/store-details-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function StoreDetailsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
      {/* Contenu principal */}
      <div className="flex-1">
        <div className="border border-border rounded-lg bg-background p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/2" /> {/* Titre */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" /> {/* Badge */}
              <Skeleton className="h-4 w-20" /> {/* Type */}
            </div>
          </div>
          <Skeleton className="w-full h-64" /> {/* Image */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/4" /> {/* Sous-titre */}
            <Skeleton className="h-4 w-full" /> {/* Description */}
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/4" /> {/* Sous-titre */}
            <Skeleton className="h-4 w-1/2" /> {/* Infos */}
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>

      {/* Barre latérale */}
      <div className="w-full md:w-80">
        <div className="border border-border rounded-lg bg-background">
          <div className="p-4">
            <Skeleton className="h-6 w-1/2" /> {/* Titre */}
          </div>
          <div className="p-4 pt-0 space-y-2">
            {Array(7)
              .fill(null)
              .map((_, index) => (
                <div key={index} className="flex justify-between">
                  <Skeleton className="h-4 w-1/4" /> {/* Jour */}
                  <Skeleton className="h-4 w-1/3" /> {/* Horaires */}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
