// src/components/dashboard/shipments/Dashboard.tsx
"use client";

import React from "react";
import { ShipmentFilters, ShipmentSearchResult, ShipmentWithDetails } from "@/algorithms/shipments.search";
import { ShipmentList } from "./ShipmentList";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ShipmentDetailsDialog } from "./ShipmentDetailsDialog";
import { ShipmentStats } from "./ShipmentStats";
import { useLogistics } from "@/features/logistics/hooks/useLogistics";

interface StoreShipmentsDashboardProps {
  initialData: ShipmentSearchResult;
  initialFilters: ShipmentFilters;
  userId: number;
  userRole: "store" | "driver" | "admin" | "manager";
}

export const StoreShipmentsDashboard = ({
  initialData,
  initialFilters,
  userId,
  userRole,
}: StoreShipmentsDashboardProps) => {
  const [pagination, setPagination] = React.useState({
    page: initialData.page || 1,
    perPage: initialData.totalPages || 10,
  });
  const [selectedShipment, setSelectedShipment] = React.useState<ShipmentWithDetails | null>(null);

  // Utilisation du hook useLogistics
  const {
    shipments: logisticsShipments,
    isLoadingShipments,
  } = useLogistics(userId, userRole === "driver" ? "store" : userRole, initialData.stats?.totalShipments);

  // Calcul des statistiques si elles ne sont pas fournies dans initialData
  const calculatedStats = React.useMemo(() => {
    if (initialData.stats) return initialData.stats;
    
    // Calcul basé sur les données de useLogistics si initialData.stats n'existe pas
    const totalShipments = logisticsShipments?.length || 0;
    const statusDistribution = {
      pending: logisticsShipments?.filter(s => s.status === "pending").length || 0,
      in_progress: logisticsShipments?.filter(s => s.status === "in_progress").length || 0,
      delivered: logisticsShipments?.filter(s => s.status === "delivered").length || 0,
      failed: logisticsShipments?.filter(s => s.status === "failed").length || 0,
    };

    return {
      totalShipments,
      avgDeliveryTime: 180, // Valeur par défaut ou calculée
      onTimePercentage: 85, // Valeur par défaut ou calculée
      totalDeliveryFees: 0, // À calculer
      statusDistribution,
    };
  }, [initialData.stats, logisticsShipments]);

  return (
    <div className="space-y-4">
      <ShipmentStats stats={calculatedStats} />
      <ShipmentList
        shipments={initialData.shipments}
        totalPages={initialData.totalPages}
        pagination={pagination}
        setPagination={setPagination}
        isLoading={isLoadingShipments}
        userId={userId}
        userRole={userRole}
        onViewDetails={(shipment) => setSelectedShipment(shipment)}
        />
      <ShipmentDetailsDialog
        userId={userId}
        userRole={userRole}
        shipment={selectedShipment}
        isOpen={!!selectedShipment}
        setIsOpen={(open) => !open && setSelectedShipment(null)}
      />
    </div>
  );
};