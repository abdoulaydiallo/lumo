// navbar.tsx (Server Component)
import { cn } from "@/lib/utils";
import { NavbarProps, NavLink } from "./types";
import { SearchBar } from "./SearchBar";
import { UserActions } from "./UserActions";
import { MobileMenu } from "./MobileMenu";
import { auth } from "@/lib/auth";
import { getStoreByUserId } from "@/features/stores/api/queries";
import { Logo } from "./Logo";

export async function Navbar({ logo = "Lumo", className }: NavbarProps) {
  // Récupération de la session côté serveur
  const session = await auth();
  const store = session?.user?.id ? await getStoreByUserId(session.user.id) : null;

  // Fonction pour générer les liens (exécutée côté serveur)
  const getLinks = (): NavLink[] => {
    const baseLinks = [
      { href: "/", label: "Accueil" },
      { href: "/marketplace/stores", label: "Boutiques" },
      { href: "/marketplace/products", label: "Produits" },
    ];

    if (!session?.user) return baseLinks;

    const roleLinks: Record<string, NavLink[]> = {
      user: [
        { href: "/user/orders", label: "Commandes" },
        { href: "/user/support", label: "Support" },
      ],
      store: [
        {
          href: `/sellers`,
          label: "Ma Boutique",
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
      ...(roleLinks[userRole] || []).filter((link) => link.href !== ""),
    ];
  };

  const links = getLinks();

  return (
    <nav
      role="navigation"
      aria-label="Navigation principale"
      className={cn(
        "sticky top-0 z-50 bg-background/95 backdrop-blur border-b",
        className
      )}
    >
      <div className="px-2 md:px-4 flex items-center justify-between gap-3 py-4">
        <Logo title="Goulo" />
        <SearchBar className="flex-1 max-w-3xl" />
        <div className="flex items-center gap-2 md:gap-6">
          <UserActions
            className="flex items-center space-x-2"
          />
          <MobileMenu links={links} logo={<Logo title="Goulo"/>} />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
