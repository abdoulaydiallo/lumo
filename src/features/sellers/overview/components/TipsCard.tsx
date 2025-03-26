import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type Tip = {
  id: string;
  title: string;
  content: string;
  priority: "high" | "medium" | "low";
  read?: boolean;
};

interface TipsCardProps {
  initialTips?: Tip[];
  storageKey?: string;
  className?: string;
  collapsible?: boolean;
}

export function TipsCard({
  initialTips = DEFAULT_TIPS,
  storageKey = "tipsState",
  className,
  collapsible = true,
}: TipsCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [tips, setTips] = useState<Tip[]>(initialTips);

  useEffect(() => {
    setIsClient(true);
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTips(mergeTips(initialTips, parsed));
        } catch (e) {
          console.error("Failed to parse saved tips", e);
        }
      }
    }
  }, [initialTips, storageKey]);

  useEffect(() => {
    if (isClient && storageKey && typeof window !== "undefined") {
      const savedState = tips.map((tip) => ({
        id: tip.id,
        read: tip.read,
      }));
      localStorage.setItem(storageKey, JSON.stringify(savedState));
    }
  }, [tips, storageKey, isClient]);

  const unreadTips = tips.filter((tip) => !tip.read);
  const hasUnreadTips = unreadTips.length > 0;

  const markAsRead = (id: string) => {
    setTips((prev) =>
      prev.map((tip) => (tip.id === id ? { ...tip, read: true } : tip))
    );
  };

  const markAllAsRead = () => {
    setTips((prev) => prev.map((tip) => ({ ...tip, read: true })));
  };

  if (!isExpanded && collapsible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex items-center gap-2 text-muted-foreground hover:text-foreground",
          className
        )}
        onClick={() => setIsExpanded(true)}
      >
        <HelpCircle className="h-4 w-4" />
        Conseils ({isClient ? unreadTips.length : 0})
        <ChevronDown className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Alert
      className={cn(
        "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
        "relative transition-all duration-300",
        className
      )}
    >
      {collapsible && (
        <button
          onClick={() => setIsExpanded(false)}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/50"
          aria-label="Masquer les conseils"
        >
          <X className="h-4 w-4 text-blue-500 dark:text-blue-300" />
        </button>
      )}

      <AlertTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
        <CheckCircle2 className="h-5 w-5 text-blue-500 dark:text-blue-300" />
        <span>Conseils pratiques</span>
        {hasUnreadTips && isClient && (
          <span className="ml-auto text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded-full">
            {unreadTips.length} nouveau(x)
          </span>
        )}
      </AlertTitle>

      <AlertDescription className="mt-3 space-y-3">
        <ul className="space-y-3">
          {tips.map((tip) => (
            <TipItem
              key={tip.id}
              tip={tip}
              onMarkAsRead={() => markAsRead(tip.id)}
            />
          ))}
        </ul>

        {hasUnreadTips && isClient && (
          <Button
            variant="link"
            size="sm"
            className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 -ml-3"
            onClick={markAllAsRead}
          >
            Tout marquer comme lu
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

function TipItem({
  tip,
  onMarkAsRead,
}: {
  tip: Tip;
  onMarkAsRead: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(!tip.read);

  return (
    <li
      className={cn(
        "transition-colors duration-200 rounded-lg p-2",
        !tip.read && "bg-blue-100/50 dark:bg-blue-800/30"
      )}
    >
      <button
        className="flex items-start w-full gap-2 text-left"
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!tip.read) onMarkAsRead();
        }}
      >
        <div className="flex-shrink-0 pt-0.5">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-blue-500 dark:text-blue-300" />
          ) : (
            <ChevronDown className="h-4 w-4 text-blue-500 dark:text-blue-300" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm sm:text-base">{tip.title}</h3>
          {isExpanded && (
            <p className="mt-1 text-sm text-muted-foreground">{tip.content}</p>
          )}
        </div>
      </button>
    </li>
  );
}

function mergeTips(
  initialTips: Tip[],
  savedState: Array<{ id: string; read: boolean }>
): Tip[] {
  return initialTips.map((tip) => {
    const saved = savedState.find((t) => t.id === tip.id);
    return saved ? { ...tip, read: saved.read } : tip;
  });
}

const DEFAULT_TIPS: Tip[] = [
  {
    id: "documents",
    title: "Validation des documents",
    content:
      "Assurez-vous que tous vos documents d'identité et justificatifs sont à jour pour éviter toute interruption de service.",
    priority: "high",
    read: false,
  },
  {
    id: "orders",
    title: "Gestion des commandes",
    content:
      "Les commandes en attente depuis plus de 48h impactent votre taux de conversion. Priorisez leur traitement.",
    priority: "high",
    read: false,
  },
  {
    id: "stock",
    title: "Niveau des stocks",
    content:
      "Configurez des alertes automatiques pour être averti lorsque vos stocks sont bas sur vos produits populaires.",
    priority: "medium",
    read: false,
  },
  {
    id: "analytics",
    title: "Analyse des performances",
    content:
      "Consultez régulièrement vos statistiques pour identifier les opportunités d'amélioration.",
    priority: "low",
    read: false,
  },
];
