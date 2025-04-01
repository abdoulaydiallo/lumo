"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sun, Moon, Monitor, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import Link from "next/link";
import { useWishlist } from "@/features/wishlists/hooks/useWishlist"; // Import du hook wishlist
import { useCart } from "@/features/cart/hooks/useCart";

interface UserActionsProps {
  className?: string;
}

export function UserActions({ className }: UserActionsProps) {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  // Récupérer l'état de la wishlist pour l'utilisateur connecté
  const userId = session?.user ? Number(session.user.id) : 0;
  const { wishlist, isLoading } = useWishlist(userId);
  const { cart, isLoading: isCartLoading } = useCart(userId);

  // Vérifier si la wishlist contient des éléments
  const hasWishlistItems = wishlist?.items && wishlist.items.length > 0;
  const hasCartItems = cart?.items?.length > 0;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as
      | "light"
      | "dark"
      | "system"
      | null;
    const initialTheme = savedTheme || "system";
    setTheme(initialTheme);

    const applyTheme = (currentTheme: "light" | "dark" | "system") => {
      if (currentTheme === "system") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        document.documentElement.classList.toggle("dark", prefersDark);
      } else {
        document.documentElement.classList.toggle(
          "dark",
          currentTheme === "dark"
        );
      }
    };

    applyTheme(initialTheme);

    if (initialTheme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle("dark", e.matches);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      let newTheme: "light" | "dark" | "system";
      if (prev === "light") newTheme = "dark";
      else if (prev === "dark") newTheme = "system";
      else newTheme = "light";
      localStorage.setItem("theme", newTheme);
      if (newTheme === "system") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        document.documentElement.classList.toggle("dark", prefersDark);
      } else {
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      }
      return newTheme;
    });
  };



  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="hover:bg-muted/20 rounded-full"
        aria-label="Changer le thème"
      >
        {theme === "light" ? (
          <Sun className="h-4 w-4" />
        ) : theme === "dark" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Monitor className="h-4 w-4" />
        )}
      </Button>
      {session?.user ? (
        <>
          <Link
            href="/marketplace/wishlists"
            className="p-1.5 hover:bg-muted/20 rounded-full relative"
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                hasWishlistItems && !isLoading
                  ? "text-red-500 "
                  : "text-gray-500"
              }`}
            />
            {/* Badge avec le nombre d'éléments si wishlist non vide */}
            {hasWishlistItems && !isLoading && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {wishlist.items.length}
              </span>
            )}
          </Link>
          <Link
            href="/marketplace/cart"
            className="p-1.5 hover:bg-muted/20 rounded-full relative"
          >
            <ShoppingCart
              className={`h-5 w-5 transition-colors ${
                hasCartItems && !isCartLoading
                  ? "text-blue-500 fill-blue-500"
                  : "text-gray-500"
              }`}
            />
            {hasCartItems && !isCartLoading && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cart.items.length}
              </span>
            )}
          </Link>
          <Link href="/user/profile">
            <UserAvatar className="h-7 w-7" />
          </Link>
        </>
      ) : (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-full border-primary text-primary hover:bg-primary/10"
        >
          <Link href="/login">Connexion</Link>
        </Button>
      )}
    </div>
  );
}
