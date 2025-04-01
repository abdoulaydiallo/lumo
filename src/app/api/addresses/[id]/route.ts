// /app/api/addresses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getAddressById, updateAddress, deleteAddress } from '@/services/addresses.service';
import { AddressData } from '@/services/addresses.service';
import { ServiceError, ERROR_CODES } from '@/services/orders.errors';
import { db } from '@/lib/db';
import { addresses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError['toJSON']> };

// GET : Récupérer une adresse par ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  const resolvedParams = await params;
  const addressId = parseInt(resolvedParams.id, 10);

  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, 'Utilisateur non authentifié');
    }

    if (isNaN(addressId) || addressId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'ID d\'adresse invalide');
    }

    const address = await getAddressById(addressId);
    if (!address) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Adresse avec l'ID ${addressId} non trouvée`);
    }

    // Vérification des autorisations
    if (address.userId !== user.id && user.role !== 'admin') {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'Vous n\'êtes pas autorisé à voir cette adresse'
      );
    }

    return NextResponse.json({ success: true, data: address }, { status: 200 });
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

// PUT : Mettre à jour une adresse
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  const resolvedParams = await params;
  const addressId = parseInt(resolvedParams.id, 10);

  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, 'Utilisateur non authentifié');
    }

    if (isNaN(addressId) || addressId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'ID d\'adresse invalide');
    }

    const body: Partial<AddressData> = await req.json();
    if (Object.keys(body).length === 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'Aucune donnée à mettre à jour fournie');
    }

    // Vérifier l'existence et les autorisations
    const [existingAddress] = await db.select().from(addresses).where(eq(addresses.id, addressId)).limit(1);
    if (!existingAddress) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Adresse avec l'ID ${addressId} non trouvée`);
    }
    if (existingAddress.userId !== user.id && user.role !== 'admin') {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'Vous n\'êtes pas autorisé à modifier cette adresse'
      );
    }

    const updatedAddress = await updateAddress(addressId, body);
    return NextResponse.json({ success: true, data: updatedAddress }, { status: 200 });
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

// DELETE : Supprimer une adresse
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  const resolvedParams = await params;
  const addressId = parseInt(resolvedParams.id, 10);

  try {
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, 'Utilisateur non authentifié');
    }

    if (isNaN(addressId) || addressId <= 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, 'ID d\'adresse invalide');
    }

    // Vérifier l'existence et les autorisations
    const [existingAddress] = await db.select().from(addresses).where(eq(addresses.id, addressId)).limit(1);
    if (!existingAddress) {
      throw new ServiceError(ERROR_CODES.NOT_FOUND, `Adresse avec l'ID ${addressId} non trouvée`);
    }
    if (existingAddress.userId !== user.id && user.role !== 'admin') {
      throw new ServiceError(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'Vous n\'êtes pas autorisé à supprimer cette adresse'
      );
    }

    const success = await deleteAddress(addressId);
    return NextResponse.json({ success: true, data: { message: 'Adresse supprimée avec succès' } }, { status: 200 });
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