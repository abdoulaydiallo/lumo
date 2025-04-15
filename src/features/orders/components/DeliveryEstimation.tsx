'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertTriangle } from "lucide-react";
import { DeliveryFeeEstimate } from "@/services/delivery.service";
import { DeliveryOption } from "@/features/delivery/hooks/useDeliveryEstimation";

interface DeliveryEstimationProps {
  isEstimating: boolean;
  estimation: DeliveryFeeEstimate[] | undefined;
  estimationError: Error | null;
  deliveryOptions?: DeliveryOption[];
  isFetchingOptions: boolean;
}

export function DeliveryEstimation({
  isEstimating,
  estimation,
  estimationError,
  isFetchingOptions,
}: DeliveryEstimationProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          Estimation des frais de livraison
          {isEstimating && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEstimating ? (
          <div className="text-center text-muted-foreground">
            <p>Calcul en cours...</p>
          </div>
        ) : estimation && estimation.length > 0 ? (
          <div className="space-y-4">
            {estimation.map((est) => (
              <div key={est.storeId} className="space-y-2">
                <div className="flex justify-between font-medium">
                  <span>Vendeur {est.storeId}</span>
                  {est.breakdown.base === 10000 &&
                  est.breakdown.weightSurcharge === 0 &&
                  est.breakdown.distanceSurcharge === 0 ? (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Estimation par défaut
                    </Badge>
                  ) : null}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais de base</span>
                    <span>{(est.breakdown.minFee ?? est.breakdown.base).toLocaleString('fr-FR')} GNF</span>
                  </div>
                  {est.breakdown.weightSurcharge ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Surcharge poids</span>
                      <span>{est.breakdown.weightSurcharge.toLocaleString('fr-FR')} GNF</span>
                    </div>
                  ) : null}
                  {est.breakdown.distanceSurcharge ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Surcharge distance</span>
                      <span>{est.breakdown.distanceSurcharge.toLocaleString('fr-FR')} GNF</span>
                    </div>
                  ) : null}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Frais Final</span>
                    <span>{est.breakdown.finalFee.toLocaleString('fr-FR')} GNF</span>
                  </div>
                  <div className="text-muted-foreground space-y-1">
                    <div>
                      Type : <Badge variant="secondary">{est.breakdown.deliveryType}</Badge>
                    </div>
                    <div>
                      Vehicule : <Badge variant="secondary">{est.vehicleType}</Badge>
                    </div>
                    <div>
                      Délai : <span className="font-medium">{est.breakdown.estimatedDeliveryDays} jour(s)</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : estimationError ? (
          <div className="text-center text-destructive space-y-2">
            <AlertTriangle className="h-6 w-6 mx-auto" />
            <p>Erreur lors de l'estimation</p>
            <p className="text-sm">{estimationError.message}</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p>Aucune estimation disponible</p>
          </div>
        )}
        {isFetchingOptions && (
          <div className="text-center text-muted-foreground mt-4">
            <p>Récupération des options en cours...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}