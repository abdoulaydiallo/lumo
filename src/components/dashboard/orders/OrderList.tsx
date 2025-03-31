"use client";

import React from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Truck,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface OrderListProps {
  orders: any[];
  totalPages: number;
  pagination: { page: number; per_page: number };
  setPagination: React.Dispatch<
    React.SetStateAction<{ page: number; per_page: number }>
  >;
  isLoading: boolean;
  setSelectedOrder: (order: any) => void;
  setIsDetailsDialogOpen: (open: boolean) => void;
  setIsAssignDialogOpen: (open: boolean) => void;
  setOrderToCancel: (order: any) => void;
  setIsCancelDialogOpen: (open: boolean) => void;
  handleUpdateStatus: (orderId: number, currentStatus: string) => void;
  handleContactClient: (userId: number) => void;
}

const statusConfig: Record<
  string,
  { variant: "default" | "destructive" | "outline" | "secondary" | null | undefined; icon: React.ElementType; label: string }
> = {
  delivered: { variant: "default", icon: CheckCircle, label: "Livrée" },
  in_progress: { variant: "secondary", icon: Loader2, label: "En cours" },
  pending: { variant: "secondary", icon: Clock, label: "En attente" },
  cancelled: { variant: "destructive", icon: XCircle, label: "Annulée" },
};

export default function OrderList({
  orders,
  totalPages,
  pagination,
  setPagination,
  isLoading,
  setSelectedOrder,
  setIsDetailsDialogOpen,
  setIsAssignDialogOpen,
  setOrderToCancel,
  setIsCancelDialogOpen,
  handleUpdateStatus,
  handleContactClient,
}: OrderListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updatedAt", desc: true },
  ]);

  const columns: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-2 hover:bg-accent/50"
          >
            <span className="text-xs font-medium">ID</span>
            <ArrowUpDown className="h-3 w-3 ml-1" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-xs font-medium text-primary">
            #{row.getValue("id")}
          </div>
        ),
        size: 80,
      },
      {
        accessorKey: "user",
        header: "Client",
        cell: ({ row }) => {
          const user = row.getValue("user") as {
            name?: string;
            email?: string;
            userId: number;
          };
          return (
            <div className="flex flex-col">
              <span className="text-xs font-medium truncate max-w-[120px]">
                {user.name || user.email || `Client #${user.userId}`}
              </span>
              {user.email && (
                <span className="text-xs text-muted-foreground">
                  {user.email.substring(0, 3)}...{user.email.split("@")[1]}
                </span>
              )}
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-2 hover:bg-accent/50"
          >
            <span className="text-xs font-medium">Statut</span>
            <ArrowUpDown className="h-3 w-3 ml-1" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const config = statusConfig[status as keyof typeof statusConfig] || 
                        { variant: "secondary", icon: Clock, label: status };
          return (
            <Badge variant={config.variant} className="text-xs gap-1">
              <config.icon className="h-3 w-3" />
              {config.label}
            </Badge>
          );
        },
        size: 120,
      },
      {
        accessorFn: (row) => row.payment?.amount,
        id: "paymentAmount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-2 hover:bg-accent/50"
          >
            <span className="text-xs font-medium">Montant</span>
            <ArrowUpDown className="h-3 w-3 ml-1" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-xs font-medium">
            {(row.getValue("paymentAmount") as number)?.toLocaleString() || "0"} GNF
          </div>
        ),
        size: 100,
      },
      {
        accessorFn: (row) => row.payment?.paymentMethod,
        id: "paymentMethod",
        header: "Méthode",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.getValue("paymentMethod") || "N/A"}
          </Badge>
        ),
        size: 100,
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-2 hover:bg-accent/50"
          >
            <span className="text-xs font-medium">Date</span>
            <ArrowUpDown className="h-3 w-3 ml-1" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.getValue("updatedAt"));
          return (
            <div className="flex flex-col">
              <span className="text-xs">
                {date.toLocaleDateString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        },
        size: 120,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const order = row.original;
          const status = order.status as keyof typeof statusConfig;
          const config = statusConfig[status] || { variant: "secondary" };
          
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
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
                
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsDetailsDialogOpen(true);
                  }}
                  className="text-xs cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  <span>Détails</span>
                </DropdownMenuItem>
                
                {order.status === "pending" && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsAssignDialogOpen(true);
                    }}
                    className="text-xs cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5 mr-2" />
                    <span>Assigner</span>
                  </DropdownMenuItem>
                )}
                
                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <DropdownMenuItem
                    onClick={() => handleUpdateStatus(order.id, order.status)}
                    className="text-xs cursor-pointer"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-2" />
                    <span>
                      {order.status === "pending" ? "Commencer" : "Livrer"}
                    </span>
                  </DropdownMenuItem>
                )}
                
                {order.status === "pending" && (
                  <DropdownMenuItem
                    onClick={() => {
                      setOrderToCancel(order);
                      setIsCancelDialogOpen(true);
                    }}
                    className="text-xs cursor-pointer text-destructive"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-2" />
                    <span>Annuler</span>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem
                  onClick={() => handleContactClient(order.userId!)}
                  className="text-xs cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-2" />
                  <span>Contacter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 60,
      },
    ],
    [
      setSelectedOrder,
      setIsDetailsDialogOpen,
      setIsAssignDialogOpen,
      handleUpdateStatus,
      setOrderToCancel,
      setIsCancelDialogOpen,
      handleContactClient,
    ]
  );

  const table = useReactTable({
    data: orders,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.per_page,
      },
    },
  });

  const skeletonRows = React.useMemo(
    () => Array(pagination.per_page).fill(null),
    [pagination.per_page]
  );

  return (
    <div className="space-y-4">
      <ScrollArea className="rounded-md border">
        <Table className="min-w-[800px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id} 
                    className="px-3 py-2 h-10"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              skeletonRows.map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`}>
                  {columns.map((_, colIndex) => (
                    <TableCell 
                      key={`skeleton-cell-${rowIndex}-${colIndex}`}
                      className="px-3 py-2"
                    >
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className="px-3 py-2"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Aucune commande trouvée
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
        <div className="text-xs text-muted-foreground">
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
            size="sm"
            onClick={() =>
              pagination.page > 1 &&
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
            disabled={pagination.page === 1 || isLoading}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Précédent</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              pagination.page < totalPages &&
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
            disabled={pagination.page === totalPages || isLoading}
            className="gap-1"
          >
            <span className="sr-only sm:not-sr-only">Suivant</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}