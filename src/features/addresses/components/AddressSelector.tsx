// @/features/addresses/components/AddressSelector.tsx
"use client";

import { useState } from "react";
import { Address } from "@/services/addresses.service";
import { useAddresses } from "../hooks/useAddresses";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Button } from "@/components/ui/button";
import { AddressDetails } from "./AddressDetails";
import { MapPin } from "lucide-react";

interface AddressSelectorProps {
  userId: number;
  onSelect: (address: Address) => void;
  className?: string;
}

export const AddressSelector = ({ onSelect, userId, className }: AddressSelectorProps) => {
  const { addresses, isLoading } = useAddresses(userId);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);

  const handleSelect = (address: Address) => {
    setSelectedAddress(address);
    setOpen(false);
    onSelect(address);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <div className="text-sm text-muted-foreground">Chargement des adresses...</div>
      </div>
    );
  }

  if (!addresses?.length) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <MapPin className="mx-auto h-6 w-6 mb-2" />
        <p>Aucune adresse enregistrée</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {selectedAddress ? (
        <div className="border rounded-lg p-4 bg-muted/50 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                {selectedAddress.recipient}
                <Badge variant="outline" className="text-xs">
                  {selectedAddress.location.type === 'URBAIN' ? 'Urbain' : 'Rural'}
                </Badge>
              </h3>
              <AddressDetails location={selectedAddress.location} />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setOpen(true)}
            >
              Changer
            </Button>
          </div>

          {selectedAddress.deliveryInstructions && (
            <div className="mt-3 text-xs bg-yellow-50 p-2 rounded">
              <span className="font-medium">Instructions de livraison: </span>
              {selectedAddress.deliveryInstructions}
            </div>
          )}
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between mb-4"
            >
              <span>Choisir une adresse</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 opacity-50"
              >
                <path d="m7 15 5 5 5-5" />
                <path d="m7 9 5-5 5 5" />
              </svg>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder="Rechercher une adresse..." />
              <CommandEmpty>Aucune adresse trouvée.</CommandEmpty>
              <CommandGroup className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {addresses.map((address) => (
                  <CommandItem
                    key={address.id}
                    value={`${address.recipient} ${address.location.type === 'URBAIN' 
                      ? `${address.location.commune} ${address.location.district}` 
                      : `${address.location.village} ${address.location.district}`}`}
                    onSelect={() => handleSelect(address)}
                    className="cursor-pointer"
                  >
                    <div className="w-full py-2">
                      <div className="font-medium flex items-center gap-2">
                        {address.recipient}
                        <Badge variant="outline" className="text-xs">
                          {address.location.type === 'URBAIN' ? 'Urbain' : 'Rural'}
                        </Badge>
                      </div>
                      <AddressDetails location={address.location} />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};