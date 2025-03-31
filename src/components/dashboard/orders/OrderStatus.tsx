import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrderStatusProps {
  status: "pending" | "in_progress" | "delivered" | "cancelled";
  className?: string;
}

const statusConfig = {
  pending: {
    label: "En attente",
    icon: <Clock className="h-3 w-3" />,
    color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  },
  in_progress: {
    label: "En cours",
    icon: <Package className="h-3 w-3" />,
    color: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  },
  delivered: {
    label: "Livré",
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "bg-green-100 text-green-800 hover:bg-green-200",
  },
  cancelled: {
    label: "Annulé",
    icon: <AlertCircle className="h-3 w-3" />,
    color: "bg-red-100 text-red-800 hover:bg-red-200",
  },
  default: {
    label: "Inconnu",
    icon: <Package className="h-3 w-3" />,
    color: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  },
};

export function OrderStatus({ status, className }: OrderStatusProps) {
  const config =
    statusConfig[status] || statusConfig.default;

  return (
    <Badge
      className={cn("inline-flex items-center gap-1", config.color, className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}