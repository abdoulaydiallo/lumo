import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { IconType } from "./types";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: "up" | "down";
  percentage: number;
  description: string;
  icon?: IconType;
}

export function MetricCard({
  title,
  value,
  trend,
  percentage,
  description,
  icon,
}: MetricCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = trend === "up" ? "text-green-500" : "text-red-500";

  return (
    <Card className="@container/card bg-gradient-to-t from-primary/5 to-card">
      <CardHeader className="relative p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <p className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
          {value}
        </p>
        <Badge
          variant="outline"
          className="absolute right-4 top-4 flex gap-1 rounded-lg text-xs"
        >
          <TrendIcon className={`size-3 ${trendColor}`} /> {percentage}%
        </Badge>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">{description}</div>
      </CardContent>
    </Card>
  );
}
