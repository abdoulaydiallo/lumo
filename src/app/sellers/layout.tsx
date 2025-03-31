import { getUser } from "@/lib/auth";
import { getStoreLayoutData } from "@/features/store/api/queries";
import StoreLayoutClient from "@/components/store/StoreLayout";
import { redirect } from "next/navigation";

export default async function SellersLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const user = await getUser();
  if (!user?.id || user.role !== "store") {
    // Si l'utilisateur n'est pas connecté ou n'est pas un vendeur, redirigez-le vers la page de connexion
    redirect("/marketplace/products");
  }

  const userId = Number(user.id);
  const layoutData = await getStoreLayoutData(userId);
  return (
    <StoreLayoutClient initialData={layoutData}>{children}</StoreLayoutClient>
  );
}
