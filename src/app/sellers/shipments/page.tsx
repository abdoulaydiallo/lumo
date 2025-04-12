// src/app/sellers/shipments/page.tsx
export const dynamic = "force-dynamic";

import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInitialShipments, SearchParams } from "@/features/logistics/api/queries";
import { StoreShipmentsDashboard } from "@/components/dashboard/shipments/Dashboard";
import { ShipmentFilters } from "@/algorithms/shipments.search";
import { shipmentStatuses } from "@/lib/db/schema";

export default async function SellerShipmentsDashboard({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getUser();

  // Vérification de l'utilisateur et redirection si non-vendeur
  if (!user?.id || user?.role !== "store") {
    redirect("/marketplace/products");
  }

  // Résolution des searchParams
  const resolvedSearchParams = await searchParams;

  // Transformation des searchParams en ShipmentFilters
  const initialFilters: ShipmentFilters = {
    status: resolvedSearchParams.status
      ?.split(",")
      .filter((s) => shipmentStatuses.enumValues.includes(s as any)) as ShipmentFilters["status"],
    driverId: resolvedSearchParams.driverId && !isNaN(parseInt(resolvedSearchParams.driverId))
      ? parseInt(resolvedSearchParams.driverId)
      : undefined,
    priorityLevel: resolvedSearchParams.priorityLevel
      ?.split(",")
      .filter((p) => p.length > 0) as ShipmentFilters["priorityLevel"],
    dateRange:
      resolvedSearchParams.startDate && resolvedSearchParams.endDate
        ? {
            start: new Date(resolvedSearchParams.startDate),
            end: new Date(resolvedSearchParams.endDate),
          }
        : undefined,
    storeId: resolvedSearchParams.storeId && !isNaN(parseInt(resolvedSearchParams.storeId))
      ? parseInt(resolvedSearchParams.storeId)
      : undefined,
    minEstimatedDeliveryTime:
      resolvedSearchParams.minEstimatedDeliveryTime &&
      !isNaN(parseFloat(resolvedSearchParams.minEstimatedDeliveryTime))
        ? parseFloat(resolvedSearchParams.minEstimatedDeliveryTime)
        : undefined,
    maxEstimatedDeliveryTime:
      resolvedSearchParams.maxEstimatedDeliveryTime &&
      !isNaN(parseFloat(resolvedSearchParams.maxEstimatedDeliveryTime))
        ? parseFloat(resolvedSearchParams.maxEstimatedDeliveryTime)
        : undefined,
    hasSupportTicket:
      resolvedSearchParams.hasSupportTicket === "true"
        ? true
        : resolvedSearchParams.hasSupportTicket === "false"
        ? false
        : undefined,
  };

  // Récupération des données initiales
  const initialData = await getInitialShipments(
    Number(user.id),
    user.role as "store",
    resolvedSearchParams
  );

  return (
    <StoreShipmentsDashboard
      initialData={initialData}
      initialFilters={initialFilters}
      userId={Number(user.id)} // Passage explicite de userId
      userRole={user.role as "store"} // Passage explicite de userRole
    />
  );
}