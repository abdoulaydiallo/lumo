"use client";

import React, { useCallback, useMemo } from "react";
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StoreOrderWithDetails } from "@/algorithms/storeOrders.search";
import { Badge } from "@/components/shared/Badge";

interface OrderListProps {
  orders: StoreOrderWithDetails[];
  totalPages: number;
  pagination: { page: number; perPage: number };
  setPagination: React.Dispatch<
    React.SetStateAction<{ page: number; perPage: number }>
  >;
  isLoading: boolean;
  setSelectedOrder: (order: StoreOrderWithDetails) => void;
  setIsDetailsDialogOpen: (open: boolean) => void;
  setOrderToCancel: (order: StoreOrderWithDetails) => void;
  setIsCancelDialogOpen: (open: boolean) => void;
  handleUpdateStatus: (storeOrderId: number, currentStatus: string) => void;
  handleContactClient: (userId: number) => void;
}

const statusConfig = {
  delivered: { variant: "success" as const, icon: CheckCircle, label: "Livrée" },
  in_progress: { variant: "secondary" as const, icon: Loader2, label: "En cours" },
  pending: { variant: "secondary" as const, icon: Clock, label: "En attente" },
  cancelled: { variant: "warning" as const, icon: XCircle, label: "Annulée" },
};

const OrderCard = React.memo(
  ({
    order,
    setSelectedOrder,
    setIsDetailsDialogOpen,
    setOrderToCancel,
    setIsCancelDialogOpen,
    handleUpdateStatus,
    handleContactClient,
  }: {
    order: StoreOrderWithDetails;
    setSelectedOrder: (order: StoreOrderWithDetails) => void;
    setIsDetailsDialogOpen: (open: boolean) => void;
    setOrderToCancel: (order: StoreOrderWithDetails) => void;
    setIsCancelDialogOpen: (open: boolean) => void;
    handleUpdateStatus: (storeOrderId: number, currentStatus: string) => void;
    handleContactClient: (userId: number) => void;
  }) => {
    const status = order.status as keyof typeof statusConfig;
    const config = statusConfig[status] || { variant: "secondary" as const, icon: Clock, label: status };
    const date = useMemo(() => new Date(order.updatedAt), [order.updatedAt]);

    const handleViewDetails = useCallback(() => {
      setSelectedOrder(order);
      setIsDetailsDialogOpen(true);
    }, [order, setSelectedOrder, setIsDetailsDialogOpen]);

    const handleCancelClick = useCallback(() => {
      setOrderToCancel(order);
      setIsCancelDialogOpen(true);
    }, [order, setOrderToCancel, setIsCancelDialogOpen]);

    const handleStatusClick = useCallback(() => {
      handleUpdateStatus(order.id, order.status);
    }, [order.id, order.status, handleUpdateStatus]);

    const handleContactClick = useCallback(() => {
      handleContactClient(order.order.userId);
    }, [order.order.userId, handleContactClient]);

    return (
      <Card className="w-full">
        <CardHeader className="p-3 flex flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">#{order.id}</span>
            <Badge variant={config.variant} className="text-xs gap-1">
              <config.icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent/50"
                aria-label={`Actions pour commande #${order.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs font-medium">
                Commande #{order.id}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleViewDetails} className="text-xs cursor-pointer">
                <Eye className="h-3.5 w-3.5 mr-2" />
                Détails
              </DropdownMenuItem>
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <DropdownMenuItem onClick={handleStatusClick} className="text-xs cursor-pointer">
                  <CheckCircle className="h-3.5 w-3.5 mr-2" />
                  {order.status === "pending" ? "Commencer" : "Livrer"}
                </DropdownMenuItem>
              )}
              {order.status === "pending" && (
                <DropdownMenuItem onClick={handleCancelClick} className="text-xs cursor-pointer text-destructive">
                  <XCircle className="h-3.5 w-3.5 mr-2" />
                  Annuler
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleContactClick} className="text-xs cursor-pointer">
                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                Contacter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate max-w-[150px]">
                {order.user?.name || order.user?.email || `Client #${order.order.userId}`}
              </span>
              <span className="font-medium">{order.payment?.amount?.toLocaleString() ?? "0"} GNF</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{order.payment?.paymentMethod || "N/A"}</span>
              <span>
                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

OrderCard.displayName = "OrderCard";

export default function OrderList({
  orders,
  totalPages,
  pagination,
  setPagination,
  isLoading,
  setSelectedOrder,
  setIsDetailsDialogOpen,
  setOrderToCancel,
  setIsCancelDialogOpen,
  handleUpdateStatus,
  handleContactClient,
}: OrderListProps) {
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

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {isLoading ? (
          skeletonRows.map((_, index) => (
            <Card key={`skeleton-${index}`} className="w-full">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-32 mt-2" />
                <Skeleton className="h-4 w-24 mt-1" />
              </CardContent>
            </Card>
          ))
        ) : orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard
              key={`order-${order.id}`}
              order={order}
              setSelectedOrder={setSelectedOrder}
              setIsDetailsDialogOpen={setIsDetailsDialogOpen}
              setOrderToCancel={setOrderToCancel}
              setIsCancelDialogOpen={setIsCancelDialogOpen}
              handleUpdateStatus={handleUpdateStatus}
              handleContactClient={handleContactClient}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Aucune commande trouvée</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 px-1">
        <div className="text-xs text-muted-foreground text-center">
          {orders.length > 0 ? (
            <>
              Page <span className="font-medium">{pagination.page}</span> sur{" "}
              <span className="font-medium">{totalPages}</span> •{" "}
              <span className="font-medium">{orders.length}</span> commandes
            </>
          ) : (
            "Aucune commande"
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevPage}
            disabled={pagination.page === 1 || isLoading}
            aria-label="Page précédente"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextPage}
            disabled={pagination.page === totalPages || isLoading}
            aria-label="Page suivante"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}