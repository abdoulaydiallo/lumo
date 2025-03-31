"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface OrderCancelDialogProps {
  order: any | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  handleCancelOrder: (orderId: number) => void;
  isCancelling: boolean;
}

export default function OrderCancelDialog({
  order,
  isOpen,
  setIsOpen,
  handleCancelOrder,
  isCancelling,
}: OrderCancelDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[90vw] max-w-[300px] md:max-w-sm p-4">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">
            Confirmer annulation
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs md:text-sm">Annuler la commande #{order?.id} ?</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="text-xs md:text-sm"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => order && handleCancelOrder(order.id)}
            disabled={isCancelling}
            className="text-xs md:text-sm"
          >
            {isCancelling ? "Annulation..." : "Confirmer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
