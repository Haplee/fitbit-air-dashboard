import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";
const SESSION_COOKIE = "fitbit_air_session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/health/ping", "/api/cron/google-sync", "/api/google/callback"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return NextResponse.next();
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico" || pathname === "/robots.txt") return NextResponse.next();

  const valid = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (valid) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
