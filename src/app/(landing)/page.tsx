"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Truck,
  Smartphone,
  Store,
  ChevronDown,
  Facebook,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";
import { useProducts } from "@/features/products/hooks/use-products";
import LoadingSkeleton from "../marketplace/products/components/loading-skeleton";

// Product interface from previous message
export interface Product {
  id: number;
  storeId: number;
  name: string;
  description: string | null;
  price: number;
  weight: number;
  stockStatus: string;
  createdAt: Date;
  updatedAt: Date | null;
  images: { id: number; imageUrl: string; productId: number }[];
  variants: { id: number; variantType: string; variantValue: string; price: number; stock: number; productId: number }[];
  categories: { id: number; name: string }[];
  promotions: { id: number; promotionId: number; productId: number; discountPercentage: number }[];
  stock?: { id: number; stockLevel: number; reservedStock: number; availableStock: number; productId: number };
  popularity: number;
  rating: number | null;
  relevanceScore?: number;
}

// Interface for FAQs
interface FAQ {
  question: string;
  answer: string;
}

// Static FAQ data
const faqs: FAQ[] = [
  {
    question: "Comment fonctionne Goulo ?",
    answer:
      "Goulo connecte acheteurs, vendeurs et chauffeurs à Conakry. Achetez, vendez ou livrez en un clic.",
  },
  {
    question: "Quels sont les frais de livraison ?",
    answer:
      "Les frais commencent à 3,000 GNF et varient selon la distance et le poids.",
  },
  {
    question: "Comment puis-je vendre sur Goulo ?",
    answer:
      "Inscrivez-vous, créez votre boutique en quelques minutes et listez vos produits.",
  },
];

// Mock store names (since storeId needs a join with stores table)
const mockStoreNames: Record<number, string> = {
  1: "Agro Conakry",
  2: "Mode Guinée",
  3: "Artisanal Conakry",
};

// Client Component for product carousel
function ProductCarousel() {
  const { data, isLoading } = useProducts(
    {
      sortBy: "popularity",
      inStock: true,
      searchTerm: "",
    },
    { limit: 8, page: 1 }
  );

  const [scrollPosition, setScrollPosition] = useState(0);

  const handlePrev = () => {
    setScrollPosition((prev) => Math.max(prev - 260, 0));
  };

  const handleNext = () => {
    setScrollPosition((prev) => Math.min(prev + 260, ((data?.products.length || 1) - 1) * 260));
  };

  const handleAddToCart = (button: HTMLButtonElement) => {
    button.textContent = "Ajouté !";
    setTimeout(() => {
      button.textContent = "Ajouter au panier";
    }, 1000);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const products = data?.products || [];

  return (
    <div className="relative w-full">
      <ScrollArea className="w-full">
        <div
          className="flex snap-x snap-mandatory space-x-4 py-4"
          style={{ transform: `translateX(-${scrollPosition}px)`, transition: "transform 0.3s ease" }}
        >
          {products.map((product: Product) => {
            const originalPrice = product.promotions[0]?.discountPercentage
              ? product.price / (1 - product.promotions[0].discountPercentage / 100)
              : product.price;
            return (
              <Card
                key={product.id}
                className="snap-center flex-shrink-0 w-60 sm:w-64 bg-background border-border hover:shadow-md transition-all duration-200"
              >
                <CardContent className="p-4">
                  <img
                    src={product.images[0]?.imageUrl || "/placeholder-image.jpg"}
                    alt={product.name}
                    className="w-full h-40 object-contain rounded-md mb-4"
                  />
                  <h4 className="text-lg font-semibold truncate text-foreground">{product.name}</h4>
                  <p className="text-muted-foreground">
                    {product.price.toLocaleString()} GNF{" "}
                    {product.promotions[0]?.discountPercentage && (
                      <span className="line-through text-sm">
                        {Math.round(originalPrice).toLocaleString()} GNF
                      </span>
                    )}
                  </p>
                  
                  <Button
                    className="w-full mt-2 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 transform hover:scale-105 transition-all"
                    onClick={(e) => handleAddToCart(e.currentTarget)}
                  >
                    Ajouter au panier
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      <Button
        variant="outline"
        size="icon"
        className="absolute top-1/2 left-0 transform -translate-y-1/2 bg-background border-border hover:bg-muted hidden sm:block"
        onClick={handlePrev}
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-background border-border hover:bg-muted hidden sm:block"
        onClick={handleNext}
      >
        <ChevronRight className="h-4 w-4 text-foreground" />
      </Button>
    </div>
  );
}

// Main Server Component
export default function LandingPage() {
  return (
    <div className="font-sans bg-background text-foreground min-h-screen">
      {/* Hero Section */}
      <section id="home" className="bg-gradient-to-r from-background to-muted py-24 sm:py-40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Bienvenue sur Goulo
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 max-w-2xl mx-auto text-muted-foreground">
            La marketplace qui connecte Conakry : achetez, vendez, livrez en un clic !
          </p>
          <Button
            asChild
            className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 px-6 py-3 text-base sm:text-lg transform hover:scale-105 transition-all"
          >
            <Link href="/marketplace/products">Découvrir les produits</Link>
          </Button>
        </div>
      </section>

      <Separator className="bg-border" />

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 tracking-tight">
            Pourquoi Goulo ?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <Card className="text-center bg-background border-border hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <Search className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500 mb-4 mx-auto" />
                <h4 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">
                  Recherche Intuitive
                </h4>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Trouvez instantanément des produits locaux, comme des vêtements ou des appareils divers.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center bg-background border-border hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <Truck className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500 mb-4 mx-auto" />
                <h4 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">
                  Livraison Abordable
                </h4>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Frais dès 10,000 GNF, rapides à Conakry.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center bg-background border-border hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <Smartphone className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500 mb-4 mx-auto" />
                <h4 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">
                  Paiements Locaux
                </h4>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Payez avec Orange Money ou autres méthodes sécurisées.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center bg-background border-border hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <Store className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500 mb-4 mx-auto" />
                <h4 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">
                  Soutien PME
                </h4>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Aidez les boutiques locales à prospérer.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Separator className="bg-border" />

      {/* Product Carousel */}
      <section id="shop" className="py-12 sm:py-16 bg-muted">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 tracking-tight">
            Produits Populaires
          </h3>
          <ProductCarousel />
        </div>
      </section>

      <Separator className="bg-border" />

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 tracking-tight">
            Ce Que Nos Utilisateurs Disent
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="bg-background border-border hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <p className="italic text-muted-foreground text-sm sm:text-base mb-4">
                  "Goulo m&apos;a permis d&apos;acheter un smartphone en quelques clics, livré le même jour !"
                </p>
                <p className="font-semibold text-sm sm:text-base text-foreground">
                  Aminata K., Cliente
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background border-border hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <p className="italic text-muted-foreground text-sm sm:text-base mb-4">
                  "Ma boutique vend plus grâce à Goulo. L&apos;inscription était simple et rapide."
                </p>
                <p className="font-semibold text-sm sm:text-base text-foreground">
                  Mamadou D., Vendeur
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background border-border hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <p className="italic text-muted-foreground text-sm sm:text-base mb-4">
                  "Je livre avec Goulo et j&apos;aime la flexibilité. Les paiements sont rapides !"
                </p>
                <p className="font-semibold text-sm sm:text-base text-foreground">
                  Ibrahima S., Chauffeur
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Separator className="bg-border" />

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 bg-muted">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 tracking-tight">
            Questions Fréquentes
          </h3>
          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <Collapsible
                key={index}
                className="bg-background border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
                  <h4 className="text-lg sm:text-xl font-semibold text-foreground">
                    {faq.question}
                  </h4>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 pt-0">
                  <p className="text-muted-foreground text-sm sm:text-base">{faq.answer}</p>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-border" />

      {/* CTA Section */}
      <section className="bg-orange-500 text-white py-12 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight">
            Rejoignez Goulo Aujourd&apos;hui
          </h3>
          <p className="text-base sm:text-lg mb-6 max-w-2xl mx-auto">
            Inscrivez-vous pour acheter, vendre ou livrer avec la marketplace de Conakry !
          </p>
          <Button
            className="bg-background text-orange-500 hover:bg-muted dark:bg-muted dark:hover:bg-background px-6 py-3 text-base sm:text-lg transform hover:scale-105 transition-all"
          >
            S&apos;inscrire Maintenant
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-foreground text-background py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="mb-4 text-sm sm:text-base">© 2025 Goulo. Tous droits réservés.</p>
          <div className="flex justify-center space-x-4">
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-500 transition-colors"
            >
              <Facebook className="h-5 w-5" />
            </Link>
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-500 transition-colors"
            >
              <Instagram className="h-5 w-5" />
            </Link>
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-500 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}