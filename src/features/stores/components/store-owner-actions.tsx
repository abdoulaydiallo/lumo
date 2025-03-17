// @/features/stores/components/store-owner-actions.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteStore } from "../api/actions";

interface StoreOwnerActionsProps {
  storeId: number;
  storeName: string;
}

export default function StoreOwnerActions({
  storeId,
  storeName,
}: StoreOwnerActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteStore(storeId);
      setIsDeleteDialogOpen(false);
      router.push("/marketplace/stores");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      setError("Une erreur est survenue lors de la suppression.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            Actions <span className="ml-2">▼</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/marketplace/stores/${storeId}/edit`}>Modifier</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)}>
            Supprimer
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/marketplace/stores/${storeId}/products/new`}>
              Ajouter un produit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/marketplace/stores/${storeId}/categories/new`}>
              Ajouter un category
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/marketplace/stores/${storeId}/promotions/new`}>
              Ajouter une promotion
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Gérer les promotions</DropdownMenuItem>
          <DropdownMenuItem disabled>Statistiques</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la boutique</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {storeName} ? Cette action
              est irréversible.
              {error && <p className="text-destructive mt-2">{error}</p>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
