"use client";

import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Truck,
  DollarSign,
  HelpCircle,
  BarChart,
  Percent,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "./TeamSwitcher";
import { NavMain } from "./MainNav";
import { NavUser } from "./NavUser";
import { SettingsNav } from "./NavSettings";
import { User, Store, StoreLayoutData } from "@/features/store/types";

export default function AppSidebar({
  user,
  stores,
  layoutData,
}: {
  user: User;
  stores: Store[];
  layoutData: StoreLayoutData;
}) {
  const pathname = usePathname();

  const navMainItems = [
    {
      title: "Accueil",
      url: "/sellers/overview",
      icon: <Home className="h-4 w-4" />,
      isActive: pathname === "/sellers/overview",
    },
    {
      title: "Produits",
      url: "/sellers/products",
      icon: <Package className="h-4 w-4" />,
      count: layoutData.products.total,
    },
    {
      title: "Commandes",
      url: "/sellers/orders",
      icon: <Truck className="h-4 w-4" />,
      count: layoutData.orders.inProgress + layoutData.orders.completed,
    },
    {
      title: "Livreurs",
      url: "/sellers/drivers",
      icon: <Truck className="h-4 w-4" />,
      count: layoutData.drivers.total,
    },
    {
      title: "Finances",
      url: "/sellers/finances",
      icon: <DollarSign className="h-4 w-4" />,
      count: layoutData.orders.completed,
    },
    {
      title: "Support",
      url: "/sellers/support",
      icon: <HelpCircle className="h-4 w-4" />,
      count: layoutData.supportTickets.total,
    },
    {
      title: "Promotions",
      url: "/sellers/promotions",
      icon: <Percent className="h-4 w-4" />,
      count: layoutData.promotions.total,
    },
    {
      title: "Rapports",
      url: "/sellers/reports",
      icon: <BarChart className="h-4 w-4" />,
      count: layoutData.reports.total,
    },
  ];

  const settingsNavItems = [
    {
      title: "Profil",
      url: "/sellers/profile",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Paramètres",
      url: "/sellers/settings",
      icon: <DollarSign className="h-4 w-4" />,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r bg-white">
      <SidebarHeader>
        <TeamSwitcher teams={stores} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <SettingsNav items={settingsNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
