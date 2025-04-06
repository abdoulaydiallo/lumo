// components/OrderSummary.tsx
'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddressDetails } from "@/features/addresses/components/AddressDetails";
import { RuralAddress, UrbanAddress } from "@/services/addresses.service";
import { DeliveryFeeEstimate } from "@/services/delivery.service";

interface OrderSummaryProps {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  distance?: number; 
  estimationResult?: DeliveryFeeEstimate[]; 
  selectedAddress?: {
    recipient: string;
    formattedAddress: string;
    region: string;
    location: UrbanAddress | RuralAddress;
  };
  paymentMethod?: string | null;
  isEstimating: boolean;
  isSubmitting?: boolean;
  isDisabled?: boolean;
  onSubmit?: () => void;
  className?: string;
  currency?: string;
}

export function OrderSummary({
  subtotal = 0,
  deliveryFee = 0,
  estimationResult,
  selectedAddress = undefined,
  paymentMethod = null,
  isEstimating = false,
  isSubmitting = false,
  isDisabled = false,
  onSubmit,
  className = "",
  discount,
  currency = "GNF",
}: OrderSummaryProps) {
  const total = Math.max(0, subtotal + deliveryFee - discount);

  return (
    <div className={`w-full rounded-xl shadow-sm border p-6 ${className}`}>
      <h3 className="font-bold text-lg text-center mb-6">Résumé de la commande</h3>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sous-total</span>
          <span>{subtotal.toLocaleString('fr-FR')} {currency}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600 text-sm">
            <span className="text-muted-foreground">Réduction</span>
            <span>- {discount.toLocaleString()} {currency}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Frais de livraison</span>
          {isEstimating ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <span>{deliveryFee.toLocaleString('fr-FR')} {currency}</span>
          )}
        </div>

        {/* Détails par vendeur */}
        {estimationResult && estimationResult.length > 0 && (
          <div className="text-sm text-muted-foreground space-y-2 mt-2">
            {estimationResult.map((est) => (
              <div key={est.storeId} className="space-y-1">
                
                <div className="flex justify-between">
                  <span>Délai estimé</span>
                  <span>{est.breakdown.estimatedDeliveryDays} jour(s)</span>
                </div>
                <div className="flex justify-between">
                  <span>Distance</span>
                  <span>{est.distance.toLocaleString()} km</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4 space-y-4">
          {selectedAddress && (
            <>
              <div className="flex justify-between text-sm">
                <span>Adresse de livraison</span>
              </div>
              <AddressDetails location={selectedAddress.location} />
            </>
          )}
        </div>

        {paymentMethod && (
          <div className="text-sm pt-2 border-t">
            <span className="text-muted-foreground block mb-1">Paiement</span>
            <span className="capitalize">{paymentMethod.replace("_", " ")}</span>
          </div>
        )}

        <div className="border-t pt-4 flex justify-between font-bold">
          <span>Total</span>
          {isEstimating ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span>{total.toLocaleString('fr-FR')} {currency}</span>
          )}
        </div>
      </div>

      {onSubmit && (
        <Button
          className="w-full"
          onClick={onSubmit}
          disabled={isDisabled || isSubmitting}
        >
          {isSubmitting ? "Validation..." : "Confirmer la commande"}
        </Button>
      )}

      <div className="mt-6 text-xs text-muted-foreground space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span>Transactions sécurisées</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Satisfait ou remboursé</span>
        </div>
      </div>
    </div>
  );
}