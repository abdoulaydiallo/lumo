"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "./DatePicker";

interface OrderFiltersProps {
  onFilterChange: (filters: {
    status: string;
    dateFrom: string;
    dateTo: string;
  }) => void;
}

const defaultFilters = {
  status: "all",
  dateFrom: "",
  dateTo: "",
};

export default function OrderFilters({ onFilterChange }: OrderFiltersProps) {
  const [filters, setFilters] = useState(defaultFilters);

  const handleInputChange = (
    field: keyof typeof defaultFilters,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (
    field: "dateFrom" | "dateTo",
    date: Date | undefined
  ) => {
    const formattedDate = date ? date.toISOString().split("T")[0] : "";
    handleInputChange(field, formattedDate);
  };

  const handleApply = () => {
    onFilterChange(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg max-w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="statusFilter" className="text-sm">
            Statut
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleInputChange("status", value)}
          >
            <SelectTrigger id="statusFilter" className="w-full">
              <SelectValue placeholder="Sélectionner un statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="delivered">Livrées</SelectItem>
              <SelectItem value="cancelled">Annulées</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Date de début</Label>
          <DatePicker
            date={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
            onDateChange={(date) => handleDateChange("dateFrom", date)}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Date de fin</Label>
          <DatePicker
            date={filters.dateTo ? new Date(filters.dateTo) : undefined}
            onDateChange={(date) => handleDateChange("dateTo", date)}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-start gap-2">
        <Button
          variant="default"
          onClick={handleApply}
          className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
        >
          Appliquer
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="bg-gray-100 hover:bg-gray-200 w-full sm:w-auto"
        >
          Réinitialiser
        </Button>
      </div>
    </div>
  );
}
