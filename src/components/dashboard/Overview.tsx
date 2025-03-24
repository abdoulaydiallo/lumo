"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/shared/Badge";
import { ChartData, ChartOptions } from "chart.js";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useOverview } from "@/features/overview/hooks/useOverview";
import { OverviewData } from "@/features/overview/types";

const Chart = dynamic(() => import("@/components/shared/Chart"), {
  ssr: false,
});

interface OverviewProps {
  initialData: OverviewData;
}

export default function Overview({ initialData }: OverviewProps) {
  const { data, isLoading } = useOverview({ initialData });
  const [isMounted, setIsMounted] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Chargement...
      </div>
    );
  }

  const { orders, products, productStocks, storeDocuments, metrics } = data;
  const { totalOrders, pendingOrders, revenue, lowStockItems } = metrics;
  const documentStatus = storeDocuments[0]?.status || "pending";

  const orderStatusData: ChartData<"pie"> = {
    labels: ["En attente", "En cours", "Livrée"],
    datasets: [
      {
        data: [
          orders.filter((o) => o.status === "pending").length,
          orders.filter((o) => o.status === "in_progress").length,
          orders.filter((o) => o.status === "delivered").length,
        ],
        backgroundColor: ["#f97316", "#facc15", "#22c55e"],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 12, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.raw}`,
        },
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 min-h-screen">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
          Vue d’ensemble
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTips(!showTips)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 border-orange-500 text-orange-500 hover:bg-orange-50"
        >
          {showTips ? "Masquer" : "Conseils"}
          {showTips ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Conseils */}
      {showTips && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <CheckCircle className="h-5 w-5 text-blue-500" /> Premiers pas
          </AlertTitle>
          <AlertDescription className="text-sm text-gray-600 mt-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Documents</strong> : Validez-les pour vendre.
              </li>
              <li>
                <strong>Commandes</strong> : Expédiez les "En attente".
              </li>
              <li>
                <strong>Stocks</strong> : Réapprovisionnez les ruptures.
              </li>
              <li>
                <strong>Explorez</strong> : Gérer livreurs et finances.
              </li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-2 p-4">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-sm sm:text-base font-medium">
              Commandes totales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-grow">
            <p className="text-xl sm:text-2xl font-semibold">{totalOrders}</p>
            <p className="text-xs text-gray-500">Total reçu</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-2 p-4">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-sm sm:text-base font-medium">
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-grow">
            <p className="text-xl sm:text-2xl font-semibold">{pendingOrders}</p>
            <p className="text-xs text-gray-500">À expédier</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-2 p-4">
            <Package className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-sm sm:text-base font-medium">
              Revenu estimé
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-grow">
            <p className="text-xl sm:text-2xl font-semibold">
              {revenue.toLocaleString()} GNF
            </p>
            <p className="text-xs text-gray-500">Sur livraisons</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-2 p-4">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-sm sm:text-base font-medium">
              Stock critique
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-grow">
            <p className="text-xl sm:text-2xl font-semibold">{lowStockItems}</p>
            <p className="text-xs text-gray-500">Moins de 5 unités</p>
          </CardContent>
        </Card>
      </div>

      {/* Statut des documents */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center gap-2 p-4">
          <CheckCircle className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-sm sm:text-base font-medium">
            Statut des documents
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Badge
                variant={
                    documentStatus === "approved"
                    ? "success"
                    : documentStatus === "pending"
                    ? "warning"
                    : "secondary"
                }
              className="text-xs sm:text-sm"
            >
              {documentStatus}
            </Badge>
            <p className="text-xs sm:text-sm text-gray-500">
              {documentStatus === "approved"
                ? "Prêt à vendre."
                : documentStatus === "pending"
                ? "Validation en cours."
                : "Rejeté. Voir 'Support'."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Graphique */}
      <Card className="shadow-sm">
        <CardHeader className="p-4">
          <CardTitle className="text-sm sm:text-base font-medium">
            Répartition des commandes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="w-full h-64 sm:h-72 md:h-80 lg:h-96">
            <Chart type="pie" data={orderStatusData} options={chartOptions} />
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Priorisez les "En attente".
          </p>
        </CardContent>
      </Card>

      {/* Alertes */}
      {(lowStockItems > 0 || pendingOrders > 0) && (
        <Alert variant="destructive" className="shadow-sm">
          <AlertTitle className="text-base sm:text-lg font-semibold">
            Actions urgentes
          </AlertTitle>
          <AlertDescription className="text-sm mt-2">
            <ul className="list-disc pl-5 space-y-1">
              {lowStockItems > 0 && (
                <li>Réapprovisionnez {lowStockItems} produit(s).</li>
              )}
              {pendingOrders > 0 && (
                <li>Traitez {pendingOrders} commande(s).</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
