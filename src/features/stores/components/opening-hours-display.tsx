// @/features/stores/components/opening-hours-display.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpeningHours } from "../api/types";

interface OpeningHoursDisplayProps {
  openingHours: OpeningHours | undefined;
}

export default function OpeningHoursDisplay({
  openingHours,
}: OpeningHoursDisplayProps) {
  return (
    <Card className="border border-border rounded-lg bg-background">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">
          Horaires d'ouverture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {Object.entries(openingHours || {}).map(
            ([day, { open, close, isClosed }]: any) => (
              <li key={day} className="flex justify-between text-sm">
                <span className="capitalize">
                  {day === "monday"
                    ? "Lundi"
                    : day === "tuesday"
                    ? "Mardi"
                    : day === "wednesday"
                    ? "Mercredi"
                    : day === "thursday"
                    ? "Jeudi"
                    : day === "friday"
                    ? "Vendredi"
                    : day === "saturday"
                    ? "Samedi"
                    : "Dimanche"}
                </span>
                <span
                  className={
                    isClosed ? "text-muted-foreground" : "text-foreground"
                  }
                >
                  {isClosed ? "Fermé" : `${open} - ${close}`}
                </span>
              </li>
            ) as any
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
