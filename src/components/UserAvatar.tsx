"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";

type UserRole = "user" | "store" | "driver" | "admin" | "manager";

function getInitials(name: string | null | undefined): string {
  return name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";
}

/**
 * UserAvatar avec hydratation corrigée et badge lisible.
 * @param {Object} props - Propriétés du composant.
 * @param {string} [props.className] - Classes supplémentaires.
 * @returns {JSX.Element} - Avatar avec menu déroulant.
 */
export function UserAvatar({ className }: { className?: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // S'assurer que le composant est monté côté client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || status === "loading") {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  if (!session?.user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/login")}
        className={cn("h-8 rounded-md", className)}
      >
        Se connecter
      </Button>
    );
  }

  const user = session.user;
  const initials = getInitials(user.name);
  const role = user.role as UserRole;

  const avatarVariants = {
    rest: { rotate: 0 },
    hover: { rotate: 360, transition: { duration: 0.5, ease: "easeInOut" } },
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <motion.div
          variants={avatarVariants}
          initial="rest"
          whileHover="hover"
          className="relative cursor-pointer"
        >
          <Avatar
            className={cn(
              "h-12 w-12 border-2 border-primary/20 transition-all duration-300 hover:border-primary",
              className
            )}
          >
            <AvatarImage
              src={user.image || ""}
              alt={user.name || "Utilisateur"}
            />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 p-2 shadow-xl rounded-xl bg-background/95 backdrop-blur border border-muted animate-in fade-in-80"
      >
        <DropdownMenuLabel className="p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage
                src={user.image || ""}
                alt={user.name || "Utilisateur"}
              />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold truncate">
                {user.name || "Utilisateur"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
              <Badge variant="outline" className="w-fit text-xs capitalize">
                {role}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-muted/20" />
        <DropdownMenuItem
          asChild
          className="w-full text-sm font-medium cursor-pointer hover:bg-muted/80 rounded-md transition-all duration-200"
        >
          <Link href="/account">Profil</Link>
        </DropdownMenuItem>
        {role === "admin" && (
          <DropdownMenuItem
            asChild
            className="w-full text-sm font-medium cursor-pointer hover:bg-muted/80 rounded-md transition-all duration-200"
          >
            <Link href="/dashboard">Tableau de bord</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-muted/20" />
        <DropdownMenuItem
          className="w-full text-sm font-medium text-destructive cursor-pointer hover:bg-destructive/10 rounded-md transition-all duration-200"
          onClick={() => signOut()}
        >
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
