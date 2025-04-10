"use client";

import React from "react";
import {
  Package,
  Timer,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import { Duration } from "./Duration";
import { StoreOrderStats, StoreOrderWithDetails } from "@/algorithms/storeOrders.search";

export default function OrderStats({ orders, stats }: { orders: StoreOrderWithDetails[]; stats: StoreOrderStats }) {
  const totalOrders = orders.length;
  const delayedCount = orders.filter(o => o.isDelayed).length;
  const delayedPercentage = totalOrders > 0
    ? Math.round((delayedCount / totalOrders) * 100)
    : 0;

  // Configuration responsive des données
  const statusData = [
    {
      id: "delivered",
      label: "Livrées",
      shortLabel: "Livrées",
      value: stats?.statusDistribution?.delivered || 0,
      icon: CheckCircle,
      color: "bg-green-500",
      textColor: "text-green-500"
    },
    {
      id: "in_progress",
      label: "En cours",
      shortLabel: "En Cours",
      value: stats?.statusDistribution?.in_progress || 0,
      icon: Clock,
      color: "bg-yellow-400",
      textColor: "text-yellow-500"
    },
    {
      id: "pending",
      label: "En attente",
      shortLabel: "En attente",
      value: stats?.statusDistribution?.pending || 0,
      icon: Loader2,
      color: "bg-gray-400",
      textColor: "text-gray-500"
    },
    {
      id: "cancelled",
      label: "Annulées",
      shortLabel: "Annulées",
      value: stats?.statusDistribution?.cancelled || 0,
      icon: XCircle,
      color: "bg-red-500",
      textColor: "text-red-500"
    }
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Section Principale - KPI */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:flex md:flex-wrap">
        {/* Mobile: 3 KPI principaux */}
        <StatBlock 
          title="Commandes" 
          value={totalOrders} 
          icon={Package}
          className="col-span-1"
          mobileOnly
        />
        
        <StatBlock 
          title="À temps" 
          value={`${stats?.onTimePercentage || 0}%`} 
          icon={CheckCircle}
          variant="positive"
          className="col-span-1"
          mobileOnly
        />
        
        <StatBlock 
          title="Retards" 
          value={`${delayedPercentage}%`} 
          icon={AlertCircle}
          variant={delayedPercentage > 20 ? "negative" : "default"}
          className="col-span-1"
          mobileOnly
        />

        {/* Desktop: Tous les KPI */}
        <StatBlock 
          title="CA Total" 
          value={`${(stats?.totalAmount || 0).toLocaleString()} GNF`} 
          icon={Package}
          description={`${totalOrders} cmd`}
          className="hidden md:block flex-1 min-w-[150px]"
        />
        
        <StatBlock 
          title="Livraison" 
          value={<Duration value={stats?.avgDeliveryTime || 0} format="short" className="font-mono" />} 
          icon={Timer}
          description="Moyenne"
          className="hidden md:block flex-1 min-w-[120px]"
        />
        
        <StatBlock 
          title="Préparation" 
          value={<Duration 
            value={stats?.avgPreparationTime || 0 }
            format="auto" 
            className="font-mono" />
        } 
          icon={Clock}
          description="Avant expédition"
          className="hidden md:block flex-1 min-w-[120px]"
        />
        
        <StatBlock 
          title="À temps" 
          value={`${stats?.onTimePercentage || 0}%`} 
          icon={CheckCircle}
          variant="positive"
          description="Livraisons"
          className="hidden md:block flex-1 min-w-[100px]"
        />
        
        <StatBlock 
          title="Retards" 
          value={`${delayedPercentage}%`} 
          icon={AlertCircle}
          variant={delayedPercentage > 20 ? "negative" : "default"}
          description={`${delayedCount} cmd`}
          className="hidden md:block flex-1 min-w-[100px]"
        />
      </div>

      {/* Section Statuts - Adaptative */}
      <div className=" rounded-lg p-3 sm:p-4 shadow-sm">
        <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3">
          Statut des commandes
        </h3>
        
        {/* Mobile: Liste verticale compacte */}
        <div className="md:hidden space-y-2">
          {statusData.map(status => {
            const percentage = totalOrders > 0
              ? Math.round((status.value / totalOrders) * 100)
              : 0;
            
            return (
              <div key={status.id} className="flex items-center">
                <status.icon className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${status.textColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="truncate">{status.shortLabel}</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100  rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full ${status.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Desktop: Grille avec barres détaillées */}
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-3">
          {statusData.map(status => {
            const percentage = totalOrders > 0
              ? Math.round((status.value / totalOrders) * 100)
              : 0;
            
            return (
              <div key={status.id} className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${status.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm">
                    <span>{status.label}</span>
                    <span className="font-medium">{status.value} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${status.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Composant StatBlock unifié
function StatBlock({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  className = "",
  mobileOnly = false
}: {
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: "default" | "positive" | "negative";
  className?: string;
  mobileOnly?: boolean;
}) {
  return (
    <div className={cn(
      "border rounded-lg p-2 sm:p-3",
      mobileOnly ? "block md:hidden" : "",
      variant === "positive" ? "text-green-600" : "",
      variant === "negative" ? "text-red-600" : "",
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-gray-600">{title}</span>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
      </div>
      <div className="mt-1 text-lg sm:text-xl font-bold">{value}</div>
      {description && (
        <div className="mt-0.5 text-xs text-gray-500">{description}</div>
      )}
    </div>
  );
}

// Utilitaire pour combiner les classes
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}