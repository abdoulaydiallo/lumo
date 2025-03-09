import { Suspense } from "react";
import { getStoreById } from "@/features/stores/api/queries";
import { getPromotionsByStoreId } from "@/features/promotions/api/queries"; // Assurez-vous que c'est bien "queries"
import { markExpiredPromotions } from "@/features/promotions/api/actions";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PromotionsTable from "@/features/promotions/components/promotions-table";

interface PromotionsPageProps {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ page?: string; filter?: string }>;
}

export default async function PromotionsPage({
  params,
  searchParams,
}: PromotionsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const storeId = Number(resolvedParams.storeId);
  const page = Number(resolvedSearchParams.page) || 1;
  const filter =
    (resolvedSearchParams.filter as
      | "active"
      | "inactive"
      | "expired"
      | "all") || "all";
  const limit = 10;
  const offset = (page - 1) * limit;

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
          Vous n'êtes pas autorisé à voir les promotions de cette boutique.
        </p>
      </div>
    );
  }

  await markExpiredPromotions(storeId);
  const { promotions, total } = await getPromotionsByStoreId(
    storeId,
    limit,
    offset,filter);

  return (
    <Suspense fallback={<PromotionsSkeleton />}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Promotions de la boutique
          </h1>
          <Button asChild variant="default" className="w-full sm:w-auto">
            <Link href={`/marketplace/stores/${storeId}/promotions/new`}>
              Ajouter une promotion
            </Link>
          </Button>
        </div>

        {promotions.length === 0 ? (
          <p className="text-muted-foreground">
            Aucune promotion trouvée pour cette boutique.
          </p>
        ) : (
          <div className="border rounded-md">
            <PromotionsTable
              initialPromotions={promotions as any}
              storeId={storeId}
              initialTotal={total}
            />
          </div>
        )}
      </div>
    </Suspense>
  );
}

function PromotionsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="h-8 w-1/2 sm:w-1/3 bg-muted animate-pulse" />
        <div className="h-10 w-full sm:w-32 bg-muted animate-pulse" />
      </div>
      <div className="border rounded-md">
        <div className="space-y-4 p-4">
          {Array(3)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="h-10 w-full bg-muted animate-pulse" />
            ))}
        </div>
      </div>
    </div>
  );
}
