// @/features/products/components/product-owner-actions.tsx
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

interface ProductOwnerActionsProps {
  productId: number;
  storeId: number;
  productName: string;
}

export default function ProductOwnerActions({
  productId,
  storeId,
  productName,
}: ProductOwnerActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setIsDeleteDialogOpen(false);
      router.refresh(); // Rafraîchir la page pour mettre à jour la liste
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      setError(
       "Une erreur est survenue lors de la suppression."
      );
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
            <Link
              href={`/marketplace/stores/${storeId}/products/${productId}/edit`}
            >
              Modifier
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/marketplace/stores/${storeId}/products`}>
              Gerer vos produits
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le produit</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{productName}&quot; ? Cette action
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
