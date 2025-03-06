import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./src/lib/auth";

// Forcer le runtime Node.js
export const runtime = "nodejs";

// Fonction pour créer un matcher de route
function createRouteMatcher(routes: string[]) {
  return (request: NextRequest) => {
    return routes.some((route) => {
      if (route.endsWith("(.*)")) {
        const baseRoute = route.slice(0, -4);
        return request.nextUrl.pathname.startsWith(baseRoute);
      }
      return request.nextUrl.pathname === route;
    });
  };
}

// Fonction pour rediriger
function redirect(request: NextRequest, destination: string) {
  return NextResponse.redirect(new URL(destination, request.url));
}

// Routes publiques accessibles sans authentification
const isPublicRoute = createRouteMatcher(["/", "/login", "/register", "/forgot-password", "/verify", "/reset-password"]);

// Routes réservées aux admins
const isAdminRoute = createRouteMatcher(["/dashboard", "/dashboard/(.*)"]);

// Middleware principal
export async function middleware(request: NextRequest) {
  // Récupérer la session via NextAuth
  const session = await auth();

  // Vérifier si l'utilisateur est authentifié
  const isAuthenticated = !!session?.user;

  // Si la route n'est pas publique et l'utilisateur n'est pas authentifié
  if (!isPublicRoute(request) && !isAuthenticated) {
    return redirect(request, "/login");
  }

  // Si la route est réservée aux admins
  if (isAdminRoute(request)) {
    const userRole = session?.user?.role;

    // Si l'utilisateur n'est pas admin, rediriger
    if (userRole !== "admin") {
      return redirect(request, "/marketplace");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webm|mp4|json)).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};