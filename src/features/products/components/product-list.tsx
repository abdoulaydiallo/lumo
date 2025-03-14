import { memo } from "react";
import ProductCard from "./product-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductListProps {
  products: any[];
}

function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucun produit disponible.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product as any} storeId={product.storeId!} />
      ))}
    </div>
  );
}

export default memo(
  ProductList,
  (prevProps, nextProps) =>
    prevProps.products === nextProps.products
);
