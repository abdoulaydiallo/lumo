// @/app/marketplace/stores/[storeId]/products/[productId]/edit/page.tsx
import { Suspense } from "react";
import { getProductById, getPromotionsByStoreId } from "@/features/products/api/queries";
import { getStoreById } from "@/features/stores/api/queries";
import {
  getAllCategories,
} from "@/features/products/api/queries";
import ProductForm from "@/features/products/components/create-product-form";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EditProductPageProps {
  params: Promise<{ storeId: string; productId: string }>;
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);
  const productId = Number(resolvedParams.productId);

  const store = await getStoreById(storeId);
  const product = await getProductById(productId, storeId);
  const categories = await getAllCategories();
  const promotions = await getPromotionsByStoreId(storeId);

  if (!product || !store) return notFound();

  const session = await auth();
  const isOwner =
    session?.user?.role === "store" &&
    Number(session?.user?.id) === store.userId;
  if (!isOwner) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-destructive">
          Vous n&apos;êtes pas autorisé à modifier ce produit.
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<EditProductSkeleton />}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Modifier {product.name}
          </h1>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/marketplace/stores/${storeId}/products/${productId}`}>
              Retour aux détails
            </Link>
          </Button>
        </div>
        <ProductForm
          storeId={storeId}
          categories={categories}
          promotions={promotions}
          initialData={product}
        />
      </div>
    </Suspense>
  );
}

function EditProductSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="h-8 w-1/2 sm:w-1/3 bg-muted animate-pulse" />
        <div className="h-10 w-full sm:w-32 bg-muted animate-pulse" />
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}
