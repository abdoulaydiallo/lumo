"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, User2, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useStoreLayout } from "@/features/store/hooks/useStoreLayout";
import { User, Notification } from "@/features/store/types";

export default function Navbar({
  user,
  notifications,
}: {
  user: User;
  notifications: Notification[] | undefined;
}) {
  const { markNotificationsAsRead } = useStoreLayout({
    initialData: {
      user,
      notifications: notifications ?? [],
      stores: [],
      orders: { inProgress: 0, completed: 0, total: 0 },
      products: { total: 0 },
      drivers: { total: 0 },
      supportTickets: { total: 0 },
      promotions: { total: 0 },
      reports: { total: 0 },
    },
  });
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const pageTitles: { [key: string]: string } = {
    "/": "Accueil",
    "/products": "Produits",
    "/orders": "Commandes",
    "/drivers": "Livreurs",
    "/finances": "Finances",
    "/support": "Support",
    "/reports": "Rapports",
  };

  const currentPage = pageTitles[pathname] || "Tableau de bord";

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const unreadCount = (notifications ?? []).filter(
    (n) => n.status === "unread"
  ).length; // Sécurité avec ?? []

  return (
    <nav className="sticky top-0 w-full p-4 border-b bg-white dark:bg-gray-800 flex items-center justify-between z-40">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Link href="#">
          <div className="text-lg font-bold text-orange-500">Goulo</div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell
                className="h-5 w-5 text-gray-600 dark:text-gray-300"
                aria-label="Notifications"
              />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex justify-between items-center">
              Notifications
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markNotificationsAsRead()}
                >
                  Marquer tout comme lu
                </Button>
              )}
            </DropdownMenuLabel>
            {(notifications ?? []).map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={cn(
                  "flex flex-col items-start",
                  notif.status === "unread" && "bg-orange-50"
                )}
              >
                <span className="text-sm">{notif.message}</span>
                <span className="text-xs text-gray-500">
                  {notif.createdAt ? notif.createdAt.toLocaleTimeString() : "N/A"}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={handleThemeToggle}>
          {isDarkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 border rounded-full p-2 border-orange-500 text-orange-500 hover:bg-orange-50">
              <User2 className="h-4 w-4 rounded-full" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/profile">Profil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Paramètres</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500">
              <LogOut className="h-4 w-4 mr-2" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
