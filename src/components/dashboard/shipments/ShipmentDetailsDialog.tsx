"use client";

import React, { useState, useMemo } from "react";
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
  Trash2,
  MapPin,
  Package,
  CheckCircle,
  Copy,
  Check,
  User,
  Calendar,
  ShoppingCart,
  MessageCircle,
  Car,
  AlertTriangle,
  PackageCheck,
  PackageX,
  PackageSearch,
  Store,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Map } from "@/components/Map";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShipmentStatus } from "@/algorithms/shipments.search";
import { useLogistics } from "@/features/logistics/hooks/useLogistics";

interface ShipmentDetailsDialogProps {
  shipment: any;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userId: number;
  userRole: "store" | "driver" | "admin" | "manager";
}

const statusConfig = {
  pending: {
    label: "En attente",
    icon: <PackageSearch className="h-4 w-4" />,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  },
  in_progress: {
    label: "En cours",
    icon: <Truck className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  },
  delivered: {
    label: "Livré",
    icon: <PackageCheck className="h-4 w-4" />,
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  },
  failed: {
    label: "Échoué",
    icon: <PackageX className="h-4 w-4" />,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  },
  cancelled: {
    label: "Annulé",
    icon: <X className="h-4 w-4" />,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
  },
};

const priorityConfig = {
  high: {
    label: "Haute",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  },
  normal: {
    label: "Normale",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  },
  low: {
    label: "Basse",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
  },
};

export const ShipmentDetailsDialog = React.memo(function ShipmentDetailsDialog({
  shipment,
  isOpen,
  setIsOpen,
  userId,
  userRole,
}: ShipmentDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "items" | "tracking" | "notes">("overview");
  const [newNote, setNewNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  const { 
    updateShipment, 
    assignDriver, 
    addTracking,
    drivers,
    isLoadingDrivers 
  } = useLogistics(userId, userRole);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copié`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStatusChange = async (newStatus: ShipmentStatus) => {
    setIsProcessing(true);
    try {
      await updateShipment({ 
        shipmentId: shipment.id, 
        status: newStatus 
      });
      toast.success(`Statut mis à jour: ${statusConfig[newStatus].label}`);
    } catch (error) {
      toast.error("Échec de la mise à jour du statut");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsProcessing(true);
    try {
      
      toast.success("Note ajoutée");
      setNewNote("");
    } catch (error) {
      toast.error("Échec de l'ajout de la note");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      await updateShipment({ 
        shipmentId: shipment.id, 
        status: "failed" 
      });
      toast.success("Expédition annulée");
      setIsOpen(false);
    } catch (error) {
      toast.error("Échec de l'annulation");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriverId) {
      toast.error("Veuillez sélectionner un livreur");
      return;
    }

    setIsProcessing(true);
    try {
      await assignDriver({ 
        shipmentId: shipment.id, 
        driverId: selectedDriverId 
      });
      toast.success("Livreur assigné avec succès");
    } catch (error) {
      toast.error("Échec de l'assignation du livreur");
    } finally {
      setIsProcessing(false);
    }
  };

  const deliveryProgress = useMemo(() => {
    if (shipment?.status === "delivered") return 100;
    if (shipment?.status === "in_progress") return 50;
    return 10;
  }, [shipment?.status]);

  const totalWeight = useMemo(() => {
    return shipment?.items?.reduce((sum: number, item: any) => sum + (item.product?.weight || 0) * item.quantity, 0) || 0;
  }, [shipment?.items]);

  if (!shipment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Expédition #{shipment.id}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {shipment.store.name} • {format(new Date(shipment.createdAt), "PP", { locale: fr })}
              </DialogDescription>
            </div>
            <div className="flex gap-2 mt-8">
              <Button variant="outline" size="icon">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <Badge className={statusConfig[shipment.status].color}>
              {statusConfig[shipment.status].icon}
              {statusConfig[shipment.status].label}
            </Badge>
            <Badge className={priorityConfig[shipment.priorityLevel].color}>
              {priorityConfig[shipment.priorityLevel].label} priorité
            </Badge>
            {shipment.isDelayed && (
              <Badge variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-1" />
                En retard
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="p-6 pt-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="overview">
                <Package className="h-4 w-4 mr-2" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="items">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Articles
              </TabsTrigger>
              <TabsTrigger value="tracking">
                <MapPin className="h-4 w-4 mr-2" />
                Suivi
              </TabsTrigger>
              <TabsTrigger value="notes">
                <MessageCircle className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Progression */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Progression de la livraison</span>
                    <span className="text-sm text-muted-foreground">{deliveryProgress}%</span>
                  </div>
                  <Progress value={deliveryProgress} className="h-2" />
                </div>

                {/* Client et Magasin */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Client</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Nom</span>
                        <div className="flex items-center gap-2">
                          <span>{shipment.customer.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(shipment.customer.name, "Nom")}
                          >
                            {copiedField === "Nom" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Téléphone</span>
                        <div className="flex items-center gap-2">
                          <span>{shipment.customer.phoneNumber}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(shipment.customer.phoneNumber, "Téléphone")}
                          >
                            {copiedField === "Téléphone" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span>{shipment.customer.email}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Magasin</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Nom</span>
                        <span>{shipment.store.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Adresse</span>
                        <span className="text-right line-clamp-2">
                          {shipment.originAddress.formattedAddress}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Dates */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Dates</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Création</span>
                      <span>{format(new Date(shipment.createdAt), "PPpp", { locale: fr })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Livraison estimée</span>
                      <span>
                        {format(new Date(shipment.order.estimatedDeliveryDate), "PP", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Dernière mise à jour</span>
                      <span>{format(new Date(shipment.updatedAt), "PPpp", { locale: fr })}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Adresse de livraison */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Adresse de livraison</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <p className="line-clamp-3">{shipment.destinationAddress.formattedAddress}</p>
                      {shipment.destinationAddress.deliveryInstructions && (
                        <div className="mt-2">
                          <span className="text-sm font-medium">Instructions : </span>
                          <span className="text-sm text-muted-foreground">
                            {shipment.destinationAddress.deliveryInstructions}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="items" className="mt-6">
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Articles ({shipment.items.length})
                  </h3>

                  <div className="space-y-3">
                    {shipment.items.map((item: any) => (
                      <Card key={item.id}>
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × {item.price.toLocaleString()} GNF
                            </p>
                            {item.product.weight && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Poids: {(item.product.weight * item.quantity).toLocaleString()} g
                              </p>
                            )}
                          </div>
                          <p className="font-medium">
                            {(item.price * item.quantity).toLocaleString()} GNF
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span>{shipment.storeOrder.subtotal.toLocaleString()} GNF</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frais de livraison</span>
                    <span>{shipment.storeOrder.deliveryFee.toLocaleString()} GNF</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{shipment.storeOrder.total.toLocaleString()} GNF</span>
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Poids total : </span>
                      {totalWeight.toLocaleString()} g
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tracking" className="mt-6 space-y-6">
                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5" />
                    Carte de suivi
                  </h3>
                  <div className="h-64 rounded-lg overflow-hidden border">
                    <Map
                      center={{
                        lat: shipment.originAddress.coordinates.lat,
                        lng: shipment.originAddress.coordinates.lng,
                      }}
                      origin={{
                        lat: shipment.originAddress.coordinates.lat,
                        lng: shipment.originAddress.coordinates.lng,
                        label: "Origine",
                      }}
                      destination={{
                        lat: shipment.destinationAddress.coordinates.lat,
                        lng: shipment.destinationAddress.coordinates.lng,
                        label: "Destination",
                      }}
                      zoom={12}
                      className="h-full w-full"
                    />
                  </div>
                </div>

                {shipment.driver ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Livreur</h3>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Nom</span>
                        <span>{shipment.driver.name}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-muted-foreground">Téléphone</span>
                        <span>{shipment.driver.phoneNumber}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-muted-foreground">Véhicule</span>
                        <span>{shipment.driver.vehicleType}</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-6 border rounded-lg">
                      <Truck className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">Aucun livreur assigné</p>
                    </div>

                    {!isLoadingDrivers && drivers && drivers.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Assigner un livreur</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {drivers.map((driver) => (
                            <div 
                              key={driver.id} 
                              className={`p-3 border rounded-lg cursor-pointer ${selectedDriverId === driver.id ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}
                              onClick={() => setSelectedDriverId(driver.id)}
                            >
                              <div className="flex justify-between items-center">
                                <span>{driver.name}</span>
                                <span className="text-sm text-muted-foreground">{driver.vehicleType}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">{driver.phoneNumber}</div>
                            </div>
                          ))}
                        </div>
                        <Button 
                          onClick={handleAssignDriver}
                          disabled={!selectedDriverId || isProcessing}
                        >
                          Assigner le livreur sélectionné
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="mt-6 space-y-6">
                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-4">
                    <MessageCircle className="h-5 w-5" />
                    Notes de livraison
                  </h3>

                  {shipment.trackingHistory?.filter(t => t.note).length > 0 ? (
                    <div className="space-y-3">
                      {shipment.trackingHistory
                        .filter(t => t.note)
                        .map((tracking: any) => (
                          <Card key={tracking.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <p className="whitespace-pre-line">{tracking.note}</p>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(tracking.createdAt), "PPpp", { locale: fr })}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border rounded-lg">
                      <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">Aucune note</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Ajouter une note</Label>
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Ajoutez des instructions spéciales ou des remarques..."
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddNote} 
                      disabled={!newNote.trim() || isProcessing}
                    >
                      Enregistrer la note
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </motion.div>
          </Tabs>
        </div>

        <DialogFooter className="p-6 pt-0 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {shipment.status !== "cancelled" && shipment.status !== "delivered" && shipment.status !== "failed" && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Annuler l'expédition
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              {shipment.status === "pending" && (
                <Button
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={isProcessing}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Commencer la livraison
                </Button>
              )}
              {shipment.status === "in_progress" && (
                <Button
                  onClick={() => handleStatusChange("delivered")}
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marquer comme livré
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});