// app/(marketplace)/stores/create/page.tsx
import { redirect } from "next/navigation";
import StoreForm from "@/features/stores/components/store-form";
import { auth } from "@/lib/auth";

export default async function CreateStorePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "store") {
    redirect("/login");
  }

  return <StoreForm />;
}
