// @/app/marketplace/stores/[storeId]/products/page.tsx
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Heading from "@/components/Heading";

interface ProductsPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);

  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <Heading
            title="Produits de la boutique"
            subtitle="La liste de tous les produits vendu dans la boutique"
          />
          <Button asChild>
            <Link href={`/marketplace/stores/${storeId}/products/new`}>
              Ajouter un produit
            </Link>
          </Button>
        </div>
      </div>
    </Suspense>
  );
}

function ProductsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-1/3 bg-muted animate-pulse" />
        <div className="h-10 w-32 bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-muted animate-pulse rounded-lg h-72" />
        ))}
      </div>
    </div>
  );
}
