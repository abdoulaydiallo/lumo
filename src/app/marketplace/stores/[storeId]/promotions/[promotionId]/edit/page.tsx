// @/app/marketplace/stores/[storeId]/promotions/[promotionId]/edit/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStoreById } from "@/features/stores/api/queries";
import { getPromotionById } from "@/features/promotions/api/queries";
import PromotionForm from "@/features/promotions/components/promotion-form";

interface EditPromotionPageProps {
  params: Promise<{ storeId: string; promotionId: string }>;
}

export default async function EditPromotionPage({
  params,
}: EditPromotionPageProps) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);
  const promotionId = Number(resolvedParams.promotionId);

  const store = await getStoreById(storeId);
  if (!store) return notFound();

  const session = await auth();
  const isOwner =
    session?.user?.role === "store" &&
    Number(session?.user?.id) === store.userId;
  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-destructive">
          Vous n&apos;êtes pas autorisé à modifier cette promotion.
        </p>
      </div>
    );
  }

  const promotion = await getPromotionById(promotionId, storeId);
  if (!promotion) return notFound();

  const initialData = {
    code: promotion.code,
    discountPercentage: promotion.discountPercentage,
    startDate: promotion.startDate
      ? new Date(promotion.startDate).toISOString().split("T")[0]
      : undefined,
    endDate: promotion.endDate
      ? new Date(promotion.endDate).toISOString().split("T")[0]
      : undefined,
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PromotionForm
        storeId={storeId}
        promotionId={promotionId}
        initialData={initialData as any}
      />
    </div>
  );
}
