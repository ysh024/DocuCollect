import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "docucollect-neon-secure-auth-secret-key-2026-min-32-chars"
);

const SESSION_COOKIE_NAME = "docucollect_session";
const OTP_EXPIRY_MINUTES = 10;

export interface SessionPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: "owner" | "admin" | "staff";
}

// =====================================================================
// OTP UTILITIES
// =====================================================================

/**
 * Generate a 6-digit OTP and return both the plaintext code and its hash
 */
export function generateOtp(): { code: string; codeHash: string } {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  return { code, codeHash };
}

/**
 * Hash an OTP code for DB lookup
 */
export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * Store OTP in database (replaces any previous OTPs for the email)
 */
export async function storeOtp(email: string, codeHash: string, purpose: "login" | "signup" = "login"): Promise<void> {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Invalidate previous OTPs for this email
  await sql`
    UPDATE public.otp_codes 
    SET used_at = now() 
    WHERE email = ${normalizedEmail} AND used_at IS NULL AND expires_at > now();
  `;

  // Insert new OTP
  await sql`
    INSERT INTO public.otp_codes (email, code_hash, purpose, expires_at)
    VALUES (${normalizedEmail}, ${codeHash}, ${purpose}, ${expiresAt});
  `;
}

/**
 * Verify OTP code — returns true and marks used if valid
 */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;

  const normalizedEmail = email.toLowerCase().trim();
  const codeHash = hashOtp(code);

  const results = await sql`
    SELECT id FROM public.otp_codes
    WHERE email = ${normalizedEmail}
      AND code_hash = ${codeHash}
      AND used_at IS NULL
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  if (results.length === 0) return false;

  // Mark as used
  await sql`UPDATE public.otp_codes SET used_at = now() WHERE id = ${results[0].id};`;
  return true;
}

// =====================================================================
// SESSION UTILITIES
// =====================================================================

/**
 * Sign JWT session token (30-day expiry)
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/**
 * Verify JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set HTTP-Only Session Cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

const verifiedUserCache = new Map<string, number>();
const VERIFICATION_CACHE_TTL = 300000; // 5 minutes

/**
 * Get current session user from cookie.
 * Supports both DocuCollect JWT sessions and Neon Better Auth sessions (Google OAuth).
 * Enforces strict verification: unverified users cannot enter dashboard.
 */
export const getSession = cache(async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();

    // 1. Check primary JWT session cookie
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const verified = await verifySessionToken(token);
      if (verified) {
        // Fast path: if verified within 5 minutes, skip database query
        const lastVerifiedTime = verifiedUserCache.get(verified.userId);
        if (lastVerifiedTime && Date.now() - lastVerifiedTime < VERIFICATION_CACHE_TTL) {
          return verified;
        }

        const sql = getDb();
        if (sql) {
          const userRows = await sql`
            SELECT email_verified, is_deactivated FROM public.users WHERE id::text = ${verified.userId} LIMIT 1;
          `;
          if (userRows.length > 0 && (!userRows[0].email_verified || userRows[0].is_deactivated)) {
            return null; // Unverified or deactivated users cannot enter dashboard
          }
          verifiedUserCache.set(verified.userId, Date.now());
        }
        return verified;
      }
    }

    // 2. Check Neon Better Auth session token (e.g. from Google OAuth)
    const betterAuthToken =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("better-auth_session_token")?.value;

    if (betterAuthToken) {
      const sql = getDb();
      if (sql) {
        const sessions = await sql`
          SELECT s.*, u.id as better_user_id, u.email as better_email, u.name as better_name,
                 u."emailVerified" as email_verified_camel, u.email_verified as email_verified_snake
          FROM public."session" s
          JOIN public."user" u ON s."userId" = u.id OR s.user_id = u.id
          WHERE s.token = ${betterAuthToken}
            AND (s."expiresAt" > now() OR s.expires_at > now())
          LIMIT 1;
        `;

        if (sessions.length > 0) {
          const s = sessions[0] as any;
          const isVerified = Boolean(s.email_verified_camel || s.email_verified_snake);

          // Strict verification guard: unverified users cannot enter dashboard
          if (!isVerified) {
            return null;
          }

          // Look up or auto-provision workspace in app users table
          let appUsers = await sql`
            SELECT id, organization_id, email, role, email_verified, is_deactivated
            FROM public.users
            WHERE email = ${s.better_email} OR id = ${s.better_user_id}
            LIMIT 1;
          `;

          if (appUsers.length > 0 && appUsers[0].is_deactivated) {
            return null; // Deactivated accounts blocked from dashboard
          }

          if (appUsers.length === 0) {
            const orgName = (s.better_name || s.better_email.split("@")[0]) + " Firm";
            const slug =
              orgName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40) +
              "-" +
              Date.now().toString().slice(-4);

            const orgs = await sql`
              INSERT INTO public.organizations (name, slug)
              VALUES (${orgName}, ${slug})
              RETURNING id;
            `;
            const orgId = orgs[0].id;

            appUsers = await sql`
              INSERT INTO public.users (id, organization_id, full_name, email, role, email_verified, last_login_at)
              VALUES (${s.better_user_id}, ${orgId}, ${s.better_name || s.better_email.split("@")[0]}, ${s.better_email}, 'owner', true, now())
              RETURNING id, organization_id, email, role, email_verified;
            `;

            const freePlans = await sql`SELECT id FROM public.plans WHERE name = 'free_trial' LIMIT 1;`;
            if (freePlans.length > 0) {
              await sql`
                INSERT INTO public.subscriptions (organization_id, plan_id, status, trial_ends_at)
                VALUES (${orgId}, ${freePlans[0].id}, 'trial', (now() + interval '30 days'))
                ON CONFLICT (organization_id) DO NOTHING;
              `;
            }
          }

          const appUser = appUsers[0] as any;
          return {
            userId: appUser.id,
            organizationId: appUser.organization_id,
            email: appUser.email,
            role: appUser.role,
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
});

/**
 * Require a valid session — throws if not authenticated
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

/**
 * Logout / clear session cookie
 */
export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get full user profile with organization and subscription details
 * Returns null if not authenticated — NO FALLBACKS
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.userId) return null;

  const sql = getDb();
  if (!sql) return null;

  try {
    const users = await sql`
      SELECT 
        u.id, u.email, u.full_name, u.role, u.organization_id, u.phone, u.email_verified, u.last_login_at,
        o.name as organization_name, o.branding_color, o.logo_url, o.settings,
        s.status as subscription_status, s.trial_ends_at,
        p.name as plan_name, p.display_name as plan_display_name, p.file_retention_days,
        p.max_clients, p.max_cases_per_client, p.max_storage_mb
      FROM public.users u
      LEFT JOIN public.organizations o ON u.organization_id = o.id
      LEFT JOIN public.subscriptions s ON s.organization_id = o.id
      LEFT JOIN public.plans p ON s.plan_id = p.id
      WHERE u.id::text = ${session.userId}
      LIMIT 1;
    `;

    if (users.length === 0) return null;
    const u = users[0] as any;

    return {
      id: u.id,
      email: u.email,
      fullName: u.full_name || u.email.split("@")[0],
      role: u.role || "owner",
      phone: u.phone || "",
      emailVerified: u.email_verified || false,
      organizationId: u.organization_id,
      organizationName: u.organization_name || "Your Organization",
      logoUrl: u.logo_url
        ? (u.logo_url.startsWith("logos/") ? `/api/logo/${u.organization_id}` : u.logo_url)
        : null,
      brandingColor: u.branding_color || "#171717",
      subscription: {
        status: u.subscription_status || "trial",
        trialEndsAt: u.trial_ends_at,
        planName: u.plan_name || "free_trial",
        planDisplayName: u.plan_display_name || "Free Trial",
        fileRetentionDays: u.file_retention_days || 7,
        maxClients: u.max_clients || 10,
        maxCasesPerClient: u.max_cases_per_client || 5,
        maxStorageMb: u.max_storage_mb || 500,
      },
    };
  } catch (err) {
    console.error("Error getting current user:", err);
    return null;
  }
}
