//@/app/marketplace/search/components/loading-skeleton.tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex flex-col">
          <Skeleton className="w-full h-48 rounded-t-md" />
          <Skeleton className="h-6 w-3/4 mt-2" />
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
      ))}
    </div>
  );
}
