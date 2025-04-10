import {
    searchStoreOrders,
    StoreOrderFilters,
    StoreOrderSearchResult,
  } from "@/algorithms/storeOrders.search";
  import {
    orderStatuses,
    paymentStatuses,
    paymentMethods,
    shipmentStatuses,
  } from "@/lib/db/schema";
  
  interface SearchParams {
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    shipmentStatus?: string;
    startDate?: string;
    endDate?: string;
    paymentStartDate?: string;
    paymentEndDate?: string;
    minAmount?: string;
    maxAmount?: string;
    page?: string;
    perPage?: string;
  }
  
  /**
   * Récupère les données initiales des sous-commandes pour un vendeur donné.
   * @param sellerUserId ID de l'utilisateur vendeur
   * @param userRole Rôle de l'utilisateur (doit être "store")
   * @param searchParams Paramètres de recherche issus de l'URL
   * @returns Données initiales des sous-commandes
   */
  export async function getInitialStoreOrders(
    sellerUserId: number,
    userRole: "user" | "store" | "driver" | "admin" | "manager",
    {
      status,
      paymentStatus,
      paymentMethod,
      shipmentStatus,
      startDate,
      endDate,
      paymentStartDate,
      paymentEndDate,
      minAmount,
      maxAmount,
      page,
      perPage,
    }: SearchParams
  ): Promise<StoreOrderSearchResult> {
    // Vérification du rôle
    if (userRole !== "store") {
      throw new Error("Invalid userRole for searchStoreOrders. Must be 'store'.");
    }
  
    // Valider et transformer les searchParams en filtres
    const filters: StoreOrderFilters = {
      status: status
        ?.split(",")
        .filter((s) => orderStatuses.enumValues.includes(s as any)) as StoreOrderFilters["status"],
      paymentStatus: paymentStatus
        ?.split(",")
        .filter((s) => paymentStatuses.enumValues.includes(s as any)) as StoreOrderFilters["paymentStatus"],
      paymentMethod: paymentMethod
        ?.split(",")
        .filter((s) => paymentMethods.enumValues.includes(s as any)) as StoreOrderFilters["paymentMethod"],
      shipmentStatus: shipmentStatus
        ?.split(",")
        .filter((s) => shipmentStatuses.enumValues.includes(s as any)) as StoreOrderFilters["shipmentStatus"],
      dateRange:
        startDate && endDate
          ? {
              start: new Date(startDate),
              end: new Date(endDate),
            }
          : undefined,
      paymentDateRange:
        paymentStartDate && paymentEndDate
          ? {
              start: new Date(paymentStartDate),
              end: new Date(paymentEndDate),
            }
          : undefined,
      minAmount: minAmount && !isNaN(parseFloat(minAmount)) ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount && !isNaN(parseFloat(maxAmount)) ? parseFloat(maxAmount) : undefined,
    };
  
    // Validation des dates
    if (
      (filters.dateRange && (isNaN(filters.dateRange.start.getTime()) || isNaN(filters.dateRange.end.getTime()))) ||
      (filters.paymentDateRange &&
        (isNaN(filters.paymentDateRange.start.getTime()) || isNaN(filters.paymentDateRange.end.getTime())))
    ) {
      throw new Error("Invalid date format in dateRange or paymentDateRange");
    }
  
    // Transformer les searchParams en pagination avec gestion des erreurs
    const pagination = {
      page: page && !isNaN(parseInt(page)) ? parseInt(page) : 1,
      perPage: perPage && !isNaN(parseInt(perPage)) ? parseInt(perPage) : 10,
    };
  
    // Vérification des valeurs de pagination
    if (pagination.page < 1 || pagination.perPage < 1 || pagination.perPage > 100) {
      throw new Error("Invalid pagination parameters: page must be >= 1, perPage must be between 1 and 100");
    }
  
    // Récupérer les données avec searchStoreOrders
    const result = await searchStoreOrders(sellerUserId, { filters, pagination });
    return result;
  }