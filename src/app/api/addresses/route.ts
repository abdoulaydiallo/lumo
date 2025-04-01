import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createAddress, getAllAddresses } from '@/services/addresses.service';
import { AddressData } from '@/services/addresses.service';
import { ServiceError, ERROR_CODES } from '@/services/orders.errors';
import { AddressSearchResult, AddressFilters, AddressPagination } from '@/features/addresses/hooks/useAddresses';

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError['toJSON']> };

  export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
    console.log('POST /api/address received');
    try {
      const user = await getUser();
      console.log('Authenticated user:', user);
      if (!user || !user.id) {
        throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, 'Utilisateur non authentifié ou ID manquant');
      }
  
      let body: AddressData;
      try {
        body = await req.json();
        console.log('Request body:', body);
      } catch (e) {
        throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'JSON invalide dans la requête');
      }
  
      // Validation spécifique du champ location
      if (!body.location || !('type' in body.location)) {
        throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'Le champ location doit spécifier un type (URBAIN ou RURAL)');
      }
  
      const addressData: AddressData = { 
        ...body, 
        userId: user.id,
        coordinates: body.coordinates || { lat: 0, lng: 0 } // Valeur par défaut si absente
      };
  
      const newAddress = await createAddress(addressData);
      console.log('New address created:', newAddress);
  
      return NextResponse.json({ success: true, data: newAddress }, { status: 201 });
    } catch (error) {
      console.error('Error in POST /api/address:', error);
      if (error instanceof ServiceError) {
        return NextResponse.json({ success: false, error: error.toJSON() }, { status: 400 });
      }
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erreur serveur',
            details: error instanceof Error ? { message: error.message } : { message: 'Erreur inconnue' }
          }
        },
        { status: 500 }
      );
    }
  }
  
  export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<AddressSearchResult>>> {
    try {
      const user = await getUser();
      if (!user) {
        throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, 'Utilisateur non authentifié');
      }
  
      const { searchParams } = new URL(req.url);
      const filters: AddressFilters = {
        region: searchParams.get('region') || undefined,
        recipient: searchParams.get('recipient') || undefined,
      };
      const pagination: AddressPagination = {
        page: parseInt(searchParams.get('page') || '1', 10),
        per_page: parseInt(searchParams.get('per_page') || '10', 10),
      };
  
      const result = await getAllAddresses(
        user.role !== 'admin' ? user.id : undefined, // Pas de filtre userId pour admin
        filters,
        pagination
      );
  
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    } catch (error) {
      if (error instanceof ServiceError) {
        return NextResponse.json({ success: false, error: error.toJSON() }, { status: 400 });
      }
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erreur serveur',
            details: error instanceof Error ? { message: error.message } : { message: 'Erreur inconnue' },
          },
        },
        { status: 500 }
      );
    }
  }