import { NextRequest, NextResponse } from "next/server";
import { storeOrderService } from "@/services/storeOrders.service";
import { getUser } from "@/lib/auth";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storeOrderId: string }> }
) {
  try {
    // 1. Résolution des paramètres dynamiques
    const { storeOrderId } = await params;
    const orderId = parseInt(storeOrderId);
    
    if (isNaN(orderId)) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "ID de commande invalide");
    }

    // 2. Authentification
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }

    // 3. Lecture et validation du corps
    const { status } = await request.json();
    if (!status) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "Le statut est requis");
    }

    // 4. Appel du service
    await storeOrderService.updateStoreOrderStatus(orderId, status, user.id);

    // 5. Réponse réussie
    return NextResponse.json(
      { 
        success: true, 
        data: { 
          id: orderId,
          status,
          updatedAt: new Date().toISOString() 
        }
      },
      { status: 200 }
    );

  } catch (error) {
    // 6. Gestion d'erreurs
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: error.code,
            message: error.message,
            details: error.details || null
          }
        },
        { status:  400 }
      );
    }

    console.error(`PATCH /store-orders/[storeOrderId]/status Error:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: "Erreur interne du serveur",
          details: process.env.NODE_ENV === "development" ? error instanceof Error ? error.message : String(error) : null
        }
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";