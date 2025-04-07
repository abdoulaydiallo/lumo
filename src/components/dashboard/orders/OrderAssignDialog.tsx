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
import { Loader2 } from "lucide-react";
import { OrderDetails } from "@/lib/db/orders.search";

interface OrderAssignDialogProps {
  order: OrderDetails | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedDriver: string;
  setSelectedDriver: (driver: string) => void;
  handleAssignDriver: (orderId: number) => void;
  isAssigningDriver: boolean;
  drivers: any[]; // Adjust type based on your driver data structure
  isLoadingDrivers: boolean;
}

export default function OrderAssignDialog({
  order,
  isOpen,
  setIsOpen,
  selectedDriver,
  setSelectedDriver,
  handleAssignDriver,
  isAssigningDriver,
  drivers,
  isLoadingDrivers,
}: OrderAssignDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[90vw] max-w-[300px] md:max-w-sm p-4">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">
            Assigner un chauffeur à la commande #{order?.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            value={selectedDriver}
            onValueChange={setSelectedDriver}
            disabled={isLoadingDrivers || isAssigningDriver}
          >
            <SelectTrigger className="text-xs md:text-sm">
              <SelectValue placeholder="Chauffeur" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingDrivers ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-xs">Chargement...</span>
                </div>
              ) : drivers && drivers.length > 0 ? (
                drivers.map((driver) => (
                  <SelectItem
                    key={driver.id}
                    value={driver.id.toString()}
                    className="text-xs md:text-sm"
                  >
                    {driver.name || `Chauffeur #${driver.id}`} {driver.isAvailable ? "(Disponible)" : "(Occupé)"}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-xs text-muted-foreground">
                  Aucun chauffeur disponible
                </div>
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={() => order && handleAssignDriver(order?.storeOrders[0].id)}
            disabled={!selectedDriver || isAssigningDriver || isLoadingDrivers}
            className="w-full bg-orange-500 hover:bg-orange-600 text-xs md:text-sm"
          >
            {isAssigningDriver ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Assignation...
              </>
            ) : (
              "Confirmer"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}