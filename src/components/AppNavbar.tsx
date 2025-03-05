"use client";

import { UserAvatar } from "@/components/UserAvatar";
import Link from "next/link";

export function AppNavbar() {
  return (
    <nav className="flex items-center justify-between p-4 border-b shadow">
      <Link href="/" className="text-xl font-bold">
        Marketplace
      </Link>
      <UserAvatar />
    </nav>
  );
}
