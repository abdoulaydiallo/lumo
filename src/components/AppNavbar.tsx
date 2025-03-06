"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { ModeToggle } from "./ModeToogle";
import Link from "next/link";

export function AppNavbar() {
  return (
    <nav className="flex items-center justify-between p-4 border-b shadow">
      <Link href="/" className="text-xl font-bold">
        Marketplace
      </Link>
      <div className="flex item-center justify-center space-x-4">
        <UserAvatar />
        <ModeToggle />
      </div>
    </nav>
  );
}
