"use client";

import { useState, useEffect, JSX } from "react";
import { cn } from "@/lib/utils";
import { Menu, X, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import { motion } from "framer-motion";

/**
 * Props pour le composant Navbar.
 */
interface NavbarProps {
  logo?: string | JSX.Element;
  links: { href: string; label: string; role?: string }[];
  className?: string;
}

/**
 * Navbar avec prise en charge de light, dark, et system pour le mode sombre.
 * @param {NavbarProps} props - Propriétés du composant.
 * @returns {JSX.Element} - Barre de navigation.
 */
export function Navbar({
  logo = "Marketplace",
  links,
  className,
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [isMounted, setIsMounted] = useState(false);

  // Synchroniser le thème après montage
  useEffect(() => {
    setIsMounted(true);

    // Charger la préférence sauvegardée ou défaut à "system"
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

    // Écouter les changements système si theme est "system"
    if (initialTheme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle("dark", e.matches);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Mettre à jour le thème et synchroniser
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

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
          document.documentElement.classList.toggle("dark", e.matches);
        };
        mediaQuery.addEventListener("change", handleChange);
        return newTheme;
      } else {
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      }

      return newTheme;
    });
  };

  const menuVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  if (!isMounted) {
    return (
      <nav
        className={cn(
          "sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm",
          className
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-extrabold text-primary tracking-tight"
          >
            {logo}
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm",
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-extrabold text-primary tracking-tight transition-all duration-200 hover:text-primary/80 hover:scale-105"
        >
          {logo}
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm font-semibold text-foreground transition-all duration-300 hover:text-primary group"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center space-x-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hover:bg-muted/80 rounded-full transition-all duration-300 hover:scale-110"
          >
            {theme === "light" ? (
              <Sun className="h-5 w-5" />
            ) : theme === "dark" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
          </Button>
          <UserAvatar />
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-muted/80 rounded-full"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Ouvrir le menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[280px] sm:w-[340px] bg-background/95 backdrop-blur p-0"
          >
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={menuVariants}
              className="flex flex-col h-full"
            >
              <div className="px-6 pt-6 pb-4 border-b border-muted/20">
                <Link
                  href="/"
                  className="text-2xl font-extrabold text-primary tracking-tight"
                  onClick={() => setIsOpen(false)}
                >
                  {logo}
                </Link>
              </div>

              <div className="flex-1 px-6 py-4 space-y-4">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-base font-medium text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-3 py-2 transition-all duration-200"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-muted/20 space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="w-full justify-start text-base font-medium hover:bg-muted/80 rounded-md px-3 py-2 transition-all duration-200"
                >
                  {theme === "light" ? (
                    <>
                      <Sun className="h-5 w-5 mr-2" />
                      Mode clair
                    </>
                  ) : theme === "dark" ? (
                    <>
                      <Moon className="h-5 w-5 mr-2" />
                      Mode sombre
                    </>
                  ) : (
                    <>
                      <Monitor className="h-5 w-5 mr-2" />
                      Mode système
                    </>
                  )}
                </Button>
                <div className="flex justify-center">
                  <UserAvatar className="h-10 w-10" />
                </div>
              </div>
            </motion.div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

export default Navbar;
