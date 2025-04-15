"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import Link from "next/link";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { NavLink } from "./types";
import { NavLinks } from "./NavLinks";
import { JSX } from "react";

interface MobileMenuProps {
  links: NavLink[];
  logo: string | JSX.Element;
}

export function MobileMenu({ links, logo }: MobileMenuProps) {
  const { data: session } = useSession();

  const menuVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden hover:bg-muted/20"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[260px] p-0 bg-background/95 backdrop-blur"
      >
        <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={menuVariants}
          className="flex flex-col h-full"
        >
          {/* En-tête */}
          <div className="px-3 py-2 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold text-primary">
              {logo}
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3 py-2 space-y-1">
            <NavLinks links={links} className="space-y-1" />
          </div>

          {/* Actions utilisateur */}
          <div className="px-3 py-2 space-y-1">
            {session?.user ? (
              <>
                <div className="text-red-500" onClick={() => signOut()}>
                  Déconnexion
                </div>
              </>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full rounded-full border-primary text-primary hover:bg-primary/10"
              >
                <Link href="/auth/login">Connexion</Link>
              </Button>
            )}
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
