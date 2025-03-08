// @/features/stores/components/opening-hours-manager.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { OpeningHours } from "../api/types";

interface OpeningHoursManagerProps {
  value: OpeningHours | undefined;
  onChange: (hours: OpeningHours) => void;
}

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const defaultOpeningHours: OpeningHours = {
  monday: { open: "09:00", close: "17:00", isClosed: false },
  tuesday: { open: "09:00", close: "17:00", isClosed: false },
  wednesday: { open: "09:00", close: "17:00", isClosed: false },
  thursday: { open: "09:00", close: "17:00", isClosed: false },
  friday: { open: "09:00", close: "17:00", isClosed: false },
  saturday: { open: "09:00", close: "17:00", isClosed: true },
  sunday: { open: "09:00", close: "17:00", isClosed: true },
};

export default function OpeningHoursManager({
  value,
  onChange,
}: OpeningHoursManagerProps) {
  const [hours, setHours] = useState<OpeningHours>(() => {
    return daysOfWeek.reduce(
      (acc, day) => ({
        ...acc,
        [day]: value && value[day] ? value[day] : defaultOpeningHours[day],
      }),
      {} as OpeningHours
    );
  });

  useEffect(() => {
    const updatedHours = daysOfWeek.reduce(
      (acc, day) => ({
        ...acc,
        [day]: value && value[day] ? value[day] : defaultOpeningHours[day],
      }),
      {} as OpeningHours
    );
    setHours(updatedHours);
  }, [value]);

  const updateHours = (
    day: keyof OpeningHours,
    field: keyof OpeningHours[keyof OpeningHours],
    newValue: string | boolean
  ) => {
    const updatedHours = {
      ...hours,
      [day]: {
        ...hours[day],
        [field]: newValue,
      },
    };
    setHours(updatedHours);
    onChange(updatedHours);
  };

  return (
    <Card className="border border-border rounded-lg bg-background">
      <CardContent className="p-6 space-y-6">
        <h2 className="text-lg font-medium text-foreground">
          Horaires d'ouverture
        </h2>
        <div className="space-y-4">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-2"
            >
              <div className="w-full sm:w-24 flex-shrink-0">
                <Label className="capitalize text-sm sm:text-base">
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
                </Label>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="time"
                  value={hours[day].open}
                  onChange={(e) => updateHours(day, "open", e.target.value)}
                  disabled={hours[day].isClosed}
                  className="w-full sm:w-24 border-border bg-background text-foreground text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={hours[day].close}
                  onChange={(e) => updateHours(day, "close", e.target.value)}
                  disabled={hours[day].isClosed}
                  className="w-full sm:w-24 border-border bg-background text-foreground text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Fermé</Label>
                <Switch
                  checked={hours[day].isClosed}
                  onCheckedChange={(checked) =>
                    updateHours(day, "isClosed", checked)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
