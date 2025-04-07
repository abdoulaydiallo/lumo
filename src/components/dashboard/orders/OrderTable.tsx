"use client";

import * as React from "react";
import { OrderFiltersBase, OrderPagination } from "@/lib/db/orders.search";
import { useOrders } from "@/features/orders/hooks/useOrders";
import { useLogistics } from "@/features/logistics/hooks/useLogistics";
import OrderStats from "./OrderStats";
import OrderFilters from "./OrderFilters";
import OrderList from "./OrderList";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import OrderAssignDialog from "./OrderAssignDialog";
import OrderCancelDialog from "./OrderCancelDialog";

interface SearchParams {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  userId?: string;
  storeId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  sort?: string;
  page?: string;
  perPage?: string;
}

interface OrderTableProps {
  searchParams: SearchParams;
  statusOptions: string[];
  paymentStatusOptions: string[];
  paymentMethodOptions: string[];
  initialOrders: any[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  initialStats: any;
  userId: number;
  userRole: "store" | "admin" | "manager";
}

export default function OrderTable({
  searchParams,
  statusOptions,
  paymentStatusOptions,
  paymentMethodOptions,
  initialOrders,
  initialPage,
  initialTotalPages,
  initialStats,
  userId,
  userRole,
}: OrderTableProps) {

  const initialFilters: OrderFiltersBase = {
    status: searchParams.status
      ?.split(",")
      .filter((s) => statusOptions.includes(s)) as OrderFiltersBase["status"],
    payment_status: searchParams.paymentStatus
      ?.split(",")
      .filter((s) =>
        paymentStatusOptions.includes(s)
      ) as OrderFiltersBase["payment_status"],
    payment_method:
      searchParams.paymentMethod
        ?.split(",")
        .filter((s): s is "orange_money" | "mobile_money" | "cash_on_delivery" =>
          paymentMethodOptions.includes(s)
        ) || undefined,
    date_range:
      searchParams.startDate && searchParams.endDate
        ? {
            start: new Date(searchParams.startDate),
            end: new Date(searchParams.endDate),
          }
        : undefined,
    min_amount: searchParams.searchTerm
      ? parseFloat(searchParams.searchTerm)
      : undefined,
    max_amount: undefined,
  };

  const initialPagination: OrderPagination = {
    page: parseInt(searchParams.page || String(initialPage), 10),
    per_page: parseInt(searchParams.perPage || "5", 10),
  };

  const [filters, setFilters] = React.useState<OrderFiltersBase>(initialFilters);
  const [pagination, setPagination] = React.useState<OrderPagination>(initialPagination);
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [orderToCancel, setOrderToCancel] = React.useState<any | null>(null);
  const [selectedDriver, setSelectedDriver] = React.useState("");

  const {
    orders = initialOrders,
    totalPages,
    stats = initialStats,
    isLoading,
    refetchWithParams,
    updateOrderStatus,
    cancelOrder,
    isCancelling,
  } = useOrders(userId, filters, pagination);

  const {
    shipments,
    drivers,
    isLoadingShipments,
    isLoadingDrivers,
    updateShipment,
    assignDriver,
    isAssigning,
  } = useLogistics( userId, userRole, selectedOrder?.storeOrderId);

  const handleFilterChange = (newFilters: {
    status: string;
    dateFrom: string;
    dateTo: string;
  }) => {
    const updatedFilters: OrderFiltersBase = {
      ...filters,
      status:
        newFilters.status && newFilters.status !== "all"
          ? ([newFilters.status] as OrderFiltersBase["status"])
          : undefined,
      date_range:
        newFilters.dateFrom && newFilters.dateTo
          ? {
              start: new Date(newFilters.dateFrom),
              end: new Date(newFilters.dateTo),
            }
          : undefined,
    };
    setFilters(updatedFilters);
    setPagination({ ...pagination, page: 1 });
    refetchWithParams(updatedFilters, {
      page: 1,
      per_page: pagination.per_page,
    });
  };

  const handleUpdateStatus = async (orderId: number, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "in_progress" : "delivered";
    updateOrderStatus({ orderId, status: newStatus });
    if (newStatus === "in_progress" || newStatus === "delivered") {
      const shipment = shipments?.find((s: any) => s.orderId === orderId);
      if (shipment) {
        await updateShipment({
          shipmentId: shipment.id,
          status: newStatus as "in_progress" | "delivered",
        });
      }
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    cancelOrder(orderId);
    setOrderToCancel(null);
    setIsCancelDialogOpen(false);
  };

  const handleAssignDriver = async (orderId: number) => {
    if (selectedDriver) {
      const shipment = shipments?.find((s: any) => s.orderId === orderId);
      if (shipment) {
        await assignDriver({
          shipmentId: shipment.id,
          driverId: parseInt(selectedDriver),
        });
      } else {
        // Fallback to orderAssignDriver if no shipment exists yet
        assignDriver({ shipmentId: shipment.id, driverId: parseInt(selectedDriver) });
      }
      setIsAssignDialogOpen(false);
      setSelectedDriver("");
    }
  };

  const handleContactClient = (userId: number) => {
    console.log(`Contacter le client avec l'ID ${userId}`);
  };


  return (
    <div className="px-2 py-4 md:px-4 md:py-6 space-y-4 min-h-screen">
      <OrderStats orders={orders} stats={stats} />
      <OrderFilters onFilterChange={handleFilterChange} />
      <OrderList
        orders={orders}
        totalPages={totalPages || initialTotalPages}
        pagination={pagination}
        setPagination={setPagination}
        isLoading={isLoading || isLoadingShipments}
        setSelectedOrder={setSelectedOrder}
        setIsDetailsDialogOpen={setIsDetailsDialogOpen}
        setIsAssignDialogOpen={setIsAssignDialogOpen}
        setOrderToCancel={setOrderToCancel}
        setIsCancelDialogOpen={setIsCancelDialogOpen}
        handleUpdateStatus={handleUpdateStatus}
        handleContactClient={handleContactClient}
      />
      <OrderDetailsDialog
        order={selectedOrder}
        isOpen={isDetailsDialogOpen}
        setIsOpen={setIsDetailsDialogOpen}
      />
      <OrderAssignDialog
        order={selectedOrder}
        isOpen={isAssignDialogOpen}
        setIsOpen={setIsAssignDialogOpen}
        selectedDriver={selectedDriver}
        setSelectedDriver={setSelectedDriver}
        handleAssignDriver={handleAssignDriver}
        isAssigningDriver={isAssigning}
        drivers={drivers}
        isLoadingDrivers={isLoadingDrivers}
      />
      <OrderCancelDialog
        order={orderToCancel}
        isOpen={isCancelDialogOpen}
        setIsOpen={setIsCancelDialogOpen}
        handleCancelOrder={handleCancelOrder}
        isCancelling={isCancelling}
      />
    </div>
  );
}