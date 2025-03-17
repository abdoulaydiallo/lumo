// @/features/stores/components/store-details.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { FullStore } from "../api/types";
import OpeningHoursDisplay from "./opening-hours-display";
import StoreOwnerActions from "./store-owner-actions";

interface StoreDetailsProps {
  store: FullStore;
  isOwner: boolean;
}

export default function StoreDetails({ store, isOwner }: StoreDetailsProps) {
  return (
    <div className="flex flex-col md:flex-row max-w-5xl mx-auto px-4 md:px-0 mt-4 gap-6">
      {/* Contenu principal */}
      <main className="flex-1">
        <Card className="border border-border rounded-lg bg-background shadow-sm">
          <CardHeader className="relative">
            <div className="space-y-2 pb-4">
              <h1 className="text-3xl font-bold text-foreground">
                {store.name}
              </h1>
              <div className="flex items-center gap-2">
                <Badge
                  variant={store.isOpenNow ? "default" : "destructive"}
                  className="px-3 py-1"
                >
                  {store.isOpenNow ? "Ouvert" : "Fermé"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {store.activityType}
                </span>
              </div>
            </div>
            {/* Image de couverture */}
            {store.coverImageUrl && (
              <Image
                src={store.coverImageUrl}
                alt={`${store.name} cover`}
                width={800}
                height={400}
                priority
                className="w-full h-58 object-cover rounded-t-lg"
              />
            )}
            {/* Photo de profil */}
            <div className="absolute -bottom-12 left-12">
              {store.profileImageUrl ? (
                <Image
                  src={store.profileImageUrl}
                  alt={`${store.name} profile`}
                  width={120}
                  height={120}
                  priority
                  className="w-24 h-24 rounded-full border-4 border-background object-cover shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-md">
                  <span className="text-muted-foreground text-lg font-semibold">
                    {store.name[0]}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-14 space-y-6">
            {/* Titre et statut */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {isOwner && (
                <StoreOwnerActions storeId={store.id} storeName={store.name} />
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Description
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {store.description || "Aucune description disponible."}
              </p>
            </div>

            {/* Informations */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Informations
              </h2>
              <ul className="space-y-1 text-muted-foreground">
                <li>Téléphone : {store.phoneNumber}</li>
                <li>Email : {store.email}</li>
                {store.user && (
                  <li>Propriétaire : {store.user.name || store.user.email}</li>
                )}
              </ul>
            </div>

            {/* Produits */}
            {store.products.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Produits
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {store.products.map((product) => (
                    <li
                      key={product.id}
                      className="border border-border rounded-md p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <p className="font-medium text-foreground">
                        {product.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.price} €
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Barre latérale */}
      <aside className="w-full md:w-80">
        <OpeningHoursDisplay openingHours={store.openingHours} />
      </aside>
    </div>
  );
}
