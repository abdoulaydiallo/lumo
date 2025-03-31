import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import orderService, { ValidPaymentStatus } from "@/services/orders.service";
import { ServiceError } from "@/services/orders.errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Résolution des paramètres (nouvelle approche)
    const resolvedParams = await params;
    const orderId = Number(resolvedParams.id);

    // Validation de l'ID
    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: "ID de commande invalide" },
        { status: 400 }
      );
    }

    // Authentification
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    // Vérification des droits admin
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Action réservée aux administrateurs" },
        { status: 403 }
      );
    }

    // Extraction des données
    const { status, transactionId } = await request.json();

    // Validation des données
    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "Statut de paiement invalide ou manquant" },
        { status: 400 }
      );
    }

    if (transactionId && typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "transactionId doit être une chaîne" },
        { status: 400 }
      );
    }

    // Mise à jour du statut
    const result = await orderService.updatePaymentStatus(
      orderId,
      status as ValidPaymentStatus,
      transactionId,
      user.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });

  } catch (error) {
    console.error("Erreur dans PATCH /orders/[id]/payment:", error);
    
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: {
          code: "INTERNAL_ERROR",
          message: "Erreur serveur inattendue",
          details: error instanceof Error ? error.message : "Erreur inconnue"
        }
      },
      { status: 500 }
    );
  }
}