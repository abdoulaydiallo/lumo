import {
    searchShipments,
    ShipmentFilters,
    ShipmentSearchResult,
    ShipmentStatus,
  } from "@/algorithms/shipments.search"; // Assurez-vous que le chemin correspond à votre structure
  import {
    shipmentStatuses,
  } from "@/lib/db/schema";
  
  export interface SearchParams {
    status?: ShipmentStatus;              // Statuts séparés par des virgules (ex: "pending,in_progress")
    driverId?: string;            // ID du conducteur
    priorityLevel?: string;       // Niveaux de priorité séparés par des virgules (ex: "normal,urgent")
    startDate?: string;           // Date de début (ISO string)
    endDate?: string;             // Date de fin (ISO string)
    minEstimatedDeliveryTime?: string; // Temps estimé minimum en minutes
    maxEstimatedDeliveryTime?: string; // Temps estimé maximum en minutes
    hasSupportTicket?: string;    // "true" ou "false"
    storeId?: string;             // ID du magasin (optionnel pour filtrer par magasin)
    page?: string;                // Numéro de page
    perPage?: string;             // Éléments par page
  }
  
  /**
   * Récupère les données initiales des expéditions pour un utilisateur donné.
   * @param userId ID de l'utilisateur (vendeur, conducteur, admin, etc.)
   * @param userRole Rôle de l'utilisateur ("store", "driver", "admin", "manager")
   * @param searchParams Paramètres de recherche issus de l'URL
   * @returns Données initiales des expéditions
   */
  export async function getInitialShipments(
    userId: number,
    userRole: "user" | "store" | "driver" | "admin" | "manager",
    {
      status,
      driverId,
      priorityLevel,
      startDate,
      endDate,
      minEstimatedDeliveryTime,
      maxEstimatedDeliveryTime,
      hasSupportTicket,
      storeId,
      page,
      perPage,
    }: SearchParams
  ): Promise<ShipmentSearchResult> {
    // Vérification du rôle
    if (!["store", "driver", "admin", "manager"].includes(userRole)) {
      throw new Error("Invalid userRole for searchShipments. Must be 'store', 'driver', 'admin', or 'manager'.");
    }
  
    // Valider et transformer les searchParams en filtres
    const filters: ShipmentFilters = {
      status: status
        ?.split(",")
        .filter((s) => shipmentStatuses.enumValues.includes(s as any)) as ShipmentFilters["status"],
      driverId: driverId && !isNaN(parseInt(driverId)) ? parseInt(driverId) : undefined,
      priorityLevel: priorityLevel
        ?.split(",")
        .filter((p) => ["normal", "urgent", "high"].includes(p)) as ShipmentFilters["priorityLevel"], // Ajustez selon vos valeurs possibles
      dateRange:
        startDate && endDate
          ? {
              start: new Date(startDate),
              end: new Date(endDate),
            }
          : undefined,
      minEstimatedDeliveryTime:
        minEstimatedDeliveryTime && !isNaN(parseFloat(minEstimatedDeliveryTime))
          ? parseFloat(minEstimatedDeliveryTime)
          : undefined,
      maxEstimatedDeliveryTime:
        maxEstimatedDeliveryTime && !isNaN(parseFloat(maxEstimatedDeliveryTime))
          ? parseFloat(maxEstimatedDeliveryTime)
          : undefined,
      hasSupportTicket: hasSupportTicket === "true" ? true : hasSupportTicket === "false" ? false : undefined,
      storeId: storeId && !isNaN(parseInt(storeId)) ? parseInt(storeId) : undefined,
    };
  
    // Validation des dates
    if (
      filters.dateRange &&
      (isNaN(filters.dateRange.start.getTime()) || isNaN(filters.dateRange.end.getTime()))
    ) {
      throw new Error("Invalid date format in dateRange");
    }
  
    // Validation des temps estimés
    if (
      (filters.minEstimatedDeliveryTime !== undefined && filters.minEstimatedDeliveryTime < 0) ||
      (filters.maxEstimatedDeliveryTime !== undefined && filters.maxEstimatedDeliveryTime < 0) ||
      (filters.minEstimatedDeliveryTime !== undefined &&
        filters.maxEstimatedDeliveryTime !== undefined &&
        filters.minEstimatedDeliveryTime > filters.maxEstimatedDeliveryTime)
    ) {
      throw new Error("Invalid estimated delivery time parameters");
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
  
    // Récupérer les données avec searchShipments
    const result = await searchShipments(userId, { filters, pagination });
    return result;
  }