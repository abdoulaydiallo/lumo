export { auth as middleware } from "@/auth";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Si pas de session, rediriger vers /login
  if (!session || !session.user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const userRole = session.user.role as "user" | "store" | "driver" | "admin" | "manager";

  // Règles d'accès par rôle
  const roleAccess: Record<string, string[]> = {
    "/dashboard/store": ["store"],
    "/dashboard/driver": ["driver"],
    "/dashboard/admin": ["admin", "manager"],
    "/marketplace": ["user", "store", "driver", "admin", "manager"], // Accessible à tous
  };

  // Vérifier l'accès
  for (const [path, allowedRoles] of Object.entries(roleAccess)) {
    if (pathname.startsWith(path)) {
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/marketplace"],
};