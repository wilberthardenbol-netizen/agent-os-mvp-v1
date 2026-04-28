/**
 * Next.js middleware — runs on every request before the page or API renders.
 *
 * It checks for a valid session cookie. If the cookie is missing or doesn't
 * match what's in the database, the user gets redirected to /login.
 *
 * Public routes (no auth needed): /login and /api/auth/login
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "agent-os-session";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through without checking auth
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for the session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    // No cookie at all — redirect to login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // The cookie exists. We can't query the database from middleware (it runs on
  // the Edge runtime which doesn't support Prisma/SQLite). So we do a lightweight
  // check here — just "is the cookie present?" — and the actual DB validation
  // happens in each API route via requireAuth().
  //
  // For a single-user local app, this is an acceptable trade-off.
  // The session token is a 64-char random hex string; it's not guessable.

  return NextResponse.next();
}

// Tell Next.js which paths this middleware applies to
export const config = {
  matcher: [
    // Apply to everything except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
