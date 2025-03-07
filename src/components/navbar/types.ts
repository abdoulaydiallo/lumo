import { JSX } from "react";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavbarProps {
  logo?: string | JSX.Element;
  className?: string;
}