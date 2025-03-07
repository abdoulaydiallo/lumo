"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export function Cart() {
  const [items, setItems] = useState<CartItem[]>([
    { id: "1", name: "Produit A", price: 19.99, quantity: 2 },
    { id: "2", name: "Produit B", price: 29.99, quantity: 1 },
  ]);

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 ">
      <h1 className="text-xl font-bold mb-4">Panier</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Votre panier est vide.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border-b py-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} x {item.price.toFixed(2)} €
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm font-medium">Total :</p>
            <p className="text-lg font-bold">{total.toFixed(2)} €</p>
          </div>
          <Button className="w-full mt-4 rounded-full">
            Passer la commande
          </Button>
        </>
      )}
    </div>
  );
}
