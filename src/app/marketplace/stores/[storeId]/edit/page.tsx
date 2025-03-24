// app/(marketplace)/stores/[storeId]/edit/page.tsx
import { getStoreById } from "@/features/stores/api/queries";
import { Store } from "@/features/stores/api/types";
import EditStoreForm from "@/features/stores/components/edit-store-form";
import { notFound } from "next/navigation";

export const revalidate = 600; // ISR : 10 minutes

interface IParams {
  params: Promise<{ storeId: string }>;
}
export default async function EditStorePage({
  params,
}: IParams) {
  const resolvedParams = await params;
  const storeId = Number(resolvedParams.storeId);
  const store = await getStoreById(storeId);

  if (!store) {
    notFound();
  }

  return <EditStoreForm store={store} />;
}
