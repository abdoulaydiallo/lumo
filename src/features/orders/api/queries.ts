// @/features/orders/api/queries.ts
import {
  searchOrders,
  OrderFiltersBase,
  OrderPagination,
  OrderSearchResult
} from "@/lib/db/orders.search";

import {
  orderStatuses,
  paymentStatuses,
  paymentMethods
} from "@/lib/db/schema";

interface SearchParams {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  userId?: string;
  storeId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  sort?: string;
  page?: string;
  perPage?: string;
}

/**
 * Récupère les données initiales des commandes pour un utilisateur donné.
 * @param userId ID de l'utilisateur
 * @param userRole Rôle de l'utilisateur
 * @param searchParams Paramètres de recherche issus de l'URL
 * @returns Données initiales des commandes
 */
export async function getInitialOrders(
  userId: number,
  userRole: "user" | "store" | "driver" | "admin" | "manager",
  {
    status,
    paymentStatus,
    paymentMethod,
    startDate,
    endDate,
    page,
    perPage,
  }: SearchParams
): Promise<OrderSearchResult> {
  // Valider et transformer les searchParams en filtres
  const filters: OrderFiltersBase = {
    status: status
      ?.split(",")
      .filter((s) => orderStatuses.enumValues.includes(s as any)) as OrderFiltersBase["status"],
    payment_status: paymentStatus
      ?.split(",")
      .filter((s) => paymentStatuses.enumValues.includes(s as any)) as OrderFiltersBase["payment_status"],
    payment_method: paymentMethod
      ?.split(",")
      .filter((s) => paymentMethods.enumValues.includes(s as any)) as OrderFiltersBase["payment_method"],
    date_range:
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined,
  };

  // Transformer les searchParams en pagination avec gestion des erreurs
  const pagination: OrderPagination = {
    page: page && !isNaN(parseInt(page)) ? parseInt(page) : 1,
    per_page: perPage && !isNaN(parseInt(perPage)) ? parseInt(perPage) : 10,
  };

  // Récupérer les données avec searchOrders
  const result = await searchOrders(userId, userRole, { filters, pagination });

  return result;
}