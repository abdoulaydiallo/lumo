// @/app/marketplace/stores/[storeId]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getStoreById } from "@/features/stores/api/queries";
import StoreDetails from "@/features/stores/components/store-details";
import StoreDetailsSkeleton from "@/features/stores/components/store-details-skeleton";
import { Metadata } from "next";
import { auth } from "@/lib/auth";

interface StoreDetailsPageProps {
  params: Promise<{ storeId: string }>;
}

// Générer les métadonnées pour le SEO
export async function generateMetadata({
  params,
}: StoreDetailsPageProps): Promise<Metadata> {
  const resolvedParams = await params; // Attendre la résolution des params
  const storeId = parseInt(resolvedParams.storeId, 10);
  if (isNaN(storeId)) return { title: "Boutique non trouvée" };

  const store = await getStoreById(storeId);
  if (!store) return { title: "Boutique non trouvée" };

  return {
    title: `${store.name} - Marketplace`,
    description:
      store.description ||
      `Découvrez ${store.name}, une boutique de type ${store.activityType}.`,
    openGraph: {
      title: store.name,
      description: store.description || `${store.name} sur Marketplace`,
      images: [store.coverImageUrl || store.profileImageUrl || ""].filter(
        Boolean
      ),
      url: `/marketplace/stores/${storeId}`,
    },
  };
}

export default async function StoreDetailsPage({
  params,
}: StoreDetailsPageProps) {
  const resolvedParams = await params; // Attendre la résolution des params
  const storeId = parseInt(resolvedParams.storeId, 10);
  if (isNaN(storeId)) return notFound();

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<StoreDetailsSkeleton />}>
        <StoreDetailsWrapper storeId={storeId} />
      </Suspense>
    </div>
  );
}

async function StoreDetailsWrapper({ storeId }: { storeId: number }) {
  const store = await getStoreById(storeId);
  const session = await auth();
  if (!store) return notFound();

  // Simuler un utilisateur connecté (à remplacer par votre logique d'authentification)
  const currentUserId = Number(session?.user.id); // Exemple statique, utilisez votre système d'auth (ex. Clerk, NextAuth)
  const isOwner = store.userId === currentUserId;

  return <StoreDetails store={store} isOwner={isOwner} />;
}
