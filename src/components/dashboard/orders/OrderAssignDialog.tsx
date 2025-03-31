"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderAssignDialogProps {
  order: any | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedDriver: string;
  setSelectedDriver: (driver: string) => void;
  handleAssignDriver: (orderId: number) => void;
  isAssigningDriver: boolean;
}

export default function OrderAssignDialog({
  order,
  isOpen,
  setIsOpen,
  selectedDriver,
  setSelectedDriver,
  handleAssignDriver,
  isAssigningDriver,
}: OrderAssignDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[90vw] max-w-[300px] md:max-w-sm p-4">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">
            Assigner chauffeur #{order?.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger className="text-xs md:text-sm">
              <SelectValue placeholder="Chauffeur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="text-xs md:text-sm">
                Chauffeur 1
              </SelectItem>
              <SelectItem value="2" className="text-xs md:text-sm">
                Chauffeur 2
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => order && handleAssignDriver(order.id)}
            disabled={!selectedDriver || isAssigningDriver}
            className="w-full bg-orange-500 hover:bg-orange-600 text-xs md:text-sm"
          >
            {isAssigningDriver ? "Assignation..." : "Confirmer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
