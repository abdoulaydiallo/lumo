import Link from "next/link";
import { NavLink } from "./types";

interface NavLinksProps {
  links: NavLink[];
  className?: string;
}

export function NavLinks({ links, className }: NavLinksProps) {
  return (
    <div className={`${className} flex flex-col items-center py-1 md:flex-row gap-2 justify-start md:justify-center border-t mt-2`}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
