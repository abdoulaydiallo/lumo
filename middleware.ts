// app/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./src/lib/auth";
import { db } from "./src/lib/db";
import { stores } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

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
const isPublicRoute = createRouteMatcher([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/verify",
  "/reset-password",
  "/marketplace/stores/create", // Ajouté pour permettre la création
]);

// Routes réservées aux admins
const isAdminRoute = createRouteMatcher(["/dashboard", "/dashboard/(.*)"]);

// Routes nécessitant une boutique pour "store"
const requiresStoreRoute = createRouteMatcher(["/marketplace/stores", "/marketplace/stores/(.*)"]);

export async function middleware(request: NextRequest) {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  const { pathname } = request.nextUrl;

  // Routes publiques
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Si pas authentifié, rediriger vers login
  if (!isAuthenticated) {
    return redirect(request, "/login");
  }

  // Vérification pour rôle "store"
  if (session.user.role === "store" && requiresStoreRoute(request)) {
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.userId, Number(session.user.id)));

    if (!store) {
      // Si pas de boutique, rediriger vers la création
      return redirect(request, "/marketplace/stores/create");
    }
  }

  // Routes admin
  if (isAdminRoute(request) && session.user.role !== "admin") {
    return redirect(request, "/marketplace");
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