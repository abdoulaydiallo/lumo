// app/orders/OrderTable.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, CheckCircle, XCircle, ArrowUpDown, Eye } from "lucide-react";
import OrderFilters from "./OrderFilters";
import { Badge } from "@/components/shared/Badge";
import { Order } from "@/services/overview.service";
import { OrderFiltersTypes, OrderSortOption } from "@/lib/db/order.search.engine";

interface OrderTableProps {
  initialOrders: Order[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  statusOptions: string[];
  paymentStatusOptions: string[];
  paymentMethodOptions: string[];
  initialFilters?: Partial<any>;
  initialSort?: OrderSortOption;
}

export default function OrderTable({
  initialOrders,
  initialTotal,
  initialPage,
  initialTotalPages,
  statusOptions,
  paymentStatusOptions,
  paymentMethodOptions,
  initialFilters = {},
  initialSort = "newest",
}: OrderTableProps) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [assignOrderId, setAssignOrderId] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");

  const handleFilterChange = (newFilters: Partial<OrderFiltersTypes>) => {
    const params = new URLSearchParams();

    // Mise à jour des paramètres de filtrage
    if (newFilters.status) params.set("status", newFilters.status.join(","));
    if (newFilters.paymentStatus)
      params.set("paymentStatus", newFilters.paymentStatus.join(","));
    if (newFilters.paymentMethod)
      params.set("paymentMethod", newFilters.paymentMethod.join(","));
    if (newFilters.userId) params.set("userId", newFilters.userId.toString());
    if (newFilters.storeId)
      params.set("storeId", newFilters.storeId.toString());
    if (newFilters.driverId)
      params.set("driverId", newFilters.driverId.toString());
    if (newFilters.dateRange) {
      params.set("startDate", newFilters.dateRange.start.toISOString());
      params.set("endDate", newFilters.dateRange.end.toISOString());
    }
    if (newFilters.searchTerm) params.set("searchTerm", newFilters.searchTerm);

    // Réinitialiser la pagination lors d'un nouveau filtrage
    params.set("page", "1");

    router.push(`/orders?${params.toString()}`);
  };

  const handleSort = (field: keyof Order) => {
    const params = new URLSearchParams(window.location.search);
    params.set("sort", field);
    router.push(`/orders?${params.toString()}`);
  };

  const handleAssignDriver = async (orderId: number) => {
    if (selectedDriver) {
      try {
        // Simulation d'appel API
        console.log(`Assigning driver ${selectedDriver} to order ${orderId}`);

        // Mise à jour optimiste
        setOrders(
          orders.map((order) =>
            order.id === orderId ? { ...order, status: "in_progress" } : order
          )
        );

        setAssignOrderId(null);
        setSelectedDriver("");
      } catch (error) {
        console.error("Failed to assign driver:", error);
      }
    }
  };

  const handleUpdateStatus = async (orderId: number) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      const nextStatus =
        order.status === "pending" ? "in_progress" : "delivered";

      // Simulation d'appel API
      console.log(`Updating order ${orderId} to status ${nextStatus}`);

      // Mise à jour optimiste
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    router.push(`/orders?${params.toString()}`);
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Commandes</h1>

      <OrderFilters
        onFilterChange={handleFilterChange}
        statusOptions={statusOptions}
        paymentStatusOptions={paymentStatusOptions}
        paymentMethodOptions={paymentMethodOptions}
        initialFilters={initialFilters}
      />

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm md:text-base">
            Liste des commandes (Total: {total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs md:text-sm">
                  <Button variant="ghost" onClick={() => handleSort("id")}>
                    ID <ArrowUpDown className="h-4 w-4 ml-2" />
                  </Button>
                </TableHead>
                <TableHead className="text-xs md:text-sm">Client</TableHead>
                <TableHead className="text-xs md:text-sm">
                  <Button variant="ghost" onClick={() => handleSort("status")}>
                    Statut <ArrowUpDown className="h-4 w-4 ml-2" />
                  </Button>
                </TableHead>
                <TableHead className="text-xs md:text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-xs md:text-sm">
                    #{order.id}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    Client #{order.userId}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge
                      variant={
                        order.status === "delivered"
                          ? "success"
                          : order.status === "pending"
                          ? "secondary"
                          : "warning"
                      }
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" /> Détails
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Commande #{order.id}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            <p>
                              <strong>Statut:</strong> {order.status}
                            </p>
                            <p>
                              <strong>Client:</strong> {order.userId}
                            </p>
                            <p>
                              <strong>Créée le:</strong>{" "}
                              {order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {order.status === "pending" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAssignOrderId(order.id)}
                            >
                              <Truck className="h-4 w-4 mr-2" /> Assigner
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Assigner un chauffeur</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Select
                                value={selectedDriver}
                                onValueChange={setSelectedDriver}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un chauffeur" />
                                </SelectTrigger>
                                <SelectContent>
                                  {/* Liste des chauffeurs disponibles */}
                                  <SelectItem value="1">Chauffeur 1</SelectItem>
                                  <SelectItem value="2">Chauffeur 2</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => handleAssignDriver(order.id)}
                                disabled={!selectedDriver}
                              >
                                Confirmer
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {order.status !== "delivered" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {order.status === "pending" ? "Commencer" : "Livrer"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
