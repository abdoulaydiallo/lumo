"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sun, Moon, Monitor, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import Link from "next/link";

interface UserActionsProps {
  className?: string;
}

export function UserActions({ className }: UserActionsProps) {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

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
            href="/user/wishlists"
            className="p-1.5 hover:bg-muted/20 rounded-full"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="p-1.5 hover:bg-muted/20 rounded-full"
          >
            <ShoppingCart className="h-5 w-5" />
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
