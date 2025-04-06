"use client";

import { Button } from "@/components/ui/button";
import { validPaymentMethods } from "../api/types";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Check } from "lucide-react";
import Image from "next/image";
import { PaymentMethod } from "@/lib/db/orders.search";

const paymentMethodLogos = {
  orange_money: "/payments/orange-money.png",
  mobile_money: "/payments/momo.png",
  cash_on_delivery: "/payments/wallet.png",
};

interface OrderPaymentProps {
  onSelect: (paymentMethod: PaymentMethod) => void;
}

export function OrderPayment({ onSelect }: OrderPaymentProps) {
  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    onSelect(method);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Méthode de paiement</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez comment vous souhaitez payer votre commande
        </p>
      </div>

      {/* Sélection de la méthode de paiement */}
      <div className="space-y-4">
        <h3 className="font-medium">Options disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {validPaymentMethods.map((method) => (
            <button
              key={method}
              onClick={() => handlePaymentMethodSelect(method)}
              className="border rounded-lg p-4 flex flex-col items-center gap-2 transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="relative w-12 h-8">
                <Image
                  src={paymentMethodLogos[method]}
                  alt={method}
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-sm capitalize">
                {method.replace(/_/g, " ")}
              </span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Check className="h-3 w-3" /> Sélectionner
              </Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}