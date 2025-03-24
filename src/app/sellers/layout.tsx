import { auth } from "@/lib/auth"; // Import auth() pour le serveur
import { getStoreLayoutData } from "@/features/store/api/queries";
import StoreLayoutClient from "@/components/store/StoreLayout";
import { redirect } from "next/navigation";

export default async function SellersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login"); // Redirection si non authentifié
  }

  const userId = Number(session.user.id); // Conversion en nombre pour correspondre au schéma
  const layoutData = await getStoreLayoutData(userId);

  return (
    <StoreLayoutClient initialData={layoutData}>{children}</StoreLayoutClient>
  );
}
