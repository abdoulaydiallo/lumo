"use client";

import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { NavbarProps, NavLink } from "./types";
import { SearchBar } from "./SearchBar";
import { NavLinks } from "./NavLinks";
import { UserActions } from "./UserActions";
import { MobileMenu } from "./MobileMenu";
import { useStore } from "@/features/stores/hooks/use-store";

export function Navbar({ logo = "Marketplace", className }: NavbarProps) {
  const { data: session, status } = useSession();
  
  
  const getLinks = (): NavLink[] => {
    const baseLinks = [
      { href: "/", label: "Accueil" },
      { href: "/marketplace/stores", label: "Boutiques" },
      { href: "/marketplace/products", label: "Produits" },
    ];
    
    if (!session?.user) return baseLinks;
    const { data: store, isLoading, error } = useStore(session?.user.id);
    if (!store) return baseLinks;

    const roleLinks: Record<string, NavLink[]> = {
      user: [
        { href: "/user/orders", label: "Commandes" },
        { href: "/user/support", label: "Support" },
      ],
      store: [
        {
          href: `/marketplace/stores/${store.id || ""}`,
          label: "Ma Boutique",
        },
        {
          href: `/marketplace/stores/${store.id || ""}/settings`,
          label: "Paramètres",
        },
        {
          href: `/marketplace/stores/${store.id || ""}/analytics`,
          label: "Analytiques",
        },
        {
          href: `/marketplace/stores/${store.id || ""}/orders`,
          label: "Commandes",
        },
      ],
      driver: [
        {
          href: `/logistics/drivers/${session.user.id || ""}`,
          label: "Livraisons",
        },
        { href: "/logistics/shipments", label: "Expéditions" },
      ],
      manager: [
        { href: "/logistics/drivers", label: "Livreurs" },
        { href: "/logistics/reports", label: "Rapports" },
      ],
      admin: [
        { href: "/admin/dashboard", label: "Dashboard" },
        { href: "/admin/reports", label: "Rapports" },
        { href: "/admin/audit", label: "Audit" },
        { href: "/admin/roles", label: "Rôles" },
      ],
    };

    const userRole = session.user.role as keyof typeof roleLinks;
    return [
      ...baseLinks,
      ...(roleLinks[userRole] || []).filter((link) => link.href !== ""), // Filtrer les liens invalides
    ];
  };

  if (status === "loading") {
    return (
      <nav
        className={cn(
          "sticky top-0 z-50 bg-background/95 backdrop-blur border-b",
          className
        )}
      >
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-primary">
            {logo}
          </Link>
        </div>
      </nav>
    );
  }

  const links = getLinks();

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 bg-background/95 backdrop-blur border-b",
        className
      )}
    >
      <div className="">
        {/* Ligne principale */}
        <div className="container mx-auto px-4 flex items-center justify-between gap-3 py-2">
          <Link
            href="/"
            className="text-lg font-bold text-primary hover:text-primary/90 transition-colors"
          >
            {logo}
          </Link>
          <SearchBar className="flex-1 max-w-3xl hidden md:block" />
          <UserActions className=" items-center space-x-2 hidden md:flex" />
          <MobileMenu links={links} logo={logo} />
        </div>

        {/* Liens sous la recherche */}
        <NavLinks
          links={links}
          className="hidden lg:flex justify-center space-x-6 mt-1"
        />
      </div>
    </nav>
  );
}

export default Navbar;
