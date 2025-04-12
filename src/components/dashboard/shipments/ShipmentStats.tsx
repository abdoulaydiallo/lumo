"use client";

import React from "react";
import {
  Package,
  Timer,
  CheckCircle,
  Loader2,
  XCircle,
  Truck,
  DollarSign,
  Box,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/Badge";

type ShipmentStatus = "pending" | "in_progress" | "delivered" | "failed";

export interface ShipmentStats {
  totalShipments: number;
  avgDeliveryTime: number;
  onTimePercentage: number;
  totalDeliveryFees: number;
  statusDistribution: {
    [key in ShipmentStatus]: number;
  };
}

interface ShipmentStatsProps {
  stats: ShipmentStats;
}

const statusConfig = [
  {
    id: "pending" as const,
    label: "En attente",
    icon: Loader2,
    color: "bg-amber-500",
    textColor: "text-amber-500",
  },
  {
    id: "in_progress" as const,
    label: "En cours",
    icon: Truck,
    color: "bg-blue-500",
    textColor: "text-blue-500",
  },
  {
    id: "delivered" as const,
    label: "Livrées",
    icon: CheckCircle,
    color: "bg-emerald-500",
    textColor: "text-emerald-500",
  },
  {
    id: "failed" as const,
    label: "Échouées",
    icon: XCircle,
    color: "bg-red-500",
    textColor: "text-red-500",
  },
];

export function ShipmentStats({ stats }: ShipmentStatsProps) {
  // Calcul du poids total (exemple: estimé à 10kg par colis)
  const totalWeight = stats.totalShipments * 10;
  
  // Calcul des retards (exemple: 10% des livraisons sont en retard)
  const delayedShipments = Math.round(stats.totalShipments * 0.1);
  
  const totalShipments = stats.totalShipments;
  const delayedPercentage = totalShipments > 0 
    ? Math.round((delayedShipments / totalShipments) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* KPI Principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Expéditions"
          value={stats.totalShipments}
          icon={<Package className="h-5 w-5" />}
          trend="neutral"
        />
        <StatCard
          title="Taux de réussite"
          value={`${stats.onTimePercentage}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          trend={stats.onTimePercentage > 80 ? "up" : "down"}
          description={`${delayedShipments} retards`}
        />
        <StatCard
          title="Temps moyen"
          value={`${Math.round(stats.avgDeliveryTime / 60)}h`}
          icon={<Timer className="h-5 w-5" />}
          trend="neutral"
          description="Livraison"
        />
        <StatCard
          title="Frais totaux"
          value={`${stats.totalDeliveryFees.toLocaleString()} GNF`}
          icon={<DollarSign className="h-5 w-5" />}
          trend="up"
          description={`${totalWeight} kg`}
        />
      </div>

      {/* Répartition par statut */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Box className="h-5 w-5" />
            Statut des expéditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusConfig.map((status) => {
              const count = stats.statusDistribution[status.id] || 0;
              const percentage = totalShipments > 0 
                ? Math.round((count / totalShipments) * 100) 
                : 0;

              return (
                <div key={status.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <status.icon className={`h-4 w-4 ${status.textColor}`} />
                      <span>{status.label}</span>
                    </div>
                    <span className="font-medium">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={`h-2 rounded-full`} 
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Détails supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Retards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Expéditions en retard</span>
                <span className="font-medium">
                  {delayedShipments} ({delayedPercentage}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Taux acceptable</span>
                <span className="font-medium">
                  {delayedPercentage <= 10 ? (
                    <Badge variant="success">Bon</Badge>
                  ) : delayedPercentage <= 20 ? (
                    <Badge variant="warning">Moyen</Badge>
                  ) : (
                    <Badge variant="warning">Critique</Badge>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Livraisons à temps</span>
                <span className="font-medium text-emerald-500">
                  {stats.onTimePercentage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Temps moyen</span>
                <span className="font-medium">
                  {Math.round(stats.avgDeliveryTime / 60)}h
                </span>
              </div>
              <div className="flex justify-between">
                <span>Poids total</span>
                <span className="font-medium">
                  {totalWeight} kg
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
}

function StatCard({ title, value, icon, description, trend = "neutral" }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {trend !== "neutral" && (
              <span
                className={cn(
                  "flex items-center text-sm",
                  trend === "up" ? "text-emerald-500" : "text-red-500"
                )}
              >
                {trend === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </span>
            )}
          </div>
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}