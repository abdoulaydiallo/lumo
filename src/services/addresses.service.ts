import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { logActivity } from "./logs.service";
import { eq, sql } from "drizzle-orm";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";
import { AddressFilters, AddressPagination, AddressSearchResult } from "@/features/addresses/hooks/useAddresses";

export type Region = 'CONAKRY' | 'BOKE' | 'KINDIA' | 'LABE' | 'MAMOU' | 'NZEREKORE' | 'FARANAH' | 'KANKAN';
export type ConakryCommune = 'Kaloum' | 'Dixinn' | 'Ratoma' | 'Matam' | 'Matoto' | 'Lambanyi' | 'Sonfonia' | 'Gbessia' | 'Tombolia' 
  | 'Kagbelen' | 'Sanoyah' | 'Manéah' | 'Kassa';

export interface RuralAddress {
  type: 'RURAL';
  prefecture: string;
  subPrefecture: string;
  village: string;
  landmark: string;
  district: string;
  photoUrl?: string;
}

export interface UrbanAddress {
  type: 'URBAIN';
  commune: ConakryCommune;
  district: string;
  street?: string;
  landmark: string;
  photoUrl?: string;
}

export interface AddressData {
  recipient: string;
  userId: number;
  location: UrbanAddress | RuralAddress;
  postalCode: string;
  coordinates: { lat: number; lng: number };
  photoUrl?: string;
  region: string;
  formattedAddress: string;
  deliveryInstructions?: string;
}

export interface Address extends AddressData {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export const createAddress = async (addressData: AddressData): Promise<Address> => {
  try {
    if (!addressData.recipient || !addressData.location || !addressData.postalCode || !addressData.region || !addressData.formattedAddress) {
      throw new ServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        'Les champs obligatoires (recipient, location, postalCode, region, formattedAddress) sont requis'
      );
    }

    const newAddress = await db.insert(addresses).values(addressData).returning();
    if (!newAddress[0]) {
      throw new ServiceError(ERROR_CODES.DATABASE_ERROR, 'Échec de la création de l\'adresse');
    }

    await logActivity(addressData.userId, 'address_create', addressData);
    return newAddress[0] as Address;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      'Erreur lors de la création de l\'adresse',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};

export const getAddressById = async (id: number): Promise<Address> => {
  try {
    if (isNaN(id) || id <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'ID d\'adresse invalide');
    }

    const address = await db.select().from(addresses).where(eq(addresses.id, id));
    if (!address[0]) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Adresse avec l'ID ${id} non trouvée`);
    }

    return address[0] as Address;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      'Erreur lors de la récupération de l\'adresse',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};

export const updateAddress = async (id: number, updateData: Partial<AddressData>): Promise<Address> => {
  try {
    if (isNaN(id) || id <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'ID d\'adresse invalide');
    }
    if (Object.keys(updateData).length === 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'Aucune donnée à mettre à jour fournie');
    }

    const updatedAddress = await db
      .update(addresses)
      .set(updateData)
      .where(eq(addresses.id, id))
      .returning();
    if (!updatedAddress[0]) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Adresse avec l'ID ${id} non trouvée`);
    }

    await logActivity(updatedAddress[0].userId, 'address_update', updateData);
    return updatedAddress[0] as Address;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      'Erreur lors de la mise à jour de l\'adresse',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};

export const deleteAddress = async (id: number): Promise<void> => {
  try {
    if (isNaN(id) || id <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'ID d\'adresse invalide');
    }

    const deletedAddress = await db.delete(addresses).where(eq(addresses.id, id)).returning();
    if (!deletedAddress[0]) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Adresse avec l'ID ${id} non trouvée`);
    }

    await logActivity(deletedAddress[0].userId, 'address_delete', { addressId: id });
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      'Erreur lors de la suppression de l\'adresse',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};

export const getAllAddresses = async (
  userId?: number,
  filters: AddressFilters = {},
  pagination: AddressPagination = { page: 1, per_page: 10 }
): Promise<AddressSearchResult> => {
  try {
    let query = db.select().from(addresses);

    // Filtrer par userId si fourni (sauf pour admin)
    if (userId) {
      query = query.where(eq(addresses.userId, userId)) as typeof query;
    }

    // Appliquer les filtres
    if (filters.region?.trim()) {
      query = query.where(eq(addresses.region, filters.region)) as typeof query;
    }
    if (filters.recipient?.trim()) {
      query = query.where(eq(addresses.recipient, filters.recipient)) as typeof query;
    }

    // Compter le total pour la pagination
    const totalResult = await db.select({ count: sql`COUNT(*)` }).from(addresses);
    const total = Number(totalResult[0].count);

    // Appliquer la pagination
    const offset = (pagination.page - 1) * pagination.per_page;
    query = query.limit(pagination.per_page).offset(offset) as typeof query;

    const result = await query;
    const total_pages = Math.ceil(total / pagination.per_page);

    return {
      addresses: result as Address[],
      total,
      page: pagination.page,
      total_pages,
    };
  } catch (error) {
    throw new ServiceError(
      ERROR_CODES.DATABASE_ERROR,
      'Erreur lors de la récupération des adresses',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};