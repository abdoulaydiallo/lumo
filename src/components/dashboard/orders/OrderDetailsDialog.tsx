"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Printer,
  X,
  Truck,
  CreditCard,
  Edit,
  Trash2,
  MapPin,
  Package,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  User,
  Calendar,
  Clock,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  MessageCircle,
  Phone,
  Car,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion"; // Simplifié : retiré AnimatePresence
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OrderStatus } from "./OrderStatus";
import { Map } from "@/components/Map";
import { OrderStatus as OrderStatusType } from "@/lib/db/orders.search";
import { Duration } from "./Duration";
import { StoreOrderWithDetails } from "@/algorithms/storeOrders.search";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StepIndicator } from "@/components/StepIndicator";

interface OrderDetailsDialogProps {
  order: StoreOrderWithDetails | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onStatusChange?: (newStatus: OrderStatusType) => Promise<void>;
  onEdit?: () => void;
  onCancel?: () => Promise<void>;
}

const statusSteps = [
  { value: "pending", label: "En attente", icon: <Clock className="h-4 w-4" /> },
  { value: "in_progress", label: "En cours", icon: <Package className="h-4 w-4" /> },
  { value: "delivered", label: "Livré", icon: <CheckCircle2 className="h-4 w-4" /> },
  { value: "cancelled", label: "Annulé", icon: <X className="h-4 w-4" /> },
];

// Mémoïsation du composant principal
export const OrderDetailsDialog = React.memo(function OrderDetailsDialog({
  order,
  isOpen,
  setIsOpen,
  onStatusChange,
  onEdit,
  onCancel,
}: OrderDetailsDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "items" | "shipping" | "payment">("summary");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatDate = useCallback((date: Date | string | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "PP", { locale: fr });
  }, []);

  const formatDateTime = useCallback((date: Date | string | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "PPpp", { locale: fr });
  }, []);

  const copyToClipboard = useCallback((text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copié dans le presse-papiers`);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handlePrint = useCallback(() => {
    setIsPrinting(true);
    requestAnimationFrame(() => {
      window.print();
      setIsPrinting(false);
    });
  }, []);

  const handleStatusChange = useCallback(
    async (newStatus: OrderStatusType) => {
      if (!onStatusChange || !order) return;
      setIsProcessing(true);
      try {
        await onStatusChange(newStatus);
        toast.success(`Statut mis à jour: ${newStatus}`);
      } catch (error) {
        toast.error("Échec de la mise à jour du statut");
      } finally {
        setIsProcessing(false);
      }
    },
    [onStatusChange, order]
  );

  const handleCancel = useCallback(async () => {
    if (!onCancel) return;
    setIsProcessing(true);
    try {
      await onCancel();
      toast.success("Commande annulée avec succès");
      setIsOpen(false);
    } catch (error) {
      toast.error("Échec de l'annulation de la commande");
    } finally {
      setIsProcessing(false);
    }
  }, [onCancel, setIsOpen]);

  const currentStatusIndex = useMemo(() => {
    return statusSteps.findIndex((step) => step.value === order?.status.toLowerCase());
  }, [order?.status]);

  const storeOrder = order;

  const mapCenter = useMemo(() => {
    if (!storeOrder?.originAddress?.latitude || !storeOrder?.originAddress?.longitude) {
      return { lat: 9.6412, lng: -13.5784 }; // Default to Conakry
    }
    return {
      lat: storeOrder.originAddress.latitude,
      lng: storeOrder.originAddress.longitude,
    };
  }, [storeOrder]);

  const originLocation = useMemo(() => {
    if (!storeOrder?.originAddress?.latitude || !storeOrder?.originAddress?.longitude) return undefined;
    return {
      lat: storeOrder.originAddress.latitude,
      lng: storeOrder.originAddress.longitude,
      label: storeOrder.originAddress.recipient || "Origine",
    };
  }, [storeOrder]);

  const destinationLocation = useMemo(() => {
    if (!storeOrder?.destinationAddress?.latitude || !storeOrder?.destinationAddress?.longitude) return undefined;
    return {
      lat: storeOrder.destinationAddress.latitude,
      lng: storeOrder.destinationAddress.longitude,
      label: storeOrder.destinationAddress.recipient || "Destination",
    };
  }, [storeOrder]);

  const financialSummary = useMemo(() => {
    const subtotal = storeOrder?.items
      ? storeOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      : 0;
    const shippingCost = storeOrder?.deliveryFeeBreakdown?.baseFee || 0;
    const total = subtotal + shippingCost;
    return { subtotal, shippingCost, total };
  }, [storeOrder]);

  if (!order || !storeOrder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full max-w-xl max-h-[90vh] p-0 overflow-y-auto print:p-6 print:max-w-none print:max-h-none">
        {/* Bouton de fermeture */}
        <div className="relative print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* En-tête */}
        <DialogHeader className="px-4 pt-8 pb-2 border-b print:border-none">
          <DialogTitle className="text-lg font-semibold flex justify-between items-center">
            Commande #{order.id}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="print:hidden ml-2"
            >
              <Printer className={cn("h-4 w-4", isPrinting ? "animate-pulse" : "")} />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Détails de la commande #{order.id}
          </DialogDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            <OrderStatus status={order.status} />
            {storeOrder.payment && (
              <Badge
                variant="outline"
                className={cn(
                  storeOrder.payment.status === "paid"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                )}
              >
                {storeOrder.payment.status === "paid" ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {storeOrder.payment.status}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Corps */}
        <div className="p-4 space-y-4">
          {/* Progression avec StepIndicator */}
          <div className="flex flex-col items-center space-y-2">
            <div className="flex justify-between w-full">
              {statusSteps.map((step, index) => (
                <StepIndicator
                  key={step.value}
                  label={step.label}
                  active={index === currentStatusIndex}
                  completed={index < currentStatusIndex}
                  icon={step.icon}
                  onClick={onStatusChange ? () => handleStatusChange(step.value as OrderStatusType) : undefined}
                  ariaLabel={`${step.label} étape`}
                />
              ))}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg print:hidden">
              <TabsTrigger value="summary" className="py-1 text-xs">
                <CreditCard className="h-3 w-3 mr-1" />
                Résumé
              </TabsTrigger>
              <TabsTrigger value="items" className="py-1 text-xs">
                <ShoppingCart className="h-3 w-3 mr-1" />
                Articles
              </TabsTrigger>
              <TabsTrigger value="shipping" className="py-1 text-xs">
                <Truck className="h-3 w-3 mr-1" />
                Livraison
              </TabsTrigger>
              <TabsTrigger value="payment" className="py-1 text-xs">
                <DollarSign className="h-3 w-3 mr-1" />
                Paiement
              </TabsTrigger>
            </TabsList>

            {/* Simplification : suppression d'AnimatePresence */}
            <motion.div
              key={activeTab}
              initial={false} // Désactiver l'animation initiale
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }} // Réduire la durée
            >
              <TabsContent value="summary" className="mt-4">
                <div className="space-y-4">
                  {/* Client */}
                  <Card>
                    <CardHeader className="p-3">
                      <h3 className="text-sm font-semibold flex items-center gap-1">
                        <User className="h-4 w-4 text-primary" />
                        Client
                      </h3>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Nom</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{order.user.name || "N/A"}</span>
                          {order.user.name && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(order.user.name, "Nom")}
                            >
                              {copiedField === "Nom" ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Email</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{order.user.email || "N/A"}</span>
                          {order.user.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(order.user.email, "Email")}
                            >
                              {copiedField === "Email" ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Téléphone</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{order.user.phoneNumber || "N/A"}</span>
                          {order.user.phoneNumber && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(order.user.phoneNumber as string, "Téléphone")}
                            >
                              {copiedField === "Téléphone" ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dates */}
                  <Card>
                    <CardHeader className="p-3">
                      <h3 className="text-sm font-semibold flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-primary" />
                        Dates
                      </h3>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Création</span>
                        <span className="text-sm">{formatDate(order.createdAt)}</span>
                      </div>
                      {order.order.estimatedDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Livraison estimée</span>
                          <span className="text-sm">{formatDate(order.order.estimatedDeliveryDate)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Temps écoulé</span>
                        <span className="text-sm">
                          <Duration value={order.elapsedMinutes ?? 0} format="short" />
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Statut livraison</span>
                        <span className="text-sm flex items-center gap-1">
                          {order.isDelayed ? (
                            <>
                              <AlertTriangle className="h-3 w-3 text-yellow-600" />
                              En retard
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              Dans les temps
                            </>
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Adresses */}
                  <Card>
                    <CardHeader className="p-3">
                      <h3 className="text-sm font-semibold flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-primary" />
                        Adresses
                      </h3>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Origine</span>
                        <p className="text-sm">{storeOrder.originAddress?.formattedAddress || "N/A"}</p>
                        {storeOrder.originAddress?.deliveryInstructions && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {storeOrder.originAddress.deliveryInstructions}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Destination</span>
                        <p className="text-sm">{storeOrder.destinationAddress?.formattedAddress || "N/A"}</p>
                        {storeOrder.destinationAddress?.deliveryInstructions && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {storeOrder.destinationAddress.deliveryInstructions}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Financier */}
                  <Card>
                    <CardHeader className="p-3">
                      <h3 className="text-sm font-semibold flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Financier
                      </h3>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Sous-total</span>
                        <span className="text-sm">{financialSummary.subtotal.toLocaleString()} GNF</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Livraison</span>
                        <span className="text-sm">{financialSummary.shippingCost.toLocaleString()} GNF</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground font-semibold">Total</span>
                        <span className="text-sm font-semibold">{financialSummary.total.toLocaleString()} GNF</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Historique des statuts */}
                  {order.statusHistory && order.statusHistory.length > 0 && (
                    <Card>
                      <CardHeader className="p-3">
                        <h3 className="text-sm font-semibold flex items-center gap-1">
                          <Clock className="h-4 w-4 text-primary" />
                          Historique
                        </h3>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        {order.statusHistory.map((history, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="capitalize">{history.status.replace("_", " ")}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(history.changedAt, "PP", { locale: fr })}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="items" className="mt-4">
                {storeOrder.items.length > 0 ? (
                  <div className="space-y-4">
                    {storeOrder.items.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{item.product.name}</span>
                            <span className="text-sm">
                              {(item.price * item.quantity).toLocaleString()} GNF
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Qté: {item.quantity}</span>
                            <span>{item.price.toLocaleString()} GNF/unité</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <div className="flex justify-between text-sm">
                      <span>Total</span>
                      <span>{financialSummary.subtotal.toLocaleString()} GNF</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Aucun article</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="shipping" className="mt-4">
                <div className="space-y-4">
                  {/* Livreur */}
                  {order.driver && (
                    <Card>
                      <CardHeader className="p-3">
                        <h3 className="text-sm font-semibold flex items-center gap-1">
                          <Truck className="h-4 w-4 text-primary" />
                          Livreur
                        </h3>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Nom</span>
                          <span className="text-sm">{order.driver.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Téléphone</span>
                          <span className="text-sm">{order.driver.phoneNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Véhicule</span>
                          <span className="text-sm">{order.driver.vehicleType}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Carte */}
                  {originLocation && destinationLocation && (
                    <Card>
                      <CardHeader className="p-3">
                        <h3 className="text-sm font-semibold flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          Itinéraire
                        </h3>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="h-40 rounded-lg overflow-hidden">
                          <Map
                            center={mapCenter}
                            origin={originLocation}
                            destination={destinationLocation}
                            zoom={10}
                            className="h-full w-full"
                            showRoute={true}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="payment" className="mt-4">
                {storeOrder.payment ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="p-3">
                        <h3 className="text-sm font-semibold flex items-center gap-1">
                          <CreditCard className="h-4 w-4 text-primary" />
                          Paiement
                        </h3>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Méthode</span>
                          <span className="text-sm capitalize">{storeOrder.payment.paymentMethod.replace("_", " ")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Montant</span>
                          <span className="text-sm">{storeOrder.payment.amount.toLocaleString()} GNF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Statut</span>
                          <Badge variant={storeOrder.payment.status === "paid" ? "default" : "secondary"}>
                            {storeOrder.payment.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Date</span>
                          <span className="text-sm">{formatDate(storeOrder.payment.createdAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="p-3">
                        <h3 className="text-sm font-semibold flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-primary" />
                          Réconciliation
                        </h3>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Total</span>
                          <span className="text-sm">{financialSummary.total.toLocaleString()} GNF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Payé</span>
                          <span className="text-sm">{storeOrder.payment.amount.toLocaleString()} GNF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Reste</span>
                          <span
                            className={cn(
                              "text-sm",
                              financialSummary.total - storeOrder.payment.amount > 0 ? "text-red-600" : "text-green-600"
                            )}
                          >
                            {Math.abs(financialSummary.total - storeOrder.payment.amount).toLocaleString()} GNF
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CreditCard className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Aucun paiement</p>
                  </div>
                )}
              </TabsContent>
            </motion.div>
          </Tabs>
        </div>

        {/* Pied de page */}
        <DialogFooter className="p-4 border-t bg-muted/50 flex flex-col gap-2 print:hidden">
          {onCancel && order.status !== "cancelled" && (
            <Button variant="destructive" size="sm" onClick={handleCancel} disabled={isProcessing}>
              <Trash2 className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
          <div className="flex gap-2 justify-end">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} disabled={isProcessing}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
            <Button size="sm" onClick={() => setIsOpen(false)} disabled={isProcessing}>
              Fermer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});