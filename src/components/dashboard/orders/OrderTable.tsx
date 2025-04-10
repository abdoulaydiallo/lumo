"use client";

import OrderStats from "../orders/OrderStats";
import { useStoreOrders } from "@/hooks/useStoreOrders";
import React from "react";
import { StoreOrderFilters, StoreOrderWithDetails } from "@/algorithms/storeOrders.search";
import OrderFilters from "../orders/OrderFilters";
import OrderList from "../orders/OrderList";
import { OrderDetailsDialog } from "../orders/OrderDetailsDialog";
import { SearchParams } from "@/app/sellers/orders/page";

interface StoreOrderTableProps {
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
  
export const StoreOrdersTable = ({
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
  }: StoreOrderTableProps) => {
    const initialFilters: StoreOrderFilters = {
        status: searchParams.status
          ?.split(",")
          .filter((s) => statusOptions.includes(s)) as StoreOrderFilters["status"],
        paymentStatus: searchParams.paymentStatus
          ?.split(",")
          .filter((s) =>
            paymentStatusOptions.includes(s)
          ) as StoreOrderFilters["paymentStatus"],
        paymentMethod:
          searchParams.paymentMethod
            ?.split(",")
            .filter((s): s is "orange_money" | "mobile_money" | "cash_on_delivery" =>
              paymentMethodOptions.includes(s)
            ) || undefined,
        dateRange:
          searchParams.startDate && searchParams.endDate
            ? {
                start: new Date(searchParams.startDate),
                end: new Date(searchParams.endDate),
              }
            : undefined,
        minAmount: searchParams.minAmount
          ? parseFloat(searchParams.minAmount)
          : undefined,
        maxAmount: undefined,
      };

        const initialPagination = {
          page: parseInt(searchParams.page || String(initialPage), 10),
          perPage: parseInt(searchParams.perPage || "5", 10),
        };

    const [filters, setFilters] = React.useState<StoreOrderFilters>(initialFilters);
    const [pagination, setPagination] = React.useState<any>(initialPagination);
    const [selectedOrder, setSelectedOrder] = React.useState<StoreOrderWithDetails | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
    const [orderToCancel, setOrderToCancel] = React.useState<any | null>(null);
    const [selectedDriver, setSelectedDriver] = React.useState("");

    const {
        storeOrders = initialOrders,
        totalPages,
        stats = initialStats,
        isLoading,
        refetchWithParams,
        updateStoreOrderStatus
    } = useStoreOrders(userId, filters, pagination);

    const handleFilterChange = (newFilters: {
        status: string;
        dateFrom: string;
        dateTo: string;
    }) => {
        const updatedFilters: StoreOrderFilters = {
        ...filters,
        status:
            newFilters.status && newFilters.status !== "all"
            ? ([newFilters.status] as StoreOrderFilters["status"])
            : undefined,
        dateRange:
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
        perPage: pagination.perPage,
        });
    };

    const handleUpdateStatus = (storeOrderId: number, currentStatus: string) => {
        const newStatus = currentStatus === "pending" ? "in_progress" : "delivered";
        updateStoreOrderStatus({ storeOrderId, status: newStatus });
    }

    const handleContactClient = () => {

    }

    return (
        <div className="px-2 py-4 md:px-4 md:py-6 space-y-4">
            <OrderStats orders={storeOrders} stats={stats} />
            <OrderFilters onFilterChange={handleFilterChange} />
            <OrderList
                orders={storeOrders}
                totalPages={totalPages || initialTotalPages}
                pagination={pagination}
                setPagination={setPagination}
                isLoading={isLoading}
                setSelectedOrder={setSelectedOrder}
                setIsDetailsDialogOpen={setIsDetailsDialogOpen}
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
        </div>
    )
}