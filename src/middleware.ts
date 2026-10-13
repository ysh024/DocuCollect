import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const configuredSecret = process.env.AUTH_SECRET;
if (!configuredSecret && process.env.NODE_ENV === "production") {
  throw new Error("FATAL: AUTH_SECRET must be configured in production environment.");
}
const JWT_SECRET = new TextEncoder().encode(
  configuredSecret || "docucollect_dev_only_auth_secret_minimum_32_characters_for_local_env"
);

const SESSION_COOKIE = "docucollect_session";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard"];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ["/login", "/signup", "/auth"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const betterAuthToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("better-auth_session_token")?.value;

  // Always allow /auth/callback to process OAuth session sync
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Verify token validity
  let isValidSession = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isValidSession = true;
    } catch {
      isValidSession = false;
    }
  } else if (betterAuthToken && betterAuthToken.length >= 32) {
    isValidSession = true;
  }

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !isValidSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isValidSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();
  // Standard security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/auth/:path*",
  ],
};
