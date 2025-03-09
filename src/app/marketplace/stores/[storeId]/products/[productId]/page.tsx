// @/app/marketplace/stores/[storeId]/products/[productId]/page.tsx
import { Suspense } from "react";
import { getProductById } from "@/features/products/api/queries";
import ProductDetails from "@/features/products/components/product-details";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/lib/auth"; // Import pour vérifier l'utilisateur
import Heading from "@/components/Heading";
import { getStoreById } from "@/features/stores/api/queries";

interface ProductPageProps {
  params: Promise<{ storeId: string; productId: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);
  const productId = Number(resolvedParams.productId);

  const store = await getStoreById(storeId);
  const product = await getProductById(productId, storeId);

  if (!product || !store) return notFound();

  // Vérification côté serveur si l'utilisateur est le propriétaire
  const session = await auth();
  const isOwner =
    session?.user?.role === "store" &&
    Number(session?.user?.id) === store.userId;

  return (
    <Suspense fallback={<ProductDetailsSkeleton />}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/marketplace/stores/${storeId}/products`}>
              Retour à la liste
            </Link>
          </Button>
        </div>
        <ProductDetails product={product} storeId={storeId} isOwner={isOwner} />
      </div>
    </Suspense>
  );
}

function ProductDetailsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="h-8 w-1/2 sm:w-1/3 bg-muted animate-pulse" />
        <div className="h-10 w-full sm:w-32 bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="h-64 sm:h-72 md:h-96 w-full bg-muted animate-pulse rounded-lg" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-16 w-16 sm:h-20 sm:w-20 bg-muted animate-pulse rounded-md"
              />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-8 w-3/4 bg-muted animate-pulse" />
          <div className="h-6 w-1/2 bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted animate-pulse" />
            <div className="h-4 w-3/4 bg-muted animate-pulse" />
            <div className="h-4 w-1/2 bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-full sm:w-32 bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
