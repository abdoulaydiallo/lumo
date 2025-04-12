"use client";

import React, { useCallback, useMemo } from "react";
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Truck,
  Clock,
  AlertTriangle,
  Phone,
  MapPin,
  Package,
  Calendar,
  User,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ShipmentStatus, ShipmentWithDetails } from "@/algorithms/shipments.search";
import { Badge } from "@/components/shared/Badge";
import { toast } from "sonner";
import { useLogistics } from "@/features/logistics/hooks/useLogistics";

interface ShipmentStatusConfig {
  variant: "default" | "secondary" | "destructive" | "outline" | "success";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}

const defaultStatusConfig: Record<ShipmentStatus, ShipmentStatusConfig> = {
  delivered: {
    variant: "success",
    icon: CheckCircle,
    label: "Livré",
    color: "bg-emerald-100 text-emerald-800",
  },
  in_progress: {
    variant: "secondary",
    icon: Truck,
    label: "En cours",
    color: "bg-blue-100 text-blue-800",
  },
  pending: {
    variant: "outline",
    icon: Clock,
    label: "En attente",
    color: "bg-amber-100 text-amber-800",
  },
  failed: {
    variant: "destructive",
    icon: XCircle,
    label: "Échoué",
    color: "bg-red-100 text-red-800",
  },
};

const priorityConfig = {
  high: "destructive",
  normal: "outline",
  low: "secondary",
};

interface ShipmentCardProps {
  shipment: ShipmentWithDetails;
  statusConfig?: Record<ShipmentStatus, ShipmentStatusConfig>;
  onViewDetails?: (shipment: ShipmentWithDetails) => void;
  onCancel?: (shipment: ShipmentWithDetails) => Promise<void>;
  onUpdateStatus?: (shipmentId: number, newStatus: ShipmentStatus) => Promise<void>;
  onContactCustomer?: (customerId: number) => void;
  renderExtraActions?: (shipment: ShipmentWithDetails) => React.ReactNode;
}

const ShipmentCard = React.memo(function ShipmentCard({
  shipment,
  statusConfig = defaultStatusConfig,
  onViewDetails,
  onCancel,
  onUpdateStatus,
  onContactCustomer,
  renderExtraActions,
}: ShipmentCardProps) {
  const config = statusConfig[shipment.status];
  const date = useMemo(() => new Date(shipment.updatedAt), [shipment.updatedAt]);
  const estimatedDeliveryDate = useMemo(
    () => shipment.order.estimatedDeliveryDate ? new Date(shipment.order.estimatedDeliveryDate) : null,
    [shipment.order.estimatedDeliveryDate]
  );

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(shipment);
  }, [shipment, onViewDetails]);

  const handleCancelClick = useCallback(async () => {
    try {
      await onCancel?.(shipment);
      toast.success("Expédition annulée avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'annulation de l'expédition");
    }
  }, [shipment, onCancel]);

  const handleStatusClick = useCallback(async () => {
    const newStatus = shipment.status === "pending" ? "in_progress" : "delivered";
    try {
      await onUpdateStatus?.(shipment.id, newStatus);
      toast.success("Statut mis à jour avec succès");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  }, [shipment.id, shipment.status, onUpdateStatus]);

  const handleContactClick = useCallback(() => {
    onContactCustomer?.(shipment.customer.id);
  }, [shipment.customer.id, onContactCustomer]);

  const deliveryProgress = useMemo(() => {
    if (shipment.status === "delivered") return 100;
    if (shipment.status === "in_progress") return 50;
    return 10;
  }, [shipment.status]);

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-semibold text-primary">#{shipment.id}</span>
              <Badge variant={config.variant} className={`${config.color} py-1 px-3`}>
                <config.icon className="h-4 w-4 mr-1.5" />
                {config.label}
              </Badge>
              {shipment.isDelayed && (
                <Badge variant="destructive" className="py-1 px-3">
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Retard
                </Badge>
              )}
              {shipment.priorityLevel && (
                <Badge variant={priorityConfig[shipment.priorityLevel]}>
                  {shipment.priorityLevel === "high" ? "Haute" : 
                  shipment.priorityLevel === "normal" ? "Normale" : "Basse"} priorité
                </Badge>
              )}
            </div>
            {estimatedDeliveryDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Livraison prévue: {format(estimatedDeliveryDate, "PPP", { locale: fr })}</span>
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                aria-label={`Actions pour la livraison ${shipment.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="font-medium">Livraison #{shipment.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {shipment.store.name}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleViewDetails}>
                <Eye className="mr-2 h-4 w-4" />
                <span>Détails</span>
              </DropdownMenuItem>
              {shipment.status !== "delivered" && shipment.status !== "failed" && (
                <DropdownMenuItem onClick={handleStatusClick}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>
                    {shipment.status === "pending" 
                      ? "Commencer la livraison" 
                      : "Marquer comme livré"}
                  </span>
                </DropdownMenuItem>
              )}
              {shipment.status === "pending" && (
                <DropdownMenuItem 
                  onClick={handleCancelClick}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  <span>Annuler</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleContactClick}>
                <Phone className="mr-2 h-4 w-4" />
                <span>Contacter le client</span>
              </DropdownMenuItem>
              {renderExtraActions && renderExtraActions(shipment)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progression</span>
            <span>{deliveryProgress}%</span>
          </div>
          <Progress value={deliveryProgress} className="h-2" />
        </div>

        {/* Customer and Store */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium">Client</span>
            </div>
            <div className="text-sm">
              <p className="font-medium">{shipment.customer.name || "Non spécifié"}</p>
              <p className="text-muted-foreground">{shipment.customer.phoneNumber}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" />
              <span className="font-medium">Magasin</span>
            </div>
            <p className="text-sm font-medium">{shipment.store.name}</p>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">Adresse de livraison</span>
          </div>
          <div className="text-sm">
            <p className="line-clamp-2">{shipment.destinationAddress.formattedAddress || "Adresse non spécifiée"}</p>
            {shipment.destinationAddress.deliveryInstructions && (
              <p className="text-muted-foreground mt-1">
                <span className="font-medium">Instructions: </span>
                {shipment.destinationAddress.deliveryInstructions}
              </p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="font-medium">Articles ({shipment.items.length})</span>
          </div>
          <div className="text-sm">
            {shipment.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.product.name} ×{item.quantity}
                </span>
                <span className="font-medium">{item.price.toLocaleString()} GNF</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-muted-foreground">
            Mis à jour: {format(date, "PPpp", { locale: fr })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDetails}
              className="h-8"
            >
              <Eye className="h-4 w-4 mr-2" />
              Détails
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleContactClick}
              className="h-8"
            >
              <Phone className="h-4 w-4 mr-2" />
              Appeler
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

interface ShipmentListProps {
  shipments: ShipmentWithDetails[];
  totalPages: number;
  pagination: { page: number; perPage: number };
  setPagination: React.Dispatch<React.SetStateAction<{ page: number; perPage: number }>>;
  isLoading: boolean;
  userId: number;
  userRole: "store" | "admin" | "manager" | "driver";
  statusConfig?: Record<ShipmentStatus, ShipmentStatusConfig>;
  onViewDetails?: (shipment: ShipmentWithDetails) => void;
  renderEmptyState?: () => React.ReactNode;
  renderExtraActions?: (shipment: ShipmentWithDetails) => React.ReactNode;
}

export function ShipmentList({
  shipments,
  totalPages,
  pagination,
  setPagination,
  isLoading,
  userId,
  userRole,
  statusConfig = defaultStatusConfig,
  onViewDetails,
  renderEmptyState,
  renderExtraActions,
}: ShipmentListProps) {
  const { updateShipment } = useLogistics(userId, userRole);

  const handleCancel = useCallback(async (shipment: ShipmentWithDetails) => {
    try {
      await updateShipment({ 
        shipmentId: shipment.id, 
        status: "failed" 
      });
    } catch (error) {
      throw error;
    }
  }, [updateShipment]);

  const handleUpdateStatus = useCallback(async (shipmentId: number, newStatus: ShipmentStatus) => {
    try {
      await updateShipment({ 
        shipmentId: shipmentId, 
        status: newStatus 
      });
    } catch (error) {
      throw error;
    }
  }, [updateShipment]);

  const handleContactCustomer = useCallback((customerId: number) => {
    // Implémentez la logique de contact ici
    console.log("Contacter le client", customerId);
  }, []);

  const skeletonRows = useMemo(() => Array(pagination.perPage).fill(null), [pagination.perPage]);

  const handlePrevPage = useCallback(() => {
    if (pagination.page > 1) {
      setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  }, [pagination.page, setPagination]);

  const handleNextPage = useCallback(() => {
    if (pagination.page < totalPages) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  }, [pagination.page, totalPages, setPagination]);

  const defaultEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 rounded-lg border border-dashed">
      <Truck className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-1">Aucune livraison trouvée</h3>
      <p className="text-sm text-muted-foreground">Toutes vos livraisons sont à jour</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {skeletonRows.map((_, index) => (
              <Card key={`skeleton-${index}`} className="w-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-4 pt-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : shipments.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {shipments.map((shipment) => (
              <ShipmentCard
                key={`shipment-${shipment.id}`}
                shipment={shipment}
                statusConfig={statusConfig}
                onViewDetails={onViewDetails}
                onCancel={handleCancel}
                onUpdateStatus={handleUpdateStatus}
                onContactCustomer={handleContactCustomer}
                renderExtraActions={renderExtraActions}
              />
            ))}
          </div>
        ) : (
          (renderEmptyState || defaultEmptyState)()
        )}
      </div>

      {/* Pagination reste inchangée */}
      {shipments.length > 0 && (
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            Page <span className="font-medium">{pagination.page}</span> sur{" "}
            <span className="font-medium">{totalPages}</span> •{" "}
            <span className="font-medium">{shipments.length}</span> livraisons
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={pagination.page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={pagination.page === totalPages || isLoading}
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}