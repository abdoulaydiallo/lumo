"use client"
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddressData } from "@/services/addresses.service";
import { useAddresses } from "../hooks/useAddresses";

interface AddressSelectorProps {
  userId: number;
  onSelect: (address: AddressData) => void;
}

export const AddressSelector = ({ onSelect, userId }: AddressSelectorProps) => {
  const { addresses, isLoading } = useAddresses(userId);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null
  );

  if (isLoading) return <div className="text-gray-500">Chargement...</div>;

  const handleChange = (value: string) => {
    const addressId = parseInt(value);
    const selected = addresses?.find((addr) => addr.id === addressId);
    if (selected) {
      setSelectedAddressId(addressId);
      onSelect(selected);
    }
  };

  return (
    <Select
      value={selectedAddressId?.toString() || ""}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Sélectionnez une adresse" />
      </SelectTrigger>
      <SelectContent>
        {addresses?.map((address) => (
          <SelectItem key={address.id} value={address.id.toString()}>
             {address.formattedAddress}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
