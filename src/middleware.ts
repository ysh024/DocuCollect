import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getMiddlewareJwtSecret(): Uint8Array {
  const configuredSecret = process.env.AUTH_SECRET;
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    const isBuildPhase =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.npm_lifecycle_event === "build" ||
      process.env.npm_lifecycle_event === "build:worker" ||
      process.env.CF_PAGES === "1" ||
      !process.env.DATABASE_URL;

    if (!isBuildPhase) {
      throw new Error("FATAL: AUTH_SECRET must be configured in production environment.");
    }
  }
  return new TextEncoder().encode(
    configuredSecret || "docucollect_dev_only_auth_secret_minimum_32_characters_for_local_env"
  );
}

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
      const jwtSecret = getMiddlewareJwtSecret();
      await jwtVerify(token, jwtSecret);
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
    const fullPath = pathname + (request.nextUrl.search || "");
    loginUrl.searchParams.set("redirect", fullPath);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute) {
    // If user explicitly visited with logout, switch, or session reason, clear cookies and allow login page
    if (
      request.nextUrl.searchParams.has("switch") ||
      request.nextUrl.searchParams.has("logout") ||
      request.nextUrl.searchParams.has("reason") ||
      request.nextUrl.searchParams.has("auth_error")
    ) {
      const response = NextResponse.next();
      response.cookies.delete(SESSION_COOKIE);
      response.cookies.delete("better-auth.session_token");
      response.cookies.delete("better-auth_session_token");
      return response;
    }

    if (isValidSession) {
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      const targetPath = redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("/login") ? redirectParam : "/dashboard";
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
  }

  const response = NextResponse.next();
  // Standard defensive security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.neon.tech https://*.amazonaws.com https://lh3.googleusercontent.com; connect-src 'self' https://*.neon.tech https://accounts.google.com; frame-ancestors 'self';"
  );
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
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
