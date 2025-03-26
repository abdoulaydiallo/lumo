"use client";

import { MetricCard } from "@/features/sellers/overview/components/MetricCard";
import { OrderStatusChart } from "@/features/sellers/overview/components/OrderStatusChart";
import { DocumentStatusCard } from "@/features/sellers/overview/components/DocumentStatusCard";
import { UrgentActionsAlert } from "@/features/sellers/overview/components/UrgentActionsAlert";
import { TipsCard } from "@/features/sellers/overview/components/TipsCard";

// Composants internes
const Header = () => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
      Vue d'ensemble
    </h1>
  </div>
);

export default function Overview({ initialData }) {
  // Déstructurer les données directement depuis initialData
  const { orders, storeDocuments, metrics } = initialData;

  // Calculer le statut des documents (exemple simplifié)
  const storeDocumentsStatus = storeDocuments.some(
    (doc: { status: string; }) => doc.status === "pending"
  )
    ? "pending"
    : "approved"; // À adapter selon votre logique réelle

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Header />
      <TipsCard />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenu estimé"
          value={`${metrics.revenue.toLocaleString()} GNF`}
          trend="up"
          percentage={metrics.deliveredPercentage}
          description="Sur livraisons"
          icon="revenue"
        />
        <MetricCard
          title="Commandes totales"
          value={metrics.totalOrders}
          trend="up"
          percentage={metrics.deliveredPercentage}
          description="Total reçu"
          icon="orders"
        />
        <MetricCard
          title="Commandes en attente"
          value={metrics.pendingOrders}
          trend="down"
          percentage={metrics.pendingPercentage}
          description="Priorité d'action"
          icon="pending"
        />
        <MetricCard
          title="Stock critique"
          value={metrics.lowStockItems}
          trend="down"
          percentage={metrics.lowStockPercentage}
          description="Moins de 5 unités"
          icon="stock"
        />
      </div>

      <DocumentStatusCard status={storeDocumentsStatus} loading={false} />

      <OrderStatusChart orders={orders} />

      <UrgentActionsAlert
        lowStockItems={metrics.lowStockItems}
        pendingOrders={metrics.pendingOrders}
      />
    </div>
  );
}
