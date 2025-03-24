"use client";

import { useStoreLayout } from "@/features/store/hooks/useStoreLayout";
import Navbar from "./Navbar";
import AppSidebar from "./Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { StoreLayoutData } from "@/features/store/types";

export default function StoreLayoutClient({
  initialData,
  children,
}: {
  initialData: StoreLayoutData;
  children: React.ReactNode;
}) {
  const { data, isLoading } = useStoreLayout({ initialData });

  if (isLoading || !data) {
    return <div>Chargement...</div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={data.user} stores={data.stores} layoutData={data} />
      <div className="flex-1">
        <Navbar user={data.user} notifications={data.notifications} />{" "}
        {/* Vérifiez cette ligne */}
        <main className="p-4 relative">{children}</main>
      </div>
    </SidebarProvider>
  );
}
