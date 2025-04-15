'use client';
import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AddressForm } from "@/features/addresses/components/AddressForm";
import { AddressData } from "@/services/addresses.service";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Address {
  id: number;
  recipient?: string;
  formattedAddress: string;
  region: string;
  isDefault?: boolean;
}

interface AddressSelectorProps {
  addresses: Address[];
  selectedAddressId?: number;
  onSelect: (addressId: number) => void;
  onAddressCreated: (data: AddressData) => void;
  userId: number;
}

export function AddressSelector({
  addresses,
  selectedAddressId,
  onSelect,
  onAddressCreated,
  userId
}: AddressSelectorProps) {
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  
  const handleSuccess = (data: AddressData) => {
    onAddressCreated(data);
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sélectionner une adresse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {addresses.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="mb-4">Aucune adresse enregistrée</p>
            <Button onClick={() => setOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter une adresse
            </Button>
          </div>
        ) : (
          <>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedAddress
                    ? `${selectedAddress.formattedAddress} ${selectedAddress.isDefault ? '(Par défaut)' : ''}`
                    : "Sélectionner une adresse..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Rechercher une adresse..." />
                  <CommandEmpty>Aucune adresse trouvée.</CommandEmpty>
                  <CommandGroup>
                    {addresses.map((address) => (
                      <CommandItem
                        key={address.id}
                        value={address.id.toString()}
                        onSelect={() => {
                          onSelect(Number(address.id));
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedAddressId === address.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span>{address.formattedAddress}</span>
                            {address.isDefault && (
                              <Badge variant="secondary" className="ml-2">Par défaut</Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">{address.region}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nouvelle adresse
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl overflow-y-scroll">
                <DialogHeader>
                  <DialogTitle>Ajouter une adresse</DialogTitle>
                </DialogHeader>
                <AddressForm userId={userId} createAddress={handleSuccess} onSuccess={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}