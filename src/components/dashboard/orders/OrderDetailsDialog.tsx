"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Gauge,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { OrderStatus } from "./OrderStatus";
import { Map } from "@/components/Map";
import {
  OrderStatus as OrderStatusType,
  OrderWithDetails,
} from "@/lib/db/orders.search";
import { Duration } from "./Duration";

interface OrderDetailsDialogProps {
  order: OrderWithDetails | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onStatusChange?: (newStatus: OrderStatusType) => Promise<void>;
  onEdit?: () => void;
  onCancel?: () => Promise<void>;
}

const statusSteps = [
  { 
    value: "pending", 
    label: "En attente", 
    icon: <Clock className="h-4 w-4" /> 
  },
  { 
    value: "in_progress", 
    label: "En cours", 
    icon: <Package className="h-4 w-4" /> 
  },
  { 
    value: "delivered", 
    label: "Livré", 
    icon: <CheckCircle2 className="h-4 w-4" /> 
  },
  { 
    value: "cancelled", 
    label: "Annulé", 
    icon: <X className="h-4 w-4" /> 
  },
];

export function OrderDetailsDialog({
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

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return format(date, "PP", { locale: fr });
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return "N/A";
    return format(date, "PPpp", { locale: fr });
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copié dans le presse-papiers`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleStatusChange = async (newStatus: OrderStatusType) => {
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
  };

  const handleCancel = async () => {
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
  };

  const currentStatusIndex = useMemo(() => {
    return statusSteps.findIndex((step) => step.value === order?.status.toLowerCase());
  }, [order?.status]);

  const mapCenter = useMemo(() => {
    if (!order?.originAddress?.latitude || !order?.originAddress?.longitude) {
      return { lat: 9.6412, lng: -13.5784 }; // Default to Conakry
    }
    return {
      lat: parseFloat(order.originAddress.latitude),
      lng: parseFloat(order.originAddress.longitude),
    };
  }, [order]);

  const originLocation = useMemo(() => {
    if (!order?.originAddress?.latitude || !order?.originAddress?.longitude) return undefined;
    return {
      lat: parseFloat(order.originAddress.latitude),
      lng: parseFloat(order.originAddress.longitude),
      label: order.originAddress.recipient || "Origine",
    };
  }, [order]);

  const destinationLocation = useMemo(() => {
    if (!order?.destinationAddress?.latitude || !order?.destinationAddress?.longitude) return undefined;
    return {
      lat: parseFloat(order.destinationAddress.latitude),
      lng: parseFloat(order.destinationAddress.longitude),
      label: order.destinationAddress.recipient || "Destination",
    };
  }, [order]);

  const deliveryProgress = useMemo(() => {
    return (currentStatusIndex / (statusSteps.length - 1)) * 100;
  }, [currentStatusIndex]);

  const financialSummary = useMemo(() => {
    const subtotal = order?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
    const shippingCost = order?.totalDeliveryFee || 0;
    const total = subtotal + shippingCost;
    return { subtotal, shippingCost, total };
  }, [order]);

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto p-0 print:p-6 print:max-w-none print:max-h-none">
        <div className="relative print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <DialogHeader className="px-6 pt-6 pb-4 border-b print:border-none">
          <div className="flex justify-between items-start gap-4">
            <div>
              <DialogTitle className="text-lg md:text-xl font-semibold">
                Commande #{order.id}
              </DialogTitle>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <OrderStatus status={order.status} />
                {order.payment && (
                  <Badge
                    variant="outline"
                    className={cn(
                      order.payment.status === "paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    )}
                  >
                    {order.payment.status === "paid" ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {order.payment.status}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="print:hidden"
            >
              <Printer
                className={cn("h-4 w-4 mr-2", isPrinting ? "animate-pulse" : "")}
              />
              {isPrinting ? "Préparation..." : "Imprimer"}
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between mb-2 text-sm text-muted-foreground">
              {statusSteps.map((step, index) => (
                <div
                  key={step.value}
                  className={cn(
                    "text-center flex-1 flex flex-col items-center",
                    index <= currentStatusIndex ? "text-primary font-medium" : ""
                  )}
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center mb-1",
                      index <= currentStatusIndex ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    {step.icon}
                  </div>
                  <span className="whitespace-nowrap">{step.label}</span>
                </div>
              ))}
            </div>
            <Progress value={deliveryProgress} className="h-2" />
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="w-full grid grid-cols-4 print:hidden">
              <TabsTrigger value="summary">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Résumé</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="items">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Articles</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="shipping">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>Livraison</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="payment">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Paiement</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="summary" className="mt-6">
  <div className="space-y-6">
    {/* Carte Client */}
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        Informations client
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Nom</p>
            <div className="flex items-center justify-between">
              <p className="font-medium">{order.user.name || "Non spécifié"}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(order.user.name || "", "Nom")}
              >
                {copiedField === "Nom" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <div className="flex items-center justify-between">
              <p className="font-medium">{order.user.email || "Non spécifié"}</p>
              {order.user.email && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(order.user.email || "", "Email")}
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
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Téléphone</p>
            <div className="flex items-center justify-between">
              <p className="font-medium">{order.user.phoneNumber || "Non spécifié"}</p>
              {order.user.phoneNumber && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(order.user.phoneNumber, "Téléphone")}
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
        </div>
      </div>
    </div>

    {/* Carte Dates */}
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Dates importantes
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Date de création</p>
            <p className="font-medium">{formatDateTime(order.createdAt!)}</p>
          </div>
          {order.estimatedDeliveryDate && (
            <div>
              <p className="text-sm text-muted-foreground">Livraison estimée</p>
              <p className="font-medium">{formatDateTime(order.estimatedDeliveryDate)}</p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Temps écoulé</p>
            <p className="font-medium"><Duration value={order.elapsedMinutes as number} format="short" /></p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Statut livraison</p>
            <div className="flex items-center gap-2">
              {order.isDelayed ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-600">En retard</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">Dans les temps</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Carte Adresses */}
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        Adresses
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Origine</h4>
          <div className="p-3 bg-muted/10 rounded-lg">
            <p className="font-medium">{order.originAddress?.recipient || "Non spécifié"}</p>
            <p className="text-sm text-muted-foreground">
              {order.originAddress?.formattedAddress || "N/A"}
            </p>
            {order.originAddress?.deliveryInstructions && (
              <p className="text-xs text-gray-600 italic mt-2">
                <span className="font-medium">Instructions :</span> {order.originAddress.deliveryInstructions}
              </p>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Destination</h4>
          <div className="p-3 bg-muted/10 rounded-lg">
            <p className="font-medium">{order.destinationAddress?.recipient || "Non spécifié"}</p>
            <p className="text-sm text-muted-foreground">
              {order.destinationAddress?.formattedAddress || "N/A"}
            </p>
            {order.destinationAddress?.deliveryInstructions && (
              <p className="text-xs text-gray-600 italic mt-2">
                <span className="font-medium">Instructions :</span> {order.destinationAddress.deliveryInstructions}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Carte Paiement */}
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        Résumé financier
      </h3>
      <div className="flex flex-col gap-6">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total :</span>
            <span className="font-medium">{financialSummary.subtotal.toLocaleString()} GNF</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frais de livraison :</span>
            <span className="font-medium">{financialSummary.shippingCost.toLocaleString()} GNF</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground font-semibold">Total :</span>
            <span className="font-bold">{financialSummary.total.toLocaleString()} GNF</span>
          </div>
        </div>
        {order.payment && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Statut paiement :</span>
              <Badge
                variant={order.payment.status === "paid" ? "default" : "secondary"}
              >
                {order.payment.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Méthode :</span>
              <span className="font-medium capitalize">{order.payment.paymentMethod.replace('_', ' ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Carte Historique des statuts */}
    {order.statusHistory && order.statusHistory.length > 0 && (
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Historique des statuts
        </h3>
        <div className="space-y-4">
          {order.statusHistory.map((history, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex flex-col items-center pt-1">
                <div className={`h-2 w-2 rounded-full ${
                  index === 0 ? 'bg-primary' : 'bg-muted'
                }`} />
                {order.statusHistory && index < order.statusHistory.length - 1 && (
                  <div className="w-px h-8 bg-muted" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-medium capitalize">{history.status.replace('_', ' ')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(history.changedAt, "PP", { locale: fr })}
                  </p>
                </div>
                {history.changedBy && (
                  <p className="text-sm text-muted-foreground">
                    Par {history.changedBy.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Carte Ticket de support */}
    {order.supportTicket && (
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Ticket de support associé
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Numéro du ticket</p>
            <p className="font-medium">#{order.supportTicket.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Statut</p>
            <Badge variant={
              order.supportTicket.status === "resolved" ? "default" : 
              order.supportTicket.status === "pending" ? "secondary" : "destructive"
            }>
              {order.supportTicket.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
            <p className="font-medium">{format(order.supportTicket.lastUpdate, "PP", { locale: fr })}</p>
          </div>
        </div>
      </div>
    )}
  </div>
</TabsContent>

                <TabsContent value="items" className="mt-6">
                  {order.items.length > 0 ? (
                    <div>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Produit</TableHead>
                              <TableHead className="text-right">Qté</TableHead>
                              <TableHead className="text-right">Prix unitaire</TableHead>
                              <TableHead className="text-right">Stock</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.items.map((item) => (
                              <TableRow key={item.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">{item.product.name}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{item.price.toLocaleString()} GNF</TableCell>
                                <TableCell className="text-right">
                                  {item.product.currentStock !== undefined ? (
                                    <Badge variant={item.product.currentStock > 0 ? "default" : "destructive"}>
                                      {item.product.currentStock} en stock
                                    </Badge>
                                  ) : (
                                    "N/A"
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {(item.price * item.quantity).toLocaleString()} GNF
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total articles</p>
                          <p className="font-medium">{order.items.length}</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Quantité totale</p>
                          <p className="font-medium">
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Valeur totale</p>
                          <p className="font-medium">
                            {order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} GNF
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mb-4 text-muted-foreground/50" />
                      <p>Aucun article dans cette commande</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="shipping" className="mt-6">
                  <div className="space-y-6">
                    {order.driver && (
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                          <Truck className="h-5 w-5 text-primary" />
                          Informations du livreur
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              Livreur assigné
                            </h4>
                            <div className="space-y-2">
                              <p className="font-medium">{order.driver.name}</p>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{order.driver.phoneNumber}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span>{order.driver.vehicleType}</span>
                              </div>
                            </div>
                          </div>
                          {order.driver.currentLocation && (
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                Position actuelle
                              </h4>
                              <div className="space-y-1">
                                <p className="text-sm">
                                  {order.driver.currentLocation.lat.toFixed(6)}, {order.driver.currentLocation.lng.toFixed(6)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Dernière mise à jour: {format(new Date(), "PPpp", { locale: fr })}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="bg-white border rounded-lg p-6 shadow-sm">
                      <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Adresses de livraison
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            Origine
                          </h4>
                          <div className="text-sm space-y-1">
                            <p className="font-medium text-gray-900">
                              {order.originAddress?.recipient || "Non spécifié"}
                            </p>
                            <p className="text-muted-foreground">
                              {order.originAddress?.formattedAddress || "N/A"}
                            </p>
                            {order.originAddress?.deliveryInstructions && (
                              <p className="text-xs text-gray-600 italic">
                                Instructions : {order.originAddress.deliveryInstructions}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            Destination
                          </h4>
                          <div className="text-sm space-y-1">
                            <p className="font-medium text-gray-900">
                              {order.destinationAddress?.recipient || "Non spécifié"}
                            </p>
                            <p className="text-muted-foreground">
                              {order.destinationAddress?.formattedAddress || "N/A"}
                            </p>
                            {order.destinationAddress?.deliveryInstructions && (
                              <p className="text-xs text-gray-600 italic">
                                Instructions : {order.destinationAddress.deliveryInstructions}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg p-6 shadow-sm isolate">
                      <h4 className="font-medium text-sm text-muted-foreground mb-4 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Itinéraire de livraison
                      </h4>
                      {(originLocation && destinationLocation) ? (
                        <div className="rounded-lg border h-64">
                          <Map
                            center={mapCenter}
                            origin={originLocation}
                            destination={destinationLocation}
                            zoom={10}
                            className="h-full w-full"
                            showRoute={true}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border">
                          <p className="text-sm text-muted-foreground">
                            Itinéraire non disponible (coordonnées incomplètes)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="bg-white border rounded-lg p-6 shadow-sm">
                      <h4 className="font-medium text-sm text-muted-foreground mb-4 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        Détails de la livraison
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Frais</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {financialSummary.shippingCost.toLocaleString()} GNF
                          </p>
                          {order.deliveryFeeBreakdown && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              <p>Base: {order.deliveryFeeBreakdown.baseFee.toLocaleString()} GNF</p>
                              <p>Distance: {order.deliveryFeeBreakdown.distanceFee.toLocaleString()} GNF</p>
                              {order.deliveryFeeBreakdown.weightSurcharge && (
                                <p>Poids: {order.deliveryFeeBreakdown.weightSurcharge.toLocaleString()} GNF</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Date estimée</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {order.estimatedDeliveryDate ? formatDate(order.estimatedDeliveryDate) : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {order.originAddress?.region === order.destinationAddress?.region
                              ? "Locale"
                              : "Inter-régionale"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="mt-6">
  <div className="space-y-6">
    {/* Carte Détails du Paiement */}
    {order.payment ? (
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Détails du paiement
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Méthode de paiement</p>
              <p className="font-medium capitalize">{order.payment.paymentMethod.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <Badge
                variant={
                  order.payment.status === "paid" ? "default" :
                  order.payment.status === "pending" ? "secondary" : "destructive"
                }
                className="mt-1"
              >
                {order.payment.status === "paid" ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {order.payment.status}
              </Badge>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{formatDateTime(order.payment.createdAt)}</p>
            </div>
            {order.payment.transactionId && (
              <div>
                <p className="text-sm text-muted-foreground">ID de transaction</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-medium">{order.payment.transactionId}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(order.payment!.transactionId!, "ID Transaction")}
                  >
                    {copiedField === "ID Transaction" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : (
      <div className="bg-white border rounded-lg p-6 shadow-sm flex flex-col items-center justify-center">
        <CreditCard className="h-12 w-12 mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">Aucun paiement enregistré pour cette commande</p>
      </div>
    )}

    {/* Carte Réconciliation */}
    {order.payment && (
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Réconciliation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total commande :</span>
              <span className="font-medium">{financialSummary.total.toLocaleString()} GNF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant payé :</span>
              <span className="font-medium">{order.payment.amount.toLocaleString()} GNF</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reste à payer :</span>
              <span className={cn(
                "font-semibold",
                financialSummary.total - order.payment.amount > 0 ? "text-red-600" : "text-green-600"
              )}>
                {Math.abs(financialSummary.total - order.payment.amount).toLocaleString()} GNF
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e6e6e6"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={financialSummary.total - order.payment.amount > 0 ? "#ef4444" : "#10b981"}
                  strokeWidth="3"
                  strokeDasharray={`${(order.payment.amount / financialSummary.total) * 100}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-xs text-muted-foreground">Payé</span>
                <span className="font-bold">
                  {Math.round((order.payment.amount / financialSummary.total) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Carte Historique des Paiements */}
    {order.payment && (
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Historique des paiements
        </h3>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{formatDate(order.payment.createdAt)}</TableCell>
                <TableCell className="capitalize">{order.payment.paymentMethod.replace('_', ' ')}</TableCell>
                <TableCell>{order.payment.amount.toLocaleString()} GNF</TableCell>
                <TableCell>
                  <Badge variant={
                    order.payment.status === "paid" ? "default" :
                    order.payment.status === "pending" ? "secondary" : "destructive"
                  }>
                    {order.payment.status}
                  </Badge>
                </TableCell>
              </TableRow>
              {/* Ajoutez d'autres lignes si vous avez un historique plus complet */}
            </TableBody>
          </Table>
        </div>
      </div>
    )}

    {/* Carte Frais supplémentaires */}
    {order.deliveryFeeBreakdown && (
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Détail des frais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Frais de base</p>
            <p className="font-medium">{order.deliveryFeeBreakdown.baseFee.toLocaleString()} GNF</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Frais distance</p>
            <p className="font-medium">{order.deliveryFeeBreakdown.distanceFee.toLocaleString()} GNF</p>
          </div>
          {order.deliveryFeeBreakdown.weightSurcharge && (
            <div>
              <p className="text-sm text-muted-foreground">Supplément poids</p>
              <p className="font-medium">{order.deliveryFeeBreakdown.weightSurcharge.toLocaleString()} GNF</p>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
</TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex flex-row justify-between bg-muted/50 print:hidden">
          <div className="flex gap-2">
            {onCancel && order.status !== "cancelled" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Annuler la commande
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                disabled={isProcessing}
              >
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
}