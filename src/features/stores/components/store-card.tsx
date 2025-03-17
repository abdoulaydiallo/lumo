// @/features/stores/components/store-card.tsx
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Store } from "../api/types";
import { cn } from "@/lib/utils";

interface StoreCardProps {
  store: Store;
  className?: string;
}

export default function StoreCard({ store, className }: StoreCardProps) {
  return (
    <Card
      className={cn(
        "border border-border rounded-lg bg-background hover:shadow-md transition-shadow",
        className
      )}
    >
      <CardHeader className="px-4">
        {store.profileImageUrl ? (
          <Image
            src={store.profileImageUrl}
            alt={`${store.name} profile`}
            width={200}
            height={150}
            className="w-full h-32 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-32 bg-muted rounded-t-lg flex items-center justify-center">
            <span className="text-muted-foreground">Pas d&apos;image</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <h3 className="text-lg font-semibold text-foreground truncate">
          {store.name}
        </h3>
        <p className="text-sm text-muted-foreground truncate">
          {store.description || "Aucune description"}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant={store.isOpenNow ? "default" : "destructive"}>
            {store.isOpenNow ? "Ouvert" : "Fermé"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {store.activityType}
          </span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <p className="text-xs text-muted-foreground">
          Créé le {new Date(store.createdAt).toLocaleDateString("fr-FR")}
        </p>
      </CardFooter>
    </Card>
  );
}
