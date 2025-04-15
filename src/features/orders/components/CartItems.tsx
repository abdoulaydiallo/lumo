'use client';
import { ShoppingCart, Trash2, Plus, Minus, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CartItem {
  id: number;
  productId: number;
  productName?: string;
  productImage?: string;
  variantId?: number;
  variantType?: string;
  variantValue?: string;
  variantPrice?: number;
  productPrice?: number;
  quantity: number;
}

interface CartItemsProps {
  items: CartItem[];
  isLoading: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
  isClearing: boolean;
  subtotal: number;
  onQuantityChange: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
}

export function CartItems({
  items,
  isLoading,
  isUpdating,
  isRemoving,
  isClearing,
  onQuantityChange,
  onRemoveItem,
  onClearCart}: CartItemsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="w-32 h-8 mx-auto mb-4" />
          <Skeleton className="w-48 h-4 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!items?.length) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Votre panier est vide</p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/marketplace/products">Parcourir les produits</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Votre Panier ({items.length})</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            disabled={isClearing}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Vider
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Produit</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.id}-${item.variantId || 'base'}`}>
                <TableCell className="flex items-center gap-3">
                  <div className="w-12 h-12 relative rounded-md overflow-hidden">
                    <Image
                      src={item.productImage  || "/placeholder-image.jpg"}
                      alt={item.productName || "Produit sans nom"}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{item.productName || "Produit sans nom"}</p>
                    {item.variantValue && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {item.variantType}: {item.variantValue}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {(item.variantPrice ?? item.productPrice ?? 0).toLocaleString('fr-FR')} GNF
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {((item.variantPrice ?? item.productPrice ?? 0) * item.quantity).toLocaleString('fr-FR')} GNF
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.productId)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardContent className="flex justify-end">
      </CardContent>
    </Card>
  );
}