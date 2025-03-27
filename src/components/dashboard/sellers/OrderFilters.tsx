// app/orders/OrderFilters.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

interface OrderFilters {
  status?: string[];
  paymentStatus?: string[];
  paymentMethod?: string[];
  userId?: number;
  storeId?: number;
  driverId?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

interface OrderFiltersProps {
  onFilterChange: (filters: Partial<OrderFilters>) => void;
  statusOptions: string[];
  paymentStatusOptions: string[];
  paymentMethodOptions: string[];
  initialFilters?: Partial<OrderFilters>;
}

export default function OrderFilters({
  onFilterChange,
  statusOptions,
  paymentStatusOptions,
  paymentMethodOptions,
  initialFilters = {},
}: OrderFiltersProps) {
  const [filters, setFilters] = useState<Partial<OrderFilters>>(initialFilters);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialFilters.dateRange
      ? {
          from: initialFilters.dateRange.start,
          to: initialFilters.dateRange.end,
        }
      : undefined
  );

  useEffect(() => {
    if (dateRange?.from && dateRange.to) {
      setFilters((prev:any) => ({
        ...prev,
        dateRange: {
          start: dateRange.from,
          end: dateRange.to,
        },
      }));
    }
  }, [dateRange]);

  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Filtre par statut - CORRIGÉ */}
        <Select
          value={filters.status?.[0] || ""}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              status: value ? [value] : undefined,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Statut de commande" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre par statut de paiement - CORRIGÉ */}
        <Select
          value={filters.paymentStatus?.[0] || ""}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              paymentStatus: value ? [value] : undefined,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Statut de paiement" />
          </SelectTrigger>
          <SelectContent>
            {paymentStatusOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre par méthode de paiement - CORRIGÉ */}
        <Select
          value={filters.paymentMethod?.[0] || ""}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              paymentMethod: value ? [value] : undefined,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Méthode de paiement" />
          </SelectTrigger>
          <SelectContent>
            {paymentMethodOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Autres filtres inchangés... */}
        <Input
          type="number"
          placeholder="ID Utilisateur"
          value={filters.userId || ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              userId: e.target.value ? parseInt(e.target.value) : undefined,
            }))
          }
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yy")} -{" "}
                    {format(dateRange.to, "dd/MM/yy")}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yy")
                )
              ) : (
                <span>Période</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Input
          placeholder="Rechercher..."
          value={filters.searchTerm || ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              searchTerm: e.target.value || undefined,
            }))
          }
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleApplyFilters}>Appliquer les filtres</Button>
      </div>
    </div>
  );
}
