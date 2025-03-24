"use client";

import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { JSX } from "react";

interface NavItem {
  title: string;
  url?: string;
  icon?: JSX.Element;
  isActive?: boolean;
  count?: number;
  items?: { title: string; url: string; count?: number }[];
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              {item.items ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "flex items-center justify-between w-full transition-colors duration-200",
                        item.isActive &&
                          "bg-orange-500 text-white hover:bg-orange-600"
                      )}
                      aria-label={item.title}
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.title}</span>
                        {item.count && item.count > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {item.count}
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-in-out data-[state=closed]:h-0 data-[state=open]:h-auto">
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link
                              href={subItem.url}
                              className={cn(
                                "flex items-center gap-2 transition-colors duration-200"
                              )}
                            >
                              <span>{subItem.title}</span>
                              {subItem.count && subItem.count > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                  {subItem.count}
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : (
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
                    {item.count && item.count > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {item.count}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
