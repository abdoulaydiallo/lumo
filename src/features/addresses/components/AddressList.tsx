"use client";
import { useState } from "react";
import { useAddresses } from "@/features/addresses/hooks/useAddresses";
import { AddressDeleteDialog } from "./addressDeleteDialog";
import { AddressForm } from "./AddressForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Filter, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AddressListProps {
  userId: number;
}

export const AddressList = ({userId}:AddressListProps) => {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | "URBAIN" | "RURAL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { addresses, totalPages, isLoading, refetchWithParams, deleteAddress, createAddress } =
    useAddresses(userId, undefined, { page: currentPage, per_page: itemsPerPage });

  if (isLoading) return <div className="text-center text-gray-500">Chargement...</div>;

  const handleFilterAndSearch = () => {
    refetchWithParams(
      {
        recipient: searchTerm || undefined,
        region: filter === "URBAIN" ? "CONAKRY" : undefined,
      },
      { page: currentPage, per_page: itemsPerPage }
    );
  };

  const handleDelete = (id: number) => deleteAddress(id, { onSuccess: () => setDeleteId(null) });

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-bold">Mes Adresses</CardTitle>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleFilterAndSearch();
            }}
            className="w-64"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filtrer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setFilter("ALL"); handleFilterAndSearch(); }}>Toutes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFilter("URBAIN"); handleFilterAndSearch(); }}>Urbain</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFilter("RURAL"); handleFilterAndSearch(); }}>Rural</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ajouter une nouvelle adresse</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {addresses?.length ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Code postal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addresses.map((address) => (
                  <TableRow
                    key={address.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/addresses/${address.id}`)}
                  >
                    <TableCell className="font-medium">{address.recipient}</TableCell>
                    <TableCell>{address.formattedAddress}</TableCell>
                    <TableCell>{address.location.type}</TableCell>
                    <TableCell>{address.postalCode}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/addresses/${address.id}`);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(address.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationContent>
            </Pagination>
          </>
        ) : (
          <p className="text-center text-gray-500">Aucune adresse enregistrée.</p>
        )}
        {deleteId && (
          <AddressDeleteDialog
            addressId={deleteId}
            onClose={() => setDeleteId(null)}
            onDelete={handleDelete}
          />
        )}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Ajouter une nouvelle adresse</DialogTitle>
              <DialogDescription>
                Remplissez les informations ci-dessous pour ajouter une nouvelle adresse.
              </DialogDescription>
            </DialogHeader>
            <AddressForm userId={userId} createAddress={createAddress} onSuccess={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};