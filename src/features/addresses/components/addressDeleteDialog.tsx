"use client";

import { useAddresses } from "@/features/addresses/hooks/useAddresses";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";

interface AddressDeleteDialogProps {
  addressId: number;
  onClose: () => void;
  onDelete?: (id: number) => void;
}

export const AddressDeleteDialog = ({
  addressId,
  onClose,
  onDelete,
}: AddressDeleteDialogProps) => {
  const userId = 15; // À dynamiser
  const { deleteAddress, isDeleting } = useAddresses(userId);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(() => {
      deleteAddress(addressId, {
        onSuccess: () => {
          if (onDelete) onDelete(addressId);
        },
        onError: (error: Error) => {
          console.error("Erreur de suppression:", error.message);
        },
      });
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer cette adresse ? Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending || isDeleting}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || isDeleting}
          >
            {isPending || isDeleting ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};