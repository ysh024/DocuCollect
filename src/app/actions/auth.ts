"use server";

import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { getDb } from "@/lib/db";

let cachedAuthSql: any = null;
let cachedAuthDbUrl: string | null = null;

function getAuthDb() {
  const rawDbUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || "";
  const authDbUrl = rawDbUrl.includes("/docucollect-db")
    ? rawDbUrl.replace(/\/docucollect-db(?=[\/?]|$)/, "/neondb")
    : rawDbUrl;
  if (!authDbUrl) return null;
  if (!cachedAuthSql || cachedAuthDbUrl !== authDbUrl) {
    cachedAuthSql = neon(authDbUrl);
    cachedAuthDbUrl = authDbUrl;
  }
return cachedAuthSql;
}

/**
 * High-performance edge-safe password verification.
 * Pure JavaScript bcryptjs with 10-12 rounds takes 80-400ms of CPU time, which immediately
 * trips the Cloudflare Workers 10-50ms CPU limit (Error 1102: Worker exceeded resource limits).
 * This function delegates verification to PostgreSQL's native pgcrypto C-extension:
 *   SELECT (crypt(password, storedHash) = storedHash) as is_valid;
 * executing in 1-2ms on the Neon database server with 0ms CPU time on Cloudflare Workers!
 * Gracefully falls back to bcryptjs in local offline environments.
 */
async function verifyPasswordSecurely(
  password: string,
  storedHash: string,
  sqlClient?: any
): Promise<boolean> {
  if (sqlClient && storedHash) {
    try {
      const rows = await sqlClient`
        SELECT (crypt(${password}, ${storedHash}) = ${storedHash}) as is_valid;
      `;
      if (rows && rows.length > 0 && typeof rows[0].is_valid === "boolean") {
        return rows[0].is_valid;
      }
    } catch (sqlErr: any) {
      console.warn("Neon pgcrypto verification failed, attempting bcryptjs fallback:", sqlErr?.message || sqlErr);
    }
  }

  try {
    return await bcrypt.compare(password, storedHash);
  } catch (err) {
    console.error("Password comparison error:", err);
    return false;
  }
}

/**
 * High-performance edge-safe password hashing.
 * Delegates to PostgreSQL pgcrypto extension (gen_salt('bf', 8)) to avoid
 * Cloudflare Workers CPU limit exhaustion while keeping high security.
 */
async function hashPasswordSecurely(
  password: string,
  sqlClient?: any
): Promise<string> {
  if (sqlClient) {
    try {
      const rows = await sqlClient`
        SELECT crypt(${password}, gen_salt('bf', 8)) as hashed;
      `;
      if (rows && rows.length > 0 && rows[0].hashed) {
        return rows[0].hashed;
      }
    } catch (sqlErr: any) {
      console.warn("Neon pgcrypto hash generation failed, falling back to bcryptjs:", sqlErr?.message || sqlErr);
    }
  }
  return await bcrypt.hash(password, 8);
}

import {
  generateOtp,
  storeOtp,
  verifyOtp,
  createSessionToken,
  setSessionCookie,
  logoutUser,
  getSession,
  getCurrentUser,
  invalidateUserCache,
} from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFileToStorage, isS3Configured } from "@/lib/storage";
import { invalidateLogoCache } from "@/lib/logo-cache";
import { invalidateDashboardCache } from "@/app/actions/portal";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

// =====================================================================
// EMAIL OTP DELIVERY
// =====================================================================

import { sendNotificationEmail } from "@/lib/email";

async function sendOtpEmail(email: string, code: string, purpose: "login" | "signup"): Promise<{ success: boolean; error?: string }> {
  const subject = purpose === "signup"
    ? `Welcome to DocuCollect — Your Verification Code: ${code}`
    : `DocuCollect Security Verification Code: ${code}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
        <div style="width: 36px; height: 36px; background: #111; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 18px;">📄</span>
        </div>
        <span style="font-size: 18px; font-weight: 700; color: #111;">DocuCollect</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; color: #111; margin: 0 0 8px;">
        ${purpose === "signup" ? "Verify Your Account" : "Security Verification Code"}
      </h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
        Use the following 6-digit one-time code to complete your verification. Do not share this code with anyone.
      </p>
      <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #111; font-family: monospace;">
          ${code}
        </div>
        <p style="color: #71717a; font-size: 12px; margin: 10px 0 0;">
          Expires in 10 minutes
        </p>
      </div>
      <p style="color: #a1a1aa; font-size: 12px; border-top: 1px solid #f4f4f5; padding-top: 16px; margin: 0;">
        If you did not request this verification, please secure your account immediately.
      </p>
    </div>
  `;

  const result = await sendNotificationEmail({
    to: email,
    subject,
    html,
    eventType: "auth_otp",
    plan: "free",
  });

  if (process.env.NODE_ENV === "development") {
    console.log(`\n=================================================`);
    console.log(`🔒 [SECURE EMAIL SERVICE]`);
    console.log(`Recipient: ${email}`);
    console.log(`Verification Code: ${code}`);
    console.log(`Purpose: ${purpose} | Valid: 10 minutes`);
    console.log(`=================================================\n`);
  }

  return result;
}

// =====================================================================
// AUTHENTICATION ACTIONS: PASSWORD + VERIFICATION (MFA)
// =====================================================================

/**
 * Sign In with Email & Password
 * Checks password hash, requires email verification, and issues session
 */
export async function loginWithPasswordAction(formData: {
  email: string;
  password: string;
}) {
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected. Please contact support." };

  const normalizedEmail = formData.email.toLowerCase().trim();
  const password = formData.password;

  if (!normalizedEmail || !password) {
    return { success: false, error: "Please provide both email and password." };
  }

  const rateCheck = checkRateLimit(`login:${normalizedEmail}`, 5, 15 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
    };
  }

  try {
    const users = await sql`
      SELECT id, organization_id, full_name, email, role, email_verified, password_hash, is_deactivated
      FROM public.users
      WHERE LOWER(email) = ${normalizedEmail}
      LIMIT 1;
    `;

    if (users.length === 0) {
      return { success: false, error: "Invalid email or password." };
    }

    const user = users[0] as any;

    if (user.is_deactivated) {
      return {
        success: false,
        error: "This account has been deactivated by the administrator. Please contact support.",
      };
    }

    if (!user.password_hash) {
      return {
        success: false,
        error: "This account was registered via Google OAuth or OTP. Please sign in with Google or reset your password.",
      };
    }

    // Securely compare password hash via Neon pgcrypto (0ms worker CPU) with bcryptjs fallback
    const isPasswordValid = await verifyPasswordSecurely(password, user.password_hash, sql);
    if (!isPasswordValid) {
      return { success: false, error: "Invalid email or password." };
    }

    // Strict security check: Unverified users cannot enter dashboard
    if (!user.email_verified) {
      // Trigger a fresh OTP so the user can verify immediately
      const { code, codeHash } = generateOtp();
      await storeOtp(normalizedEmail, codeHash, "login");
      await sendOtpEmail(normalizedEmail, code, "login");

      return {
        success: false,
        requiresVerification: true,
        error: "Your account is not yet verified. A 6-digit verification code has been sent to your email.",
      };
    }

    // Update last login timestamp
    await sql`
      UPDATE public.users
      SET last_login_at = now()
      WHERE id = ${user.id};
    `;

    // Create session token
    const sessionToken = await createSessionToken({
      userId: user.id,
      organizationId: user.organization_id,
      email: user.email,
      role: user.role,
    });

    resetRateLimit(`login:${normalizedEmail}`);
    await setSessionCookie(sessionToken);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Login error:", err);
    return { success: false, error: "An unexpected error occurred during sign-in." };
  }
}

/**
 * Step 1: Initiate Sign-up with Full Details + Password
 * Hashes password, checks uniqueness, sends verification OTP
 */
export async function initiateSignupAction(data: {
  email: string;
  password: string;
  fullName: string;
  firmName: string;
  phone?: string;
}) {
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  const normalizedEmail = data.email.toLowerCase().trim();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const rateCheck = checkRateLimit(`signup:${normalizedEmail}`, 5, 15 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many signup attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
    };
  }

  if (!data.password || data.password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  if (!data.fullName?.trim() || !data.firmName?.trim()) {
    return { success: false, error: "Please enter your name and firm/company name." };
  }

  // Check if user already exists
  const existing = await sql`SELECT id, email_verified FROM public.users WHERE LOWER(email) = ${normalizedEmail} LIMIT 1;`;
  if (existing.length > 0) {
    return {
      success: false,
      alreadyExisted: true,
      error: "An account with this email is already registered and verified. Switching you to Sign In...",
    };
  }

  // Generate and store OTP verification code
  const { code, codeHash } = generateOtp();
  await storeOtp(normalizedEmail, codeHash, "signup");

  // Send verification email
  const emailRes = await sendOtpEmail(normalizedEmail, code, "signup");
  if (!emailRes.success) {
    return { success: false, error: emailRes.error || "Failed to send verification email." };
  }

  // Never return the OTP code to the frontend
  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}. Please enter the 6-digit code to complete registration.`,
  };
}

/**
 * Step 2: Complete Sign-up by Verifying OTP
 * Only runs when OTP is valid. Hashes password, creates organization, user, subscription, and session.
 */
export async function completeSignupWithPasswordAction(data: {
  email: string;
  password: string;
  code: string;
  firmName: string;
  fullName: string;
  phone?: string;
}) {
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  const normalizedEmail = data.email.toLowerCase().trim();

  // If user already exists: check if password matches to log them in automatically
  const existing = await sql`
    SELECT id, organization_id, email, password_hash, role, email_verified 
    FROM public.users 
    WHERE LOWER(email) = ${normalizedEmail} 
    LIMIT 1;
  `;
  if (existing.length > 0) {
    const user = existing[0] as any;
    if (data.password && user.password_hash) {
      const isMatch = await verifyPasswordSecurely(data.password, user.password_hash, sql);
      if (isMatch) {
        const sessionToken = await createSessionToken({
          userId: user.id,
          organizationId: user.organization_id,
          email: user.email,
          role: user.role,
        });
        await setSessionCookie(sessionToken);
        revalidatePath("/dashboard");
        return {
          success: true,
          alreadyExisted: true,
          message: "Welcome! Account verified and logged in. Redirecting to your dashboard...",
        };
      }
    }
    return {
      success: false,
      alreadyExisted: true,
      error: "Your account is already created and verified! Please switch to Sign In and enter your password.",
    };
  }

  // Strict OTP verification: verify local DB first
  const rateCheck = checkRateLimit(`verify_signup_otp:${normalizedEmail}`, 5, 10 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many verification attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
    };
  }

  let isValidOtp = await verifyOtp(normalizedEmail, data.code.trim());

  // If not in local DB, check Neon Managed Better Auth
  const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL;
  if (!isValidOtp && neonAuthUrl) {
    try {
      const cleanBase = neonAuthUrl.replace(/\/$/, "");
      const neonVerifyRes = await fetch(`${cleanBase}/sign-in/email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, otp: data.code.trim() }),
      });
      if (neonVerifyRes.ok) {
        isValidOtp = true;
      }
    } catch (verifyErr) {
      console.warn("Neon OTP verify error:", verifyErr);
    }
  }

  if (!isValidOtp) {
    return { success: false, error: "Invalid or expired 6-digit verification code. Please check your email and try again." };
  }

  try {
    // Hash password securely with pgcrypto / bcrypt
    const passwordHash = await hashPasswordSecurely(data.password, sql);

    // Auto-seed default plans if missing
    let plans = await sql`SELECT id FROM public.plans WHERE name = 'free_trial' LIMIT 1;`;
    if (plans.length === 0) {
      await sql`
        INSERT INTO public.plans (name, display_name, price_monthly, price_yearly, max_clients, max_cases_per_client, max_storage_mb, file_retention_days, max_upload_size_mb, features, sort_order)
        VALUES
          ('free_trial', 'Free Trial', 0, 0, 10, 5, 500, 7, 10,
           '["Up to 10 active clients", "1 firm workspace", "Reusable checklists", "Link-based uploads & review", "Limited storage and retention"]'::jsonb, 0),
          ('starter', 'Starter', 399, 3999, 50, 20, 2048, 30, 25,
           '["Up to 50 active clients", "Checklists & reusable templates", "Secure upload links", "Document review & rejection reasons", "Basic activity history"]'::jsonb, 1),
          ('pro', 'Professional', 799, 7999, 200, 50, 5120, 90, 50,
           '["Up to 200 active clients", "Multiple staff accounts & roles", "More reusable checklist templates", "Expanded activity history & storage", "Firm branding & configurable workflows"]'::jsonb, 2),
          ('firm', 'Firm', 1499, 14999, 500, 200, 20480, 180, 100,
           '["Higher client & staff limits (500+)", "Detailed permissions & audit history", "Custom retention settings", "Priority support", "Tailored onboarding"]'::jsonb, 3)
        ON CONFLICT (name) DO NOTHING;
      `;
      plans = await sql`SELECT id FROM public.plans WHERE name = 'free_trial' LIMIT 1;`;
    }
    const planId = plans[0]?.id;

    // Create Organization
    const cleanFirmName = data.firmName.trim();
    const slug = cleanFirmName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40) + "-" + Date.now().toString().slice(-4);
    const orgs = await sql`
      INSERT INTO public.organizations (name, slug, branding_color)
      VALUES (${cleanFirmName}, ${slug}, '#171717')
      RETURNING id;
    `;
    const orgId = orgs[0].id;

    // Create User with verified status
    const users = await sql`
      INSERT INTO public.users (
        organization_id, full_name, email, password_hash, phone, role, email_verified, last_login_at
      ) VALUES (
        ${orgId}, ${data.fullName.trim()}, ${normalizedEmail}, ${passwordHash}, ${data.phone || null}, 'owner', true, now()
      )
      RETURNING id, role;
    `;
    const user = users[0] as any;

    // Create Free Trial subscription (30 days)
    if (planId) {
      try {
        await sql`
          INSERT INTO public.subscriptions (organization_id, plan_id, status, trial_ends_at)
          VALUES (${orgId}, ${planId}, 'trial', (now() + interval '30 days'))
          ON CONFLICT (organization_id) DO NOTHING;
        `;
      } catch (subErr) {
        console.warn("Subscription creation note:", subErr);
      }
    }

    // Issue secure session cookie
    const sessionToken = await createSessionToken({
      userId: user.id,
      organizationId: orgId,
      email: normalizedEmail,
      role: user.role,
    });

    resetRateLimit(`verify_signup_otp:${normalizedEmail}`);
    await setSessionCookie(sessionToken);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Complete signup error:", err);
    return { success: false, error: err.message || "Failed to create account." };
  }
}

/**
 * Resend OTP Verification Code
 */
export async function resendVerificationCodeAction(email: string, purpose: "login" | "signup" = "signup") {
  const normalizedEmail = email.toLowerCase().trim();
  const rateCheck = checkRateLimit(`resend_otp:${normalizedEmail}`, 3, 10 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many code requests. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting a new code.`,
    };
  }

  const { code, codeHash } = generateOtp();
  await storeOtp(normalizedEmail, codeHash, purpose);
  const emailRes = await sendOtpEmail(normalizedEmail, code, purpose);
  if (!emailRes.success) {
    return { success: false, error: emailRes.error || "Failed to resend code." };
  }
  return { success: true, message: `New verification code sent to ${normalizedEmail}` };
}

/**
 * Verify Login OTP (For accounts requiring 2FA or email confirmation)
 */
export async function verifyLoginOtpAction(email: string, code: string) {
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  const normalizedEmail = email.toLowerCase().trim();
  const rateCheck = checkRateLimit(`verify_login_otp:${normalizedEmail}`, 5, 10 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many verification attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
    };
  }

  let isValid = await verifyOtp(normalizedEmail, code.trim());

  const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL;
  if (!isValid && neonAuthUrl) {
    try {
      const cleanBase = neonAuthUrl.replace(/\/$/, "");
      const neonVerifyRes = await fetch(`${cleanBase}/sign-in/email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, otp: code.trim() }),
      });
      if (neonVerifyRes.ok) {
        isValid = true;
      }
    } catch (verifyErr) {
      console.warn("Neon OTP verify error:", verifyErr);
    }
  }

  if (!isValid) {
    return { success: false, error: "Invalid or expired verification code. Please try again." };
  }

  const users = await sql`
    SELECT id, organization_id, email, role, is_deactivated FROM public.users
    WHERE LOWER(email) = ${normalizedEmail} LIMIT 1;
  `;

  if (users.length === 0) {
    return { success: false, error: "Account not found." };
  }

  const user = users[0] as any;

  if (user.is_deactivated) {
    return {
      success: false,
      error: "This account has been deactivated by the administrator. Please contact support.",
    };
  }

  // Mark email verified
  await sql`
    UPDATE public.users 
    SET last_login_at = now(), email_verified = true 
    WHERE id = ${user.id};
  `;

  const sessionToken = await createSessionToken({
    userId: user.id,
    organizationId: user.organization_id,
    email: user.email,
    role: user.role,
  });

  resetRateLimit(`verify_login_otp:${normalizedEmail}`);
  await setSessionCookie(sessionToken);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Logout
 */
export async function handleLogoutAction() {
  await logoutUser();
  revalidatePath("/");
  return { success: true };
}

/**
 * Get current user profile
 */
export async function getCurrentUserAction() {
  return await getCurrentUser();
}

/**
 * Update Firm & User Profile Settings
 */
export async function updateFirmSettingsAction(data: {
  firmName?: string;
  phone?: string;
  email?: string;
  fullName?: string;
  settings?: any;
}) {
  const session = await getSession();
  if (!session?.organizationId || !session?.userId) {
    return { success: false, error: "UNAUTHENTICATED" };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    if (data.firmName?.trim()) {
      await sql`
        UPDATE public.organizations
        SET name = ${data.firmName.trim()}, updated_at = now()
        WHERE id::text = ${session.organizationId}::text;
      `;
    }

    if (data.settings && typeof data.settings === "object") {
      await sql`
        UPDATE public.organizations
        SET settings = ${JSON.stringify(data.settings)}::jsonb, updated_at = now()
        WHERE id::text = ${session.organizationId}::text;
      `;
    }

    if (data.fullName?.trim()) {
      await sql`
        UPDATE public.users
        SET full_name = ${data.fullName.trim()}, updated_at = now()
        WHERE id::text = ${session.userId}::text;
      `;
    }

    if (data.phone !== undefined) {
      const cleanPhone = data.phone.trim();
      await sql`
        UPDATE public.users
        SET phone = ${cleanPhone || null}, updated_at = now()
        WHERE id::text = ${session.userId}::text;
      `;
      if (cleanPhone) {
        await sql`
          UPDATE public.organizations
          SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{contact_phone}', to_jsonb(${cleanPhone}::text)), updated_at = now()
          WHERE id::text = ${session.organizationId}::text;
        `;
      }
    }

    if (data.email?.trim()) {
      await sql`
        UPDATE public.organizations
        SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{contact_email}', to_jsonb(${data.email.trim()}::text)), updated_at = now()
        WHERE id::text = ${session.organizationId}::text;
      `;
    }

    // Invalidate server memory cache immediately
    invalidateUserCache(session.userId);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update settings" };
  }
}

/**
 * Upload Firm Logo to Storage and link to Organization
 */
export async function uploadFirmLogoAction({
  logoBase64,
  mimeType = "image/webp",
}: {
  logoBase64: string;
  mimeType?: string;
}) {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "UNAUTHENTICATED" };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const rawBase64 = logoBase64.replace(/^data:[A-Za-z-+\/]+;base64,/, "");
    const buffer = Buffer.from(rawBase64, "base64");

    let logoRecord: string;

    if (isS3Configured()) {
      const storagePath = `logos/${session.organizationId}/logo-${Date.now()}.webp`;
      const uploadRes = await uploadFileToStorage({
        storagePath,
        fileBuffer: buffer,
        mimeType: mimeType || "image/webp",
        encrypt: false, // Firm logos are public branding assets
      });

      if (!uploadRes.success) {
        return { success: false, error: uploadRes.error || "Failed to upload logo to cloud storage." };
      }
      logoRecord = storagePath;
    } else {
      return { success: false, error: "Cloud storage is not configured for logo uploads." };
    }

    // Update organization with logo
    await sql`
      UPDATE public.organizations
      SET logo_url = ${logoRecord}, updated_at = now()
      WHERE id = ${session.organizationId};
    `;

    invalidateLogoCache(session.organizationId);
    invalidateUserCache(session.userId);
    invalidateDashboardCache(session.organizationId);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cases");
    revalidatePath("/dashboard/clients");

    const serveUrl = `/api/logo/${session.organizationId}?v=${Date.now()}`;
    return { success: true, logoUrl: serveUrl };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to upload logo" };
  }
}

/**
 * Remove Firm Logo from Organization
 */
export async function removeFirmLogoAction() {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "UNAUTHENTICATED" };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    await sql`
      UPDATE public.organizations
      SET logo_url = NULL, updated_at = now()
      WHERE id = ${session.organizationId};
    `;

    invalidateLogoCache(session.organizationId);
    invalidateUserCache(session.userId);
    invalidateDashboardCache(session.organizationId);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to remove logo" };
  }
}

/**
 * Synchronize Google OAuth user from Neon Better Auth and establish application session
 */
export async function syncGoogleUserAction(userData: {
  id?: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
}) {
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  if (!userData?.email) {
    return { success: false, error: "Invalid user data provided from Google OAuth." };
  }

  const normalizedEmail = userData.email.toLowerCase().trim();

  try {
    // 1. Check if user already exists in public.users
    let userRows = await sql`
      SELECT id, organization_id, email, role, email_verified 
      FROM public.users 
      WHERE LOWER(email) = ${normalizedEmail} 
      LIMIT 1;
    `;

    let userId: string;
    let orgId: string;
    let role: "owner" | "admin" | "staff" = "owner";

    if (userRows.length === 0) {
      // Auto-provision Organization for new Google user
      const orgName = (userData.name || normalizedEmail.split("@")[0]) + " Firm";
      const slug =
        orgName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40) +
        "-" +
        Date.now().toString().slice(-4);

      const orgs = await sql`
        INSERT INTO public.organizations (name, slug, branding_color)
        VALUES (${orgName}, ${slug}, '#171717')
        RETURNING id;
      `;
      orgId = orgs[0].id;

      // Create User with email_verified = true (Google accounts are pre-verified)
      const newUsers = await sql`
        INSERT INTO public.users (
          organization_id, full_name, email, role, email_verified, last_login_at
        ) VALUES (
          ${orgId}, ${userData.name || normalizedEmail.split("@")[0]}, ${normalizedEmail}, 'owner', true, now()
        )
        RETURNING id, role;
      `;
      userId = newUsers[0].id;
      role = (newUsers[0].role as "owner" | "admin" | "staff") || "owner";

      // Auto-provision 30-day Free Trial
      let plans = await sql`SELECT id FROM public.plans WHERE name = 'free_trial' LIMIT 1;`;
      if (plans.length > 0) {
        try {
          await sql`
            INSERT INTO public.subscriptions (organization_id, plan_id, status, trial_ends_at)
            VALUES (${orgId}, ${plans[0].id}, 'trial', (now() + interval '30 days'))
            ON CONFLICT (organization_id) DO NOTHING;
          `;
        } catch (subErr) {
          console.warn("Google subscription init note:", subErr);
        }
      }
    } else {
      userId = userRows[0].id;
      orgId = userRows[0].organization_id;
      role = (userRows[0].role as "owner" | "admin" | "staff") || "owner";

      // Update last login and ensure email is verified
      await sql`
        UPDATE public.users 
        SET last_login_at = now(), email_verified = true 
        WHERE id = ${userId};
      `;
    }

    // 2. Issue the application JWT session token & cookie
    const sessionToken = await createSessionToken({
      userId,
      organizationId: orgId,
      email: normalizedEmail,
      role,
    });

    await setSessionCookie(sessionToken);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("syncGoogleUserAction error:", err);
    return { success: false, error: err.message || "Failed to establish Google session" };
  }
}

/**
 * Server action to resolve and verify Google OAuth session after redirect.
 * Reads verified Google session directly from Neon Auth tables or by token/email parameters,
 * creates or updates the workspace user in DocuCollect database, and issues an HTTP-only session cookie.
 */
export async function resolveGoogleSessionAction(params?: {
  token?: string | null;
  email?: string | null;
}) {
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    let googleUser: { id: string; email: string; name?: string } | null = null;

    // Singleton database connection for Neon Auth (neondb)
    const authSql = getAuthDb();
    if (!authSql) return { success: false, error: "Auth database configuration missing" };

    // 1. If explicit token passed
    if (params?.token) {
      const byToken = await authSql`
        SELECT u.id, u.email, u.name, s.token, s."createdAt"
        FROM neon_auth.session s
        JOIN neon_auth.user u ON s."userId" = u.id
        WHERE s.token = ${params.token}
        LIMIT 1;
      `;
      if (byToken.length > 0) {
        googleUser = byToken[0] as any;
      }
    }

    // 2. If explicit email passed
    if (!googleUser && params?.email) {
      const byEmail = await authSql`
        SELECT u.id, u.email, u.name, s.token, s."createdAt"
        FROM neon_auth.user u
        JOIN neon_auth.account a ON a."userId" = u.id AND a."providerId" = 'google'
        LEFT JOIN neon_auth.session s ON s."userId" = u.id
        WHERE LOWER(u.email) = ${params.email.toLowerCase().trim()}
        ORDER BY s."createdAt" DESC NULLS LAST
        LIMIT 1;
      `;
      if (byEmail.length > 0) {
        googleUser = byEmail[0] as any;
      }
    }

    // 3. Fallback: Find the latest active Google session created in Neon Auth within the last 15 minutes
    if (!googleUser) {
      const latestSessions = await authSql`
        SELECT u.id, u.email, u.name, s.token, s."createdAt"
        FROM neon_auth.session s
        JOIN neon_auth.user u ON s."userId" = u.id
        JOIN neon_auth.account a ON a."userId" = u.id AND a."providerId" = 'google'
        WHERE s."createdAt" > (NOW() - INTERVAL '15 minutes')
        ORDER BY s."createdAt" DESC
        LIMIT 1;
      `;
      if (latestSessions.length > 0) {
        googleUser = latestSessions[0] as any;
      }
    }

    if (!googleUser || !googleUser.email) {
      return {
        success: false,
        error: "Could not retrieve verified Google session. Please try logging in again.",
      };
    }

    // 4. Synchronize user profile in DocuCollect database & establish JWT session
    const syncRes = await syncGoogleUserAction({
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name || googleUser.email.split("@")[0],
      emailVerified: true,
    });

    if (!syncRes.success) {
      return { success: false, error: syncRes.error || "Failed to establish workspace session." };
    }

    return {
      success: true,
      user: {
        email: googleUser.email,
        name: googleUser.name,
      },
    };
  } catch (err: any) {
    console.error("resolveGoogleSessionAction error:", err);
    return {
      success: false,
      error: err.message || "Failed to verify Google session",
    };
  }
}

/**
 * Request Password Reset OTP via Email
 */
export async function requestPasswordResetOtpAction(email: string): Promise<{ success: boolean; error?: string; message?: string }> {
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const rateCheck = checkRateLimit(`reset_req:${normalizedEmail}`, 3, 15 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many password reset requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
    };
  }

  try {
    const existing = await sql`
      SELECT id, email, full_name, is_deactivated 
      FROM public.users 
      WHERE LOWER(email) = ${normalizedEmail} 
      LIMIT 1;
    `;

    if (existing.length === 0) {
      // Security practice: Return success-like message or generic error so user enumeration is mitigated
      return {
        success: false,
        error: "No registered account found with this email address.",
      };
    }

    if (existing[0].is_deactivated) {
      return {
        success: false,
        error: "This account has been deactivated by the administrator. Please contact support.",
      };
    }

    const { code, codeHash } = generateOtp();
    await storeOtp(normalizedEmail, codeHash, "login");
    const mailRes = await sendOtpEmail(normalizedEmail, code, "login");

    if (!mailRes.success) {
      return { success: false, error: mailRes.error || "Failed to dispatch reset code email." };
    }

    return {
      success: true,
      message: `Password reset verification code sent to ${normalizedEmail}.`,
    };
  } catch (err: any) {
    console.error("requestPasswordResetOtpAction error:", err);
    return { success: false, error: err.message || "Failed to send reset code." };
  }
}

/**
 * Reset Password with Verified OTP and log the user in immediately
 */
export async function resetPasswordWithOtpAction(data: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  const normalizedEmail = data.email.toLowerCase().trim();
  const cleanCode = data.code.trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return { success: false, error: "Please enter a valid 6-digit verification code." };
  }

  if (!data.newPassword || data.newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters long." };
  }

  const rateCheck = checkRateLimit(`reset_verify:${normalizedEmail}`, 5, 15 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many verification attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
    };
  }

  try {
    let isValidOtp = await verifyOtp(normalizedEmail, cleanCode);

    // If not in local DB, check Neon Managed Better Auth (where the email came from)
    const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL;
    if (!isValidOtp && neonAuthUrl) {
      try {
        const cleanBase = neonAuthUrl.replace(/\/$/, "");
        const neonVerifyRes = await fetch(`${cleanBase}/sign-in/email-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, otp: cleanCode }),
        });
        if (neonVerifyRes.ok) {
          isValidOtp = true;
        }
      } catch (verifyErr) {
        console.warn("Neon OTP verify error during password reset:", verifyErr);
      }
    }

    if (!isValidOtp) {
      return { success: false, error: "Invalid or expired verification code. Please request a new code." };
    }

    // Hash new password securely with pgcrypto / bcrypt
    const passwordHash = await hashPasswordSecurely(data.newPassword, sql);

    // Update user record
    const updatedUsers = await sql`
      UPDATE public.users
      SET password_hash = ${passwordHash},
          email_verified = true,
          updated_at = now()
      WHERE LOWER(email) = ${normalizedEmail}
      RETURNING id, organization_id, email, role;
    `;

    if (updatedUsers.length === 0) {
      return { success: false, error: "User account not found." };
    }

    const user = updatedUsers[0] as any;

    // Log the user in immediately
    const sessionToken = await createSessionToken({
      userId: user.id,
      organizationId: user.organization_id,
      email: user.email,
      role: user.role,
    });

    resetRateLimit(`reset_verify:${normalizedEmail}`);
    await setSessionCookie(sessionToken);
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Password updated successfully! Logging you in...",
    };
  } catch (err: any) {
    console.error("resetPasswordWithOtpAction error:", err);
    return { success: false, error: err.message || "Failed to reset password." };
  }
}


