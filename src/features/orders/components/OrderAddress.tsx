"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Address } from "@/services/addresses.service";
import { AddressForm } from "@/features/addresses/components/AddressForm";
import { useAddresses } from "@/features/addresses/hooks/useAddresses";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddressSelector } from "@/features/addresses/components/AddressSelector";

interface OrderAddressProps {
  userId: number;
  onSelect: (address: Address) => void;
}

export function OrderAddress({ onSelect, userId }: OrderAddressProps) {
  const { isLoading, addresses, createAddress } = useAddresses(userId);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddressCreated = () => {
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <h2 className="text-xl font-semibold">
          Adresse de livraison
          {addresses && <Badge variant="outline" className="ml-2">{addresses.length} adresse{addresses.length > 1 ? 's' : ''}</Badge>}
        </h2>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une nouvelle adresse
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Nouvelle adresse</DialogTitle>
            </DialogHeader>
            <AddressForm 
              userId={userId} 
              createAddress={createAddress}
              onSuccess={handleAddressCreated}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement des adresses...
        </div>
      ) : (
        <div className="rounded-md border p-4 space-y-4">
          <AddressSelector 
            userId={userId} 
            onSelect={onSelect} // On passe directement onSelect au AddressSelector
          />
        </div>
      )}
    </div>
  );
}