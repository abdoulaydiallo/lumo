'use client';

import { useState, useMemo, useCallback, useEffect } from "react";
import { useCart } from "@/features/cart/hooks/useCart";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle, MapPin, CreditCard, Truck, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { CartItems } from "./CartItems";
import { OrderAddress } from "./OrderAddress";
import { OrderPayment } from "./OrderPayment";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/StepIndicator";
import { useOrders } from "../hooks/useOrders";
import { Address } from "@/services/addresses.service";
import { useDeliveryEstimation } from "@/features/delivery/hooks/useDeliveryEstimation";
import { DeliveryEstimation } from "./DeliveryEstimation";
import { OrderSummary } from "./OrderSummary";
import Link from "next/link";
import { DeliveryEstimate, OrderInsert, OrderItemInsert } from "@/services/orders.service";
import { useRouter } from "next/navigation";

type Step = 'cart' | 'delivery' | 'estimation' | 'payment' | 'summary';
type PaymentMethod = 'orange_money' | 'mobile_money' | 'cash_on_delivery';

interface WizardState {
  activeStep: Step;
  selectedAddress?: Address;
  paymentMethod: PaymentMethod | null;
  isLoading: boolean;
  isOrderSubmitted: boolean;
}

interface Promotion {
  productId: number;
  discountPercentage?: number;
}

interface CartItem {
  productId: number;
  quantity: number;
  variantPrice?: number;
  productPrice?: number;
}

export function OrderWizard() {
  const router = useRouter();
  const { data: session } = useSession();
  if (!session) return null;

  const userId = Number(session?.user?.id);

  const [discount, setDiscount] = useState(0);
  const [state, setState] = useState<WizardState>({
    activeStep: 'cart',
    selectedAddress: undefined,
    paymentMethod: null,
    isLoading: false,
    isOrderSubmitted: false,
  });

  const { cart, isLoading: isCartLoading, updateQuantity, removeFromCart, clearCart } = useCart(userId);
  const { createOrder, isCreating, getProductPromotions } = useOrders(userId);
  const { estimateDelivery, isEstimating, estimation, resetEstimation, useDeliveryOptions } = useDeliveryEstimation();

  const { deliveryOptions, isFetchingOptions } = useDeliveryOptions(state.selectedAddress?.id);

  const productIds = cart?.items?.map((item) => item.productId) || [];
  const promotionsQuery = getProductPromotions(productIds);
  const promotions = promotionsQuery.data || [];

  const { subtotal, deliveryFee, total } = useMemo(() => {
    const sub = cart?.items?.reduce((sum: number, item: any) => {
      const price = item.variantPrice ?? item.productPrice ?? 0;
      return sum + price * item.quantity;
    }, 0) || 0;
    const fee = estimation?.reduce((sum, est) => sum + est.fee, 0) || 0;
    const calculatedTotal = sub + fee - discount;
    return {
      subtotal: sub,
      deliveryFee: fee,
      total: Math.max(0, calculatedTotal),
    };
  }, [cart?.items, estimation, discount]);

  useEffect(() => {
    const disc = cart?.items?.reduce((sum: number, item: CartItem) => {
      const promo: Promotion | undefined = promotions.find((p) => p.productId === item.productId);
      if (promo && promo.discountPercentage) {
        const price: number = item.variantPrice ?? item.productPrice ?? 0;
        const itemDiscount: number = (price * item.quantity * promo.discountPercentage) / 100;
        return sum + itemDiscount;
      }
      return sum;
    }, 0) || 0;
    setDiscount(disc);
  }, [cart?.items, promotions]);

  const calculateDeliveryFee = useCallback(
    async (address: Address) => {
      if (!cart?.items?.length) return;
      try {
        estimateDelivery({ destinationAddressId: address.id });
      } catch (error) {
        console.error("Delivery estimation error:", error);
        toast.error("Échec de l'estimation de livraison");
      }
    },
    [cart?.items, estimateDelivery]
  );

  const handleNext = useCallback(async () => {
    console.log("handleNext called, current step:", state.activeStep, "paymentMethod:", state.paymentMethod); // Debug
    switch (state.activeStep) {
      case 'cart':
        if (cart?.items?.length) setState((prev) => ({ ...prev, activeStep: 'delivery' }));
        break;
      case 'delivery':
        if (state.selectedAddress) {
          await calculateDeliveryFee(state.selectedAddress);
          setState((prev) => ({ ...prev, activeStep: 'estimation' }));
        }
        break;
      case 'estimation':
        if (estimation?.length) setState((prev) => ({ ...prev, activeStep: 'payment' }));
        break;
      case 'payment':
        if (state.paymentMethod) {
          console.log("Moving to summary from payment"); // Debug
          setState((prev) => ({ ...prev, activeStep: 'summary' }));
        } else {
          console.log("Payment method not selected"); // Debug
          toast.error("Veuillez sélectionner une méthode de paiement");
        }
        break;
    }
  }, [state.activeStep, state.selectedAddress, state.paymentMethod, cart?.items, calculateDeliveryFee, estimation]);

  const handleBack = useCallback(() => {
    switch (state.activeStep) {
      case 'delivery':
        setState((prev) => ({ ...prev, activeStep: 'cart' }));
        break;
      case 'estimation':
        setState((prev) => ({ ...prev, activeStep: 'delivery' }));
        break;
      case 'payment':
        setState((prev) => ({ ...prev, activeStep: 'estimation' }));
        break;
      case 'summary':
        setState((prev) => ({ ...prev, activeStep: 'payment' }));
        break;
    }
  }, [state.activeStep]);

  const handlePaymentMethodSelect = useCallback((method: PaymentMethod) => {
    console.log("Payment method selected:", method); // Debug
    setState((prev) => ({
      ...prev,
      paymentMethod: method,
    }));
  }, []);

const handleSubmitOrder = useCallback(async () => {
  if (!state.paymentMethod || !state.selectedAddress || !cart?.items?.length || !estimation?.length) {
    toast.error("Veuillez compléter toutes les étapes");
    return;
  }

  setState((prev) => ({ ...prev, isLoading: true }));
  try {
    const orderData: OrderInsert = {
      userId,
      destinationAddressId: state.selectedAddress.id,
      paymentAmount: total,
      paymentMethod: state.paymentMethod,
    };

    const items: OrderItemInsert[] = cart.items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.variantPrice ?? item.productPrice ?? 0,
      variantId: item.variantId,
      storeId: item.storeId, // Assurez-vous que storeId est disponible dans cart.items
    }));

    const deliveryEstimates: DeliveryEstimate[] = estimation.map((est) => ({
      storeId: est.storeId, // Ajoutez storeId dans l'estimation si nécessaire
      fee: est.fee,
      deliveryType: est.breakdown.deliveryType || "STANDARD",
      estimatedDeliveryDays: est.breakdown.estimatedDeliveryDays,
    }));

    await createOrder({ orderData, items, deliveryEstimates });
    clearCart();
    resetEstimation();
    setState({
      activeStep: "cart",
      selectedAddress: undefined,
      paymentMethod: null,
      isLoading: false,
      isOrderSubmitted: true,
    });

    router.push("/marketplace/orders"); // Redirigez vers la page des commandes après la soumission
  } catch (error) {
    toast.error("Échec de la commande");
  } finally {
    setState((prev) => ({ ...prev, isLoading: false }));
  }
}, [
  state.paymentMethod,
  state.selectedAddress,
  cart?.items,
  estimation,
  userId,
  total,
  createOrder,
  clearCart,
  resetEstimation,
]);

  if (!userId) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-2">Veuillez vous connecter</h2>
          <p className="text-gray-600 mb-6">Pour accéder à votre panier et passer commande</p>
          <Link href="/login">
            <Button className="w-full" asChild>Se connecter</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="md:container mx-auto p-4 md:p-8">
      <div className="space-y-8 p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
          <StepIndicator
            label="Panier"
            active={state.activeStep === 'cart'}
            completed={!!cart?.items?.length && state.activeStep !== 'cart'}
            icon={<CheckCircle className="h-4 w-4" />}
          />
          <div className="h-px flex-1 bg-gray-200 mx-4" />
          <StepIndicator
            label="Livraison"
            active={state.activeStep === 'delivery'}
            completed={!!state.selectedAddress && ['estimation', 'payment', 'summary'].includes(state.activeStep)}
            icon={<MapPin className="h-4 w-4" />}
          />
          <div className="h-px flex-1 bg-gray-200 mx-4" />
          <StepIndicator
            label="Estimation"
            active={state.activeStep === 'estimation'}
            completed={!!estimation?.length && ['payment', 'summary'].includes(state.activeStep)}
            icon={<Truck className="h-4 w-4" />}
          />
          <div className="h-px flex-1 bg-gray-200 mx-4" />
          <StepIndicator
            label="Paiement"
            active={state.activeStep === 'payment'}
            completed={!!state.paymentMethod && state.activeStep === 'summary'}
            icon={<CreditCard className="h-4 w-4" />}
          />
          <div className="h-px flex-1 bg-gray-200 mx-4" />
          <StepIndicator
            label="Résumé"
            active={state.activeStep === 'summary'}
            icon={<ClipboardCheck className="h-4 w-4" />}
            completed={state.isOrderSubmitted}
          />
        </div>

        {state.activeStep === 'cart' && (
          <CartItems
            items={cart?.items || []}
            isLoading={isCartLoading || state.isLoading}
            subtotal={subtotal}
            onQuantityChange={(productId, delta) => {
              updateQuantity({ productId, quantity: delta });
              if (state.activeStep === 'estimation' && state.selectedAddress) {
                calculateDeliveryFee(state.selectedAddress);
              }
            }}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            isUpdating={false}
            isRemoving={false}
            isClearing={false}
          />
        )}
        {state.activeStep === 'delivery' && (
          <OrderAddress
            userId={userId}
            onSelect={(address: Address) => {
              setState((prev) => ({ ...prev, selectedAddress: address }));
            }}
          />
        )}
        {state.activeStep === 'estimation' && (
          <DeliveryEstimation
            isEstimating={isEstimating}
            estimation={estimation}
            estimationError={null}
            deliveryOptions={deliveryOptions}
            isFetchingOptions={isFetchingOptions}
          />
        )}
        {state.activeStep === 'payment' && (
          <OrderPayment onSelect={handlePaymentMethodSelect} />
        )}
        {state.activeStep === 'summary' && (
          <div className="space-y-6">
            <OrderSummary
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              discount={discount}
              estimationResult={estimation}
              selectedAddress={state.selectedAddress}
              paymentMethod={state.paymentMethod}
              isEstimating={isEstimating}
              isSubmitting={state.isLoading || isCreating}
              isDisabled={state.isLoading || isCreating || !cart?.items?.length}
              onSubmit={handleSubmitOrder}
            />
          </div>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={state.activeStep === 'cart'}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          {state.activeStep !== 'summary' ? (
            <Button
              onClick={handleNext}
              disabled={
                (state.activeStep === 'cart' && !cart?.items?.length) ||
                (state.activeStep === 'delivery' && !state.selectedAddress) ||
                (state.activeStep === 'estimation' && !estimation?.length) ||
                (state.activeStep === 'payment' && !state.paymentMethod)
              }
            >
              <span className="flex-1 text-center">Suivant</span>
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitOrder}
              disabled={state.isLoading || isCreating || !cart?.items?.length}
              className="w-full md:w-auto hidden"
            >
              Confirmer la commande
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}