// @/app/marketplace/stores/[storeId]/categories/new/page.tsx
import { Suspense } from "react";
import { getStoreById } from "@/features/stores/api/queries";
import CategoryForm from "@/features/products/components/category-form";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface NewCategoryPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function NewCategoryPage({
  params,
}: NewCategoryPageProps) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);

  const store = await getStoreById(storeId);
  if (!store) return notFound();

  const session = await auth();
  const isOwner =
    session?.user?.role === "store" &&
    Number(session?.user?.id) === store.userId;
  if (!isOwner) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-destructive">
          Vous n’êtes pas autorisé à créer une catégorie.
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<CategoryFormSkeleton />}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Créer une nouvelle catégorie
          </h1>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/marketplace/stores/${storeId}/products`}>
              Retour à la liste des produits
            </Link>
          </Button>
        </div>
        <CategoryForm storeId={storeId} />
      </div>
    </Suspense>
  );
}

function CategoryFormSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="h-8 w-1/2 sm:w-1/3 bg-muted animate-pulse" />
        <div className="h-10 w-full sm:w-32 bg-muted animate-pulse" />
      </div>
      <div className="space-y-6">
        <div className="h-20 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-20 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}
