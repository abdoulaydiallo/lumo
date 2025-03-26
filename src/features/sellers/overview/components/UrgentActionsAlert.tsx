import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { UrgentActionsAlertProps } from "./types";

export function UrgentActionsAlert({
  lowStockItems,
  pendingOrders,
  lowStockThreshold = 5,
}: UrgentActionsAlertProps) {
  const showAlert = lowStockItems > 0 || pendingOrders > 0;

  if (!showAlert) return null;

  return (
    <Alert variant="destructive" className="shadow-sm">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Actions urgentes</AlertTitle>
      <AlertDescription className="mt-2">
        <ul className="list-disc pl-5 space-y-1">
          {lowStockItems > 0 && (
            <li>
              {lowStockItems} produit(s) avec stock inférieur à{" "}
              {lowStockThreshold} unités
            </li>
          )}
          {pendingOrders > 0 && (
            <li>{pendingOrders} commande(s) en attente de traitement</li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
