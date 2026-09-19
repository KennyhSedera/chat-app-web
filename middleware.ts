import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verify } from "./app/dev/utils/hashage";

const SESSION_COOKIE = "session";

const PROTECTED_ROUTES = ["/dashboard", "/profile", "/settings"];
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawCookie = request.cookies.get(SESSION_COOKIE)?.value;

  // On vérifie la signature ici aussi (le middleware tourne sur Edge Runtime,
  // crypto.createHmac fonctionne bien avec le runtime "nodejs" configuré plus bas)
  const userId = rawCookie ? verify(rawCookie) : null;
  const isAuthenticated = userId !== null;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Cas 1 : pas connecté et essaie d'accéder à une route protégée
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname); // pour rediriger après login
    return NextResponse.redirect(loginUrl);
  }

  // Cas 2 : déjà connecté et essaie d'aller sur /login ou /register
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/settings/:path*", "/login", "/register", "/"],
  runtime: "nodejs", // nécessaire pour utiliser le module "crypto" dans le middleware
};