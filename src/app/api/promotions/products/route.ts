import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import orderService from "@/services/orders.service";
import { ServiceError, ERROR_CODES } from "@/services/orders.errors";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<ServiceError["toJSON"]> };

// Interface pour la réponse de l'API
interface ProductPromotion {
  productId: number;
  discountPercentage: number;
  promotionId: number;
  startDate: Date;
  endDate: Date;
  isExpired: boolean;
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<ProductPromotion[]>>> {
  try {
    // Vérification de l'utilisateur authentifié
    const user = await getUser();
    if (!user) {
      throw new ServiceError(ERROR_CODES.AUTHORIZATION_ERROR, "Utilisateur non authentifié");
    }

    // Récupération et validation du corps de la requête
    const body = await req.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, "productIds doit être un tableau non vide");
    }

    // Validation des productIds
    for (const id of productIds) {
      if (typeof id !== "number" || id <= 0) {
        throw new ServiceError(ERROR_CODES.VALIDATION_ERROR, `productId invalide: ${id}`);
      }
    }

    // Appel au service pour récupérer les promotions
    const promotions = await orderService.getProductPromotions(productIds);

    const formattedPromotions: ProductPromotion[] = promotions.map((promotion: any) => ({
      productId: promotion.productId ?? 0,
      discountPercentage: parseFloat(promotion.discountPercentage),
      promotionId: promotion.promotionId,
      startDate: new Date(promotion.startDate),
      endDate: new Date(promotion.endDate),
      isExpired: new Date(promotion.endDate) < new Date(),
    }));

    return NextResponse.json({ success: true, data: formattedPromotions }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.toJSON() }, { status: 400 });
    }
    const internalError = new ServiceError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Erreur serveur inattendue",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
    return NextResponse.json({ success: false, error: internalError.toJSON() }, { status: 500 });
  }
}