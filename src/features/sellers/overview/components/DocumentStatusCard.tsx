// components/overview/DocumentStatusCard.tsx
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

// Configuration des statuts avec valeurs par défaut
const statusConfig = {
  pending: {
    icon: Clock,
    color: "bg-yellow-500",
    textColor: "text-yellow-800",
    label: "En attente",
  },
  approved: {
    icon: CheckCircle2,
    color: "bg-green-500",
    textColor: "text-green-800",
    label: "Approuvé",
  },
  rejected: {
    icon: AlertCircle,
    color: "bg-red-500",
    textColor: "text-red-800",
    label: "Rejeté",
  },
  // Valeur par défaut pour les statuts inconnus
  default: {
    icon: Clock,
    color: "bg-gray-500",
    textColor: "text-gray-800",
    label: "Inconnu",
  },
};

interface DocumentStatusCardProps {
  status?: keyof typeof statusConfig;
  loading?: boolean;
}

export function DocumentStatusCard({
  status = "pending",
  loading = false,
}: DocumentStatusCardProps) {
  // Sélectionne la configuration ou utilise la valeur par défaut
  const config = statusConfig[status] || statusConfig.default;
  const { icon: Icon, color, textColor, label } = config;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="h-10 bg-muted rounded" />
        <CardContent className="h-6 mt-2 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-2 p-4">
        <Icon className={`h-5 w-5 ${textColor}`} />
        <h3 className="text-sm sm:text-base font-medium">
          Statut des documents
        </h3>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-3">
          <Badge className={`${color} ${textColor}`}>{label}</Badge>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {status === "approved"
              ? "Prêt à vendre"
              : status === "pending"
              ? "Validation en cours"
              : "Rejeté. Voir 'Support'"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
