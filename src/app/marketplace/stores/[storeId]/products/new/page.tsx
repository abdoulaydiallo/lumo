// @/app/marketplace/stores/[storeId]/products/new/page.tsx
import { Suspense } from "react";
import {
  getAllCategories,
  getAllPromotions,
} from "@/features/products/api/queries";
import CreateProductForm from "@/features/products/components/create-product-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Heading from "@/components/Heading";

interface CreateProductPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function CreateProductPage({
  params,
}: CreateProductPageProps) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);
  const categories = await getAllCategories();
  const promotions = await getAllPromotions();

  return (
    <Suspense fallback={<CreateProductSkeleton />}>
      <div className="max-w-5xl mx-auto py-6">
        <Heading level="h1" title="Ajouter un produit"></Heading>
        <Card>
          <CardContent>
            <CreateProductForm
              storeId={storeId}
              categories={categories}
              promotions={promotions}
            />
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}

function CreateProductSkeleton() {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="h-6 w-1/4 bg-muted animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-1/6 bg-muted animate-pulse" />
              <div className="h-10 w-full bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-1/6 bg-muted animate-pulse" />
              <div className="h-10 w-full bg-muted animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-1/6 bg-muted animate-pulse" />
              <div className="h-10 w-full bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-1/6 bg-muted animate-pulse" />
              <div className="h-10 w-full bg-muted animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-1/6 bg-muted animate-pulse" />
            <div className="h-20 w-full bg-muted animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-1/6 bg-muted animate-pulse" />
            <div className="h-10 w-full bg-muted animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-1/4 bg-muted animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-1/6 bg-muted animate-pulse" />
                <div className="h-10 w-full bg-muted animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-1/6 bg-muted animate-pulse" />
                <div className="h-10 w-full bg-muted animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-1/6 bg-muted animate-pulse" />
                <div className="h-10 w-full bg-muted animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-1/6 bg-muted animate-pulse" />
                <div className="h-10 w-full bg-muted animate-pulse" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-1/6 bg-muted animate-pulse" />
            <div className="h-10 w-full bg-muted animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-1/6 bg-muted animate-pulse" />
            <div className="h-10 w-full bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
