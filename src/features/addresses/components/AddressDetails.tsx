// @/components/address/AddressDetails.tsx
"use client";

import { RuralAddress, UrbanAddress } from "@/services/addresses.service";
import { MapPin, Home, Navigation, Landmark } from "lucide-react";

interface AddressDetailsProps {
  location: RuralAddress | UrbanAddress;
  className?: string;
}

export const AddressDetails = ({ location, className = "" }: AddressDetailsProps) => {
  if (location.type === 'URBAIN') {
    return (
      <div className={`text-sm space-y-1 ${className}`}>
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          <span>{location.commune}, {location.district}</span>
        </div>
        {location.street && (
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <span>{location.street}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>Repère: {location.landmark}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`text-sm space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span>{location.prefecture}, {location.subPrefecture}</span>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span>{location.village}, {location.district}</span>
      </div>
      <div className="flex items-center gap-2">
        <Navigation className="h-4 w-4 text-muted-foreground" />
        <span>Repère: {location.landmark}</span>
      </div>
    </div>
  );
};