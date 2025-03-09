// @/features/products/components/product-list.tsx
import { Product } from "@/features/products/api/types";
import ProductCard from "./product-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductListProps {
  products: Product[];
  storeId: number;
}

export default function ProductList({ products, storeId }: ProductListProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aucun produit disponible pour cette boutique.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} storeId={storeId} />
        ))}
      </div>
    </div>
  );
}
