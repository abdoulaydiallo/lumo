// app/(marketplace)/stores/create/page.tsx
import { redirect } from "next/navigation";
import StoreForm from "@/features/stores/components/store-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function CreateStorePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "store") {
    redirect("/login");
  }

  return <StoreForm />;
}
