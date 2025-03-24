"use client";

import { cn } from "@/lib/utils";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { JSX } from "react";

interface SettingsNavItem {
  title: string;
  url?: string;
  icon?: JSX.Element;
  isActive?: boolean;
}

export function SettingsNav({ items }: { items: SettingsNavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Paramètres</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild>
              <Link
                href={item.url ?? "#"}
                className={cn(
                  "flex items-center gap-2 transition-colors duration-200",
                  item.isActive &&
                    "bg-orange-500 text-white hover:bg-orange-600"
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
