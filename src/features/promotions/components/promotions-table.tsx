// @/features/promotions/components/promotions-table.tsx (inchangé, juste pour vérification)
"use client";

import { useState } from "react";
import { usePromotions, useDeletePromotion } from "@/features/promotions/hooks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Promotion {
  id: number;
  code: string | null;
  discountPercentage: number;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date | null;
  isExpired: boolean;
}

interface PromotionsTableProps {
  storeId: number;
  initialPromotions?: Promotion[];
  initialTotal?: number;
}

export default function PromotionsTable({
  storeId,
  initialPromotions = [],
  initialTotal = 0,
}: PromotionsTableProps) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<
    "active" | "inactive" | "expired" | "all"
  >("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const limit = 10;

  const { data, isLoading } = usePromotions(storeId, page, filter, limit, {
    promotions: initialPromotions,
    total: initialTotal,
  });

  const deleteMutation = useDeletePromotion(storeId);

  const promotions = data?.promotions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleFilterChange = (
    status: "active" | "inactive" | "expired" | "all"
  ) => {
    setFilter(status);
    setPage(1);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expirée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Chargement...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Réduction (%)</TableHead>
              <TableHead>Date de début</TableHead>
              <TableHead>Date de fin</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((promo: Promotion) => {
              const now = new Date();
              const isActive =
                (!promo.startDate || new Date(promo.startDate) <= now) &&
                (!promo.endDate || new Date(promo.endDate) >= now) &&
                !promo.isExpired;

              return (
                <TableRow key={promo.id}>
                  <TableCell className="font-medium">{promo.code}</TableCell>
                  <TableCell>{promo.discountPercentage}%</TableCell>
                  <TableCell>
                    {promo.startDate
                      ? new Date(promo.startDate).toLocaleDateString("fr-FR")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {promo.endDate
                      ? new Date(promo.endDate).toLocaleDateString("fr-FR")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        promo.isExpired
                          ? "destructive"
                          : isActive
                          ? "default"
                          : "secondary"
                      }
                    >
                      {promo.isExpired
                        ? "Expirée"
                        : isActive
                        ? "Active"
                        : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {promo?.createdAt &&
                      new Date(promo.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={deleteMutation.isPending}
                        >
                          <span className="sr-only">Ouvrir le menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/marketplace/stores/${storeId}/promotions/${promo.id}/edit`}
                          >
                            Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(promo.id)}>
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => page > 1 && handlePageChange(page - 1)}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  onClick={() => handlePageChange(i + 1)}
                  isActive={page === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => page < totalPages && handlePageChange(page + 1)}
                className={
                  page === totalPages ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer cette promotion ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
