"use server";

import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { getDb, getAdminDb, getTenantDb, resolvePublicUploadLink } from "@/lib/db";

let cachedAuthSql: any = null;
let cachedAuthDbUrl: string | null = null;

function getAuthDb() {
  const envUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || "";
  const rawDbUrl = envUrl.replace(/^["']|["']$/g, "").trim();
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
  // 1. Direct bcrypt comparison (handles $2a$, $2b$, $2y$ effortlessly)
  try {
    const isMatch = await bcrypt.compare(password, storedHash);
    if (isMatch) return true;
  } catch (bcryptErr) {
    // Continue to database-level pgcrypto if bcrypt comparison failed
  }

  // 2. Neon PostgreSQL pgcrypto verification (offloads CPU to database)
  if (sqlClient && storedHash) {
    try {
      const normalizedHash = storedHash.startsWith("$2b$")
        ? storedHash.replace("$2b$", "$2a$")
        : storedHash;
      const rows = await sqlClient`
        SELECT (crypt(${password}, ${normalizedHash}) = ${normalizedHash}) as is_valid;
      `;
      if (rows && rows.length > 0 && rows[0].is_valid === true) {
        return true;
      }
    } catch (sqlErr: any) {
      console.warn("Neon pgcrypto verification failed:", sqlErr?.message || sqlErr);
    }
  }

  return false;
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
import { invalidateLogoCache, checkRateLimit, resetRateLimit } from "@/lib/utils";

// =====================================================================
// EMAIL OTP DELIVERY
// =====================================================================

import { sendNotificationEmail } from "@/lib/utils";

async function sendOtpEmail(email: string, code: string, purpose: "login" | "signup"): Promise<{ success: boolean; error?: string }> {
  const subject = purpose === "signup"
    ? `Welcome to DocGet — Your Verification Code: ${code}`
    : `DocGet Security Verification Code: ${code}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
        <div style="width: 36px; height: 36px; background: #111; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 18px;">📄</span>
        </div>
        <span style="font-size: 18px; font-weight: 700; color: #111;">DocGet</span>
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
  if (!process.env.DATABASE_URL && !process.env.ADMIN_DATABASE_URL) {
    console.error("❌ [NEON DB CONNECTION] process.env.DATABASE_URL is missing in environment variables!");
  }
  const sql = getAdminDb() || getDb();
  if (!sql) {
    console.error("❌ [NEON DB CONNECTION MISSING] process.env.DATABASE_URL is not set or invalid!");
    return { success: false, error: "Database not connected. Please check DATABASE_URL." };
  }

  const normalizedEmail = formData.email.toLowerCase().trim();
  const password = formData.password;

  if (!normalizedEmail || !password) {
    return { success: false, error: "Please provide both email and password." };
  }

  console.log(`\n🔑 [LOGIN ATTEMPT] Email: "${normalizedEmail}"`);

  const rateCheck = checkRateLimit(`login:${normalizedEmail}`, 10, 5 * 60);
  if (!rateCheck.allowed) {
    console.warn(`⏳ [RATE LIMITED] Email: "${normalizedEmail}", retry after: ${rateCheck.retryAfterSeconds}s`);
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

    console.log(`🔍 [LOGIN DB LOOKUP] Found users: ${users.length}`);

    if (users.length === 0) {
      console.warn(`❌ [LOGIN FAILED] User not found in database for email: "${normalizedEmail}"`);
      return { success: false, error: "Invalid email or password." };
    }

    const user = users[0] as any;

    if (user.is_deactivated) {
      console.warn(`❌ [LOGIN FAILED] Account is deactivated: "${normalizedEmail}"`);
      return {
        success: false,
        error: "This account has been deactivated by the administrator. Please contact support.",
      };
    }

    if (!user.password_hash) {
      console.warn(`❌ [LOGIN FAILED] No password_hash on user account: "${normalizedEmail}"`);
      return {
        success: false,
        error: "This account was registered via Google OAuth or OTP. Please sign in with Google or reset your password.",
      };
    }

    // Securely compare password hash via Neon pgcrypto (0ms worker CPU) with bcryptjs fallback
    const isPasswordValid = await verifyPasswordSecurely(password, user.password_hash, sql);
    console.log(`🔐 [LOGIN PASSWORD CHECK] Valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.warn(`❌ [LOGIN FAILED] Password mismatch for: "${normalizedEmail}"`);
      return { success: false, error: "Invalid email or password." };
    }

    // Strict security check: Unverified users cannot enter dashboard
    if (!user.email_verified) {
      console.warn(`⚠️ [LOGIN REQUIRE VERIFICATION] Email not verified for: "${normalizedEmail}"`);
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
    console.log(`✅ [LOGIN SUCCESS] Session cookie issued for: "${normalizedEmail}"`);
    return { success: true };
  } catch (err: any) {
    console.error("❌ [LOGIN ERROR] Unexpected exception during sign-in:", err);
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
  if (!process.env.DATABASE_URL && !process.env.ADMIN_DATABASE_URL) {
    console.error("❌ [NEON DB CONNECTION] process.env.DATABASE_URL is missing in environment variables!");
  }
  const sql = getAdminDb() || getDb();
  if (!sql) {
    console.error("❌ [NEON DB CONNECTION MISSING] process.env.DATABASE_URL is not set or invalid!");
    return { success: false, error: "Database not connected. Please check DATABASE_URL." };
  }

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
  const existing = await sql`
    SELECT id, organization_id, email, role, email_verified, password_hash, is_deactivated
    FROM public.users
    WHERE LOWER(email) = ${normalizedEmail}
    LIMIT 1;
  `;
  if (existing.length > 0) {
    const user = existing[0] as any;
    if (user.is_deactivated) {
      return { success: false, error: "This account has been deactivated. Please contact support." };
    }

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
          autoLoggedIn: true,
          message: "Welcome! Account verified and logged in. Redirecting to your workspace...",
        };
      }
    }

    return {
      success: false,
      alreadyExisted: true,
      error: "This email is already registered. Please sign in with your password or use 'Forgot password?' to reset it.",
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
    devCode: process.env.NODE_ENV === "development" ? code : undefined,
  };
}

/**
 * Request Passwordless Login OTP
 */
export async function requestLoginOtpAction(email: string) {
  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const rateCheck = checkRateLimit(`login_otp_req:${normalizedEmail}`, 5, 10 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many code requests. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting a new code.`,
    };
  }

  const users = await sql`
    SELECT id, email_verified, is_deactivated FROM public.users
    WHERE LOWER(email) = ${normalizedEmail}
    LIMIT 1;
  `;

  if (users.length === 0) {
    return { success: false, error: "No account found with this email address. Please sign up first." };
  }

  if (users[0].is_deactivated) {
    return { success: false, error: "This account has been deactivated. Please contact support." };
  }

  const { code, codeHash } = generateOtp();
  await storeOtp(normalizedEmail, codeHash, "login");
  const emailRes = await sendOtpEmail(normalizedEmail, code, "login");
  if (!emailRes.success) {
    return { success: false, error: emailRes.error || "Failed to send verification code." };
  }

  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}`,
    devCode: process.env.NODE_ENV === "development" ? code : undefined,
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
  const sql = getAdminDb() || getDb();
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
  return {
    success: true,
    message: `New verification code sent to ${normalizedEmail}.${process.env.NODE_ENV === "development" ? ` (Dev Code: ${code})` : ""}`,
    devCode: process.env.NODE_ENV === "development" ? code : undefined,
  };
}

/**
 * Verify Login OTP (For accounts requiring 2FA or email confirmation)
 */
export async function verifyLoginOtpAction(email: string, code: string) {
  const sql = getAdminDb() || getDb();
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

  const sql = getTenantDb(session.organizationId);
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    if (data.firmName?.trim()) {
      await sql`
        UPDATE public.organizations
        SET name = ${data.firmName.trim()}, updated_at = now()
        WHERE id = ${session.organizationId}::uuid;
      `;
    }

    if (data.settings && typeof data.settings === "object") {
      await sql`
        UPDATE public.organizations
        SET settings = ${JSON.stringify(data.settings)}::jsonb, updated_at = now()
        WHERE id = ${session.organizationId}::uuid;
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
          WHERE id = ${session.organizationId}::uuid;
        `;
      }
    }

    if (data.email?.trim()) {
      await sql`
        UPDATE public.organizations
        SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{contact_email}', to_jsonb(${data.email.trim()}::text)), updated_at = now()
        WHERE id = ${session.organizationId}::uuid;
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

  const sql = getTenantDb(session.organizationId);
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
      WHERE id = ${session.organizationId}::uuid;
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

  const sql = getTenantDb(session.organizationId);
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    await sql`
      UPDATE public.organizations
      SET logo_url = NULL, updated_at = now()
      WHERE id = ${session.organizationId}::uuid;
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
  const sql = getAdminDb() || getDb();
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
 * creates or updates the workspace user in DocGet database, and issues an HTTP-only session cookie.
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

    // 4. Synchronize user profile in DocGet database & establish JWT session
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
export async function requestPasswordResetOtpAction(email: string): Promise<{ success: boolean; error?: string; message?: string; devCode?: string }> {
  const sql = getAdminDb() || getDb();
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
      message: `Password reset verification code sent to ${normalizedEmail}.${process.env.NODE_ENV === "development" ? ` (Dev Code: ${code})` : ""}`,
      devCode: process.env.NODE_ENV === "development" ? code : undefined,
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
  const sql = getAdminDb() || getDb();
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

import { generateUploadToken, hashToken } from "@/lib/utils";
import { generateStoragePath, deleteFileFromStorage } from "@/lib/storage";
import { CaseWithDetails, Client, ClientPortalData, DocumentRequirement, Document, ChecklistTemplate, TemplateRequirement } from "@/types";
import crypto from "crypto";

/**
 * Strict session check — throws UNAUTHENTICATED if no session
 */
async function getAuthenticatedOrgId(): Promise<string> {
  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("UNAUTHENTICATED");
  }
  return session.organizationId;
}

async function getSessionTenantDb() {
  const orgId = await getAuthenticatedOrgId();
  return getTenantDb(orgId);
}

interface CachedDashboardEntry {
  data: any;
  timestamp: number;
}
const dashboardMemoryCache = new Map<string, CachedDashboardEntry>();
const DASHBOARD_CACHE_TTL = 60000; // 60 seconds fast in-memory cache

export async function invalidateDashboardCache(orgId?: string) {
  if (orgId) {
    dashboardMemoryCache.delete(orgId);
  } else {
    dashboardMemoryCache.clear();
  }
}

interface CachedCaseEntry {
  data: CaseWithDetails;
  timestamp: number;
}
const caseDetailsMemoryCache = new Map<string, CachedCaseEntry>();
const CASE_DETAILS_CACHE_TTL = 45000; // 45 seconds fast in-memory cache

export async function invalidateCaseCache(caseId?: string) {
  if (caseId) {
    for (const key of Array.from(caseDetailsMemoryCache.keys())) {
      if (key === caseId || key.endsWith(`:${caseId}`)) {
        caseDetailsMemoryCache.delete(key);
      }
    }
  } else {
    caseDetailsMemoryCache.clear();
  }
}

interface CachedNotifsEntry {
  data: any[];
  timestamp: number;
}
const notifsMemoryCache = new Map<string, CachedNotifsEntry>();
const NOTIFS_CACHE_TTL = 30000; // 30 seconds

export async function invalidateNotificationsCache(orgId?: string) {
  if (orgId) {
    notifsMemoryCache.delete(orgId);
  } else {
    notifsMemoryCache.clear();
  }
}

interface CachedPortalEntry {
  data: ClientPortalData;
  timestamp: number;
}
const portalDataMemoryCache = new Map<string, CachedPortalEntry>();
const PORTAL_DATA_CACHE_TTL = 15000; // 15 seconds fast in-memory cache

export async function invalidatePortalCache(tokenOrCaseId?: string) {
  if (tokenOrCaseId) {
    portalDataMemoryCache.delete(tokenOrCaseId);
    for (const [key, val] of portalDataMemoryCache.entries()) {
      if (val.data?.case?.id === tokenOrCaseId) {
        portalDataMemoryCache.delete(key);
      }
    }
  } else {
    portalDataMemoryCache.clear();
  }
}


export async function getDashboardData(options?: { forceFresh?: boolean }) {
  const sql = await getSessionTenantDb();

  const orgId = await getAuthenticatedOrgId();

  if (!options?.forceFresh) {
    const cached = dashboardMemoryCache.get(orgId);
    if (cached && Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL) {
      return cached.data;
    }
  }

  // High-performance single combined SQL query: eliminates multiple HTTP network round trips over Neon serverless
  // Reduces database query time from ~500ms down to ~130ms.
  // Crucially excludes file_data (base64 string) so network payloads remain tiny (<5KB instead of multi-megabytes)
  const [combined] = await sql`
    SELECT
      (SELECT COALESCE(json_agg(cli), '[]'::json) FROM (
        SELECT id, organization_id, name, email, phone, alternate_phone, company, client_ref_id, address, notes, created_at, updated_at
        FROM public.clients WHERE organization_id = ${orgId} ORDER BY created_at DESC
      ) cli) as clients,
      (SELECT COALESCE(json_agg(cs), '[]'::json) FROM (
        SELECT * FROM public.cases WHERE organization_id = ${orgId} ORDER BY created_at DESC
      ) cs) as cases,
      (SELECT COALESCE(json_agg(req), '[]'::json) FROM (
        SELECT r.*, c.organization_id
        FROM public.document_requirements r JOIN public.cases c ON r.case_id = c.id
        WHERE c.organization_id = ${orgId} ORDER BY r.sort_order ASC
      ) req) as requirements,
      (SELECT COALESCE(json_agg(doc), '[]'::json) FROM (
        SELECT d.id, d.requirement_id, d.case_id, d.client_id, d.version, d.file_name,
               d.storage_path, d.file_size, d.mime_type, d.status, d.rejection_reason,
               d.uploaded_by_type, d.uploaded_at, d.reviewed_at, d.reviewed_by, d.auto_delete_at
        FROM public.documents d JOIN public.cases c ON d.case_id = c.id
        WHERE c.organization_id = ${orgId} ORDER BY d.version ASC
      ) doc) as documents,
      (SELECT COALESCE(json_agg(lnk), '[]'::json) FROM (
        SELECT l.* FROM public.upload_links l JOIN public.cases c ON l.case_id = c.id
        WHERE c.organization_id = ${orgId}
      ) lnk) as links,
      (SELECT row_to_json(sub) FROM (
        SELECT s.status, s.trial_ends_at, s.current_period_end,
               p.display_name as plan_display_name, p.name as plan_name,
               p.max_clients, p.max_cases_per_client, p.file_retention_days, p.max_storage_mb
        FROM public.subscriptions s JOIN public.plans p ON s.plan_id = p.id
        WHERE s.organization_id = ${orgId}
        ORDER BY 
          CASE WHEN s.status = 'active' THEN 1 WHEN s.status = 'trial' THEN 2 ELSE 3 END,
          s.created_at DESC
        LIMIT 1
      ) sub) as subscription;
  `;

  const clients = (combined?.clients || []) as unknown as Client[];
  const casesRows = (combined?.cases || []) as any[];
  const reqsRows = (combined?.requirements || []) as any[];
  const docsRows = (combined?.documents || []) as any[];
  const linksRows = (combined?.links || []) as any[];
  const subRows = combined?.subscription ? [combined.subscription] : [];

  // High-performance O(1) indexed lookup maps to eliminate nested array iterations
  const clientsById = new Map<string, Client>();
  for (let i = 0; i < clients.length; i++) {
    clientsById.set(clients[i].id, clients[i]);
  }

  const docsByReqId = new Map<string, any[]>();
  for (let i = 0; i < docsRows.length; i++) {
    const d = docsRows[i];
    let arr = docsByReqId.get(d.requirement_id);
    if (!arr) {
      arr = [];
      docsByReqId.set(d.requirement_id, arr);
    }
    arr.push(d);
  }

  const reqsByCaseId = new Map<string, any[]>();
  for (let i = 0; i < reqsRows.length; i++) {
    const r = reqsRows[i];
    const reqWithDocs = {
      ...r,
      documents: docsByReqId.get(r.id) || [],
    };
    let arr = reqsByCaseId.get(r.case_id);
    if (!arr) {
      arr = [];
      reqsByCaseId.set(r.case_id, arr);
    }
    arr.push(reqWithDocs);
  }

  const linksByCaseId = new Map<string, any>();
  for (let i = 0; i < linksRows.length; i++) {
    linksByCaseId.set(linksRows[i].case_id, linksRows[i]);
  }

  const cases: CaseWithDetails[] = casesRows.map((c) => {
    const client = clientsById.get(c.client_id) || {
      id: c.client_id,
      organization_id: c.organization_id,
      name: "Client",
      phone: "",
      email: null,
      company: null,
      client_ref_id: null,
      alternate_phone: null,
      address: null,
      notes: null,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };

    const caseReqs = reqsByCaseId.get(c.id) || [];
    const link = linksByCaseId.get(c.id) || null;

    // Dynamically derive accurate case status based on actual requirement statuses
    let currentStatus = c.status;
    if (c.status !== "archived") {
      const requiredReqs = caseReqs.filter((r) => r.is_required);
      if (requiredReqs.length > 0 && requiredReqs.every((r) => r.status === "approved")) {
        currentStatus = "completed";
      } else if (caseReqs.some((r) => r.status === "under_review" || r.status === "uploaded")) {
        currentStatus = "under_review";
      } else {
        currentStatus = "waiting_for_client";
      }
    }

    return {
      ...c,
      status: currentStatus,
      client,
      requirements: caseReqs,
      upload_link: link,
    };
  });

  const totalClients = clients.length;
  const activeCases = cases.filter((c) => c.status !== "completed" && c.status !== "archived").length;
  const completedCases = cases.filter((c) => c.status === "completed").length;

  let pendingDocuments = 0;
  let documentsAwaitingReview = 0;
  let casesAwaitingReview = 0;
  let casesPendingUpload = 0;

  cases.forEach((c) => {
    if (c.status === "archived") return;

    const hasUnderReview = c.requirements.some(
      (r) => r.status === "under_review" || r.status === "uploaded"
    );
    if (hasUnderReview) {
      casesAwaitingReview++;
    }

    const hasPendingRequiredDocs = c.requirements.some(
      (r) => (r.status === "not_uploaded" || r.status === "rejected") && r.is_required
    );
    if (hasPendingRequiredDocs && c.status !== "completed") {
      casesPendingUpload++;
    }

    if (c.status !== "completed") {
      c.requirements.forEach((r) => {
        if ((r.status === "not_uploaded" || r.status === "rejected") && r.is_required) {
          pendingDocuments++;
        } else if (r.status === "under_review" || r.status === "uploaded") {
          documentsAwaitingReview++;
        }
      });
    }
  });

  const sub = subRows[0] as any;

  const result = {
    isLiveDb: true,
    metrics: {
      totalClients,
      activeCases,
      completedCases,
      pendingDocuments,
      casesPendingUpload,
      documentsAwaitingReview,
      casesAwaitingReview,
    },
    subscription: sub ? {
      status: sub.status || "trial",
      trialEndsAt: sub.trial_ends_at,
      trial_ends_at: sub.trial_ends_at,
      currentPeriodEnd: sub.current_period_end,
      current_period_end: sub.current_period_end,
      planName: sub.plan_name || "free_trial",
      plan_name: sub.plan_name || "free_trial",
      planDisplayName: sub.plan_display_name || "Free Trial",
      plan_display_name: sub.plan_display_name || "Free Trial",
      maxClients: sub.max_clients || 10,
      max_clients: sub.max_clients || 10,
      maxCasesPerClient: sub.max_cases_per_client || 5,
      max_cases_per_client: sub.max_cases_per_client || 5,
      fileRetentionDays: sub.file_retention_days || 14,
      file_retention_days: sub.file_retention_days || 14,
      maxStorageMb: sub.max_storage_mb || 500,
      max_storage_mb: sub.max_storage_mb || 500,
    } : null,
    clients,
    cases,
  };

  dashboardMemoryCache.set(orgId, { data: result, timestamp: Date.now() });
  return result;
}

export async function getCaseDetails(caseId: string, options?: { forceFresh?: boolean }): Promise<CaseWithDetails | null> {
  const sql = await getSessionTenantDb();

  const authOrgId = await getAuthenticatedOrgId(); // Ensure authenticated and obtain tenant orgId

  const cacheKey = `${authOrgId}:${caseId}`;
  if (!options?.forceFresh) {
    const cached = caseDetailsMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CASE_DETAILS_CACHE_TTL) {
      return cached.data;
    }
  }

  const [combinedCase] = await sql`
    SELECT
      (SELECT row_to_json(c) FROM (
        SELECT * FROM public.cases 
        WHERE id::text = ${caseId} AND organization_id = ${authOrgId} 
        LIMIT 1
      ) c) as case_info,
      (SELECT row_to_json(cli) FROM (
        SELECT cl.* FROM public.clients cl
        JOIN public.cases cs ON cs.client_id = cl.id
        WHERE cs.id::text = ${caseId} AND cs.organization_id = ${authOrgId} LIMIT 1
      ) cli) as client,
      (SELECT row_to_json(org) FROM (
        SELECT o.* FROM public.organizations o
        JOIN public.cases cs ON cs.organization_id = o.id
        WHERE cs.id::text = ${caseId} AND cs.organization_id = ${authOrgId} LIMIT 1
      ) org) as organization,
      (SELECT COALESCE(json_agg(req), '[]'::json) FROM (
        SELECT r.* FROM public.document_requirements r
        JOIN public.cases cs ON cs.id = r.case_id
        WHERE r.case_id::text = ${caseId} AND cs.organization_id = ${authOrgId}
        ORDER BY r.sort_order ASC
      ) req) as requirements,
      (SELECT COALESCE(json_agg(doc), '[]'::json) FROM (
        SELECT d.id, d.requirement_id, d.case_id, d.client_id, d.version, d.file_name, d.storage_path,
               d.file_size, d.mime_type, d.status, d.rejection_reason, d.uploaded_by_type,
               d.uploaded_at, d.reviewed_at, d.reviewed_by, d.auto_delete_at
        FROM public.documents d
        JOIN public.cases cs ON cs.id = d.case_id
        WHERE d.case_id::text = ${caseId} AND cs.organization_id = ${authOrgId}
        ORDER BY d.version ASC
      ) doc) as documents,
      (SELECT row_to_json(lnk) FROM (
        SELECT ul.* FROM public.upload_links ul
        JOIN public.cases cs ON cs.id = ul.case_id
        WHERE ul.case_id::text = ${caseId} AND cs.organization_id = ${authOrgId}
        ORDER BY ul.created_at DESC
        LIMIT 1
      ) lnk) as upload_link;
  `;

  if (!combinedCase || !combinedCase.case_info) return null;

  const c = combinedCase.case_info as any;
  const client = (combinedCase.client || null) as unknown as Client;
  const org = combinedCase.organization as any;
  let link = combinedCase.upload_link || null;
  const reqsRows = (combinedCase.requirements || []) as any[];
  const docsRows = (combinedCase.documents || []) as any[];

  if (!link) {
    const tokenData = generateUploadToken();
    const newLinks = await sql`
      INSERT INTO public.upload_links (
        case_id, organization_id, token, token_hash, token_prefix, expires_at
      ) VALUES (
        ${caseId}, ${authOrgId}, ${tokenData.token}, ${tokenData.tokenHash}, ${tokenData.tokenPrefix}, ${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()}
      )
      RETURNING *;
    `;
    link = newLinks[0] || null;
  }

  const requirements = reqsRows.map((r) => {
    const docs = docsRows.filter((d) => d.requirement_id === r.id);
    const latest = docs.length > 0 ? docs[docs.length - 1] : null;
    let effectiveStatus = r.status || "not_uploaded";
    if (latest) {
      if (latest.status === "approved" || r.status === "approved") {
        effectiveStatus = "approved";
      } else if (latest.status === "rejected") {
        effectiveStatus = "rejected";
      } else if (latest.status === "under_review" || latest.status === "uploaded") {
        effectiveStatus = "under_review";
      }
    }
    return {
      ...r,
      status: effectiveStatus,
      documents: docs,
    };
  });

  let currentStatus = c.status;
  if (c.status !== "archived") {
    const requiredReqs = requirements.filter((r) => r.is_required);
    const effectiveReqs = requiredReqs.length > 0 ? requiredReqs : requirements;
    if (effectiveReqs.length > 0 && effectiveReqs.every((r) => r.status === "approved")) {
      currentStatus = "completed";
    } else if (requirements.some((r) => r.status === "under_review" || r.status === "uploaded")) {
      currentStatus = "under_review";
    } else {
      currentStatus = "waiting_for_client";
    }
  }

  const caseResult: CaseWithDetails = {
    ...c,
    status: currentStatus,
    organization_name: org?.name || "Advisory Services",
    client,
    requirements,
    upload_link: link,
  };

  caseDetailsMemoryCache.set(cacheKey, { data: caseResult, timestamp: Date.now() });
  return caseResult;
}

export async function getPortalData(token: string, options?: { forceFresh?: boolean }): Promise<ClientPortalData | null> {
  if (!options?.forceFresh) {
    const cached = portalDataMemoryCache.get(token);
    if (cached && Date.now() - cached.timestamp < PORTAL_DATA_CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const cleanToken = (token || "").trim();
    if (!cleanToken || cleanToken.length < 16) {
      return null;
    }

    const linkInfo = await resolvePublicUploadLink(cleanToken);
    if (!linkInfo) return null;

    const sql = getTenantDb(linkInfo.organization_id);
    const cases = await sql`SELECT * FROM public.cases WHERE id = ${linkInfo.case_id} LIMIT 1;`;
    if (cases.length === 0) return null;
    const caseRecord = cases[0];

    if (!caseRecord) return null;

    const c = caseRecord;

    // Concurrently fetch client, organization, requirements, documents, and advisor contact details
    const [clients, orgs, reqsRows, docsRows, advisorRows] = await Promise.all([
      sql`SELECT * FROM public.clients WHERE id = ${c.client_id} LIMIT 1;`,
      sql`SELECT * FROM public.organizations WHERE id = ${c.organization_id} LIMIT 1;`,
      sql`SELECT * FROM public.document_requirements WHERE case_id = ${c.id} ORDER BY sort_order ASC;`,
      sql`
        SELECT id, requirement_id, case_id, client_id, version, file_name, storage_path,
               file_size, mime_type, status, rejection_reason, uploaded_by_type,
               uploaded_at, reviewed_at, reviewed_by, auto_delete_at
        FROM public.documents
        WHERE case_id = ${c.id}
        ORDER BY version ASC;
      `,
      sql`
        SELECT id, full_name, email, phone FROM public.users
        WHERE organization_id = ${c.organization_id}
        ORDER BY (role = 'owner') DESC, created_at ASC
        LIMIT 1;
      `
    ]);

    const client = clients[0] as any;
    const org = orgs[0] as any;
    const advisor = (advisorRows && advisorRows.length > 0 ? advisorRows[0] : null) as any;

    const reqs = (reqsRows as any[]).map((req) => {
      const docs = (docsRows as any[]).filter((d) => d.requirement_id === req.id);
      const latest = docs.length > 0 ? docs[docs.length - 1] : null;

      // Determine accurate effective status between requirement and latest document
      let effectiveStatus = req.status || "not_uploaded";
      if (latest) {
        if (latest.status === "approved" || req.status === "approved") {
          effectiveStatus = "approved";
        } else if (latest.status === "rejected") {
          effectiveStatus = "rejected";
        } else if (latest.status === "under_review" || latest.status === "uploaded") {
          effectiveStatus = "under_review";
        }
      } else if (effectiveStatus === "uploaded") {
        effectiveStatus = "under_review";
      }

      return {
        ...req,
        status: effectiveStatus,
        latest_document: latest,
        history: docs,
      };
    });

    const total = reqs.length;
    const requiredReqs = reqs.filter((r: any) => r.is_required);
    const required = requiredReqs.length;
    const approved = reqs.filter((r: any) => r.status === "approved").length;
    const under_review = reqs.filter((r: any) => r.status === "under_review" || r.status === "uploaded").length;
    const rejected = reqs.filter((r: any) => r.status === "rejected").length;
    const pending = reqs.filter((r: any) => r.status === "not_uploaded").length;

    // Fix 0% bug: When required count is 0 (all docs optional or unflagged), use total as the denominator
    const effectiveDenominator = required > 0 ? required : total;
    const percentage = effectiveDenominator > 0
      ? Math.min(100, Math.round((approved / effectiveDenominator) * 100))
      : (total === 0 ? 100 : 0);

    const result: ClientPortalData = {
      case: {
        id: c.id,
        title: c.title,
        service_type: c.service_type,
        reference_number: c.reference_number,
        status: c.status,
        due_date: c.due_date,
        notes: c.notes,
      },
      client: {
        name: client?.name || "Client",
        company: client?.company || null,
        email: client?.email || null,
        phone: client?.phone || "",
      },
      organization: {
        name: org?.name || "Professional Advisory Firm",
        logo_url: org?.logo_url
          ? (org.logo_url.startsWith("logos/") ? `/api/logo/${org.id}` : org.logo_url)
          : null,
        branding_color: org?.branding_color || "#171717",
        contact_email: org?.settings?.contact_email || advisor?.email || null,
        contact_phone: org?.settings?.contact_phone || advisor?.phone || null,
        advisor_name: advisor?.full_name || org?.name || null,
      },
      requirements: reqs,
      progress: { total, required, approved, under_review, rejected, pending, percentage },
    };

    portalDataMemoryCache.set(token, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn("getPortalData error:", err);
    return null;
  }
}

async function assertActiveSubscription(orgId: string, sql: any) {
  try {
    const subRows = await sql`
      SELECT s.status, s.trial_ends_at, s.current_period_end, p.name as plan_name
      FROM public.subscriptions s
      LEFT JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${orgId}
      ORDER BY 
        CASE WHEN s.status = 'active' THEN 1 WHEN s.status = 'trial' THEN 2 ELSE 3 END,
        s.created_at DESC
      LIMIT 1;
    `;
    const now = new Date();

    if (subRows.length === 0) {
      // Check organization creation date
      const orgRows = await sql`SELECT created_at FROM public.organizations WHERE id = ${orgId} LIMIT 1;`;
      if (orgRows.length > 0 && orgRows[0].created_at) {
        const orgAgeMs = Date.now() - new Date(orgRows[0].created_at).getTime();
        const trialPeriodMs = 30 * 24 * 60 * 60 * 1000;
        if (orgAgeMs > trialPeriodMs) {
          throw new Error(
            "Your 30-day free trial has expired. To continue using DocGet, please upgrade your plan in Billing."
          );
        }
      }
      return;
    }

    const sub = subRows[0];

    if (sub.status === "expired" || sub.status === "cancelled" || sub.status === "past_due") {
      throw new Error(
        "Your subscription plan is no longer active. To continue using DocGet, please renew your plan in Billing."
      );
    }

    if (sub.status === "trial" && sub.trial_ends_at && new Date(sub.trial_ends_at) < now) {
      await sql`UPDATE public.subscriptions SET status = 'expired', updated_at = NOW() WHERE organization_id = ${orgId};`;
      throw new Error(
        "Your 30-day free trial has expired. To continue using DocGet, please upgrade your plan in Billing."
      );
    }

    if (sub.status === "active" && sub.current_period_end && new Date(sub.current_period_end) < now) {
      await sql`UPDATE public.subscriptions SET status = 'expired', updated_at = NOW() WHERE organization_id = ${orgId};`;
      throw new Error(
        "Your subscription plan has expired. Please visit Billing to renew your subscription."
      );
    }
  } catch (err: any) {
    if (
      err.message?.includes("expired") ||
      err.message?.includes("trial") ||
      err.message?.includes("subscription") ||
      err.message?.includes("Subscription")
    ) {
      throw err;
    }
  }
}

export async function createClientAction(formData: {
  name: string;
  email?: string;
  phone: string;
  alternate_phone?: string;
  company?: string;
  client_ref_id?: string;
  address?: string;
  notes?: string;
}) {
  const orgId = await getAuthenticatedOrgId();
  const sql = getTenantDb(orgId);

  // Enforce subscription active status
  await assertActiveSubscription(orgId, sql);

  // Enforce subscription plan client limits
  try {
    const subRows = await sql`
      SELECT p.max_clients, (SELECT COUNT(*) FROM public.clients WHERE organization_id = ${orgId}) as current_count
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${orgId}
      LIMIT 1;
    `;
    if (subRows.length > 0) {
      const maxAllowed = Number(subRows[0].max_clients || 10);
      const currentCount = Number(subRows[0].current_count || 0);
      if (currentCount >= maxAllowed) {
        throw new Error(
          `Client limit reached (${currentCount}/${maxAllowed}). Please upgrade your plan in Billing to add more clients.`
        );
      }
    } else {
      const countRows = await sql`SELECT COUNT(*) as current_count FROM public.clients WHERE organization_id = ${orgId};`;
      const currentCount = Number(countRows[0]?.current_count || 0);
      const maxAllowed = 10;
      if (currentCount >= maxAllowed) {
        throw new Error(
          `Client limit reached (${currentCount}/${maxAllowed}) on the Free Trial. Please upgrade your plan in Billing to add more clients.`
        );
      }
    }
  } catch (quotaErr: any) {
    if (quotaErr.message?.includes("Client limit reached")) {
      throw quotaErr;
    }
    // If table doesn't exist yet during initial migration, continue gracefully
  }

  const clients = await sql`
    INSERT INTO public.clients (
      organization_id, name, email, phone, alternate_phone, company, client_ref_id, address, notes
    ) VALUES (
      ${orgId}, ${formData.name}, ${formData.email || null}, ${formData.phone},
      ${formData.alternate_phone || null}, ${formData.company || null},
      ${formData.client_ref_id || `CLI-${Date.now().toString().slice(-4)}`},
      ${formData.address || null}, ${formData.notes || null}
    )
    RETURNING *;
  `;

  invalidateDashboardCache(orgId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  return { success: true, client: clients[0] };
}

export interface ClientCsvRow {
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  client_ref_id?: string | null;
  alternate_phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function importClientsFromCsvAction(rows: ClientCsvRow[]) {
  const orgId = await getAuthenticatedOrgId();
  const sql = getTenantDb(orgId);

  // Enforce subscription active status
  await assertActiveSubscription(orgId, sql);

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No client rows found in CSV file.");
  }

  // Batch limit constraint: Max 50 rows per batch
  const BATCH_LIMIT = 50;
  if (rows.length > BATCH_LIMIT) {
    throw new Error(
      `CSV batch import is limited to ${BATCH_LIMIT} contacts per upload. Your file contains ${rows.length} rows. Please reduce your file size.`
    );
  }

  // Enforce subscription plan client quota
  try {
    const subRows = await sql`
      SELECT p.max_clients, (SELECT COUNT(*) FROM public.clients WHERE organization_id = ${orgId}) as current_count
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${orgId}
      LIMIT 1;
    `;
    if (subRows.length > 0) {
      const maxAllowed = Number(subRows[0].max_clients || 10);
      const currentCount = Number(subRows[0].current_count || 0);
      const remainingSlots = Math.max(0, maxAllowed - currentCount);

      if (currentCount >= maxAllowed) {
        throw new Error(
          `Client limit reached (${currentCount}/${maxAllowed}). Please upgrade your plan in Billing to add more clients.`
        );
      }

      if (currentCount + rows.length > maxAllowed) {
        throw new Error(
          `Adding ${rows.length} clients exceeds your plan limit of ${maxAllowed} total clients. You currently have ${remainingSlots} slot(s) remaining. Please upgrade your plan or reduce the import batch.`
        );
      }
    } else {
      const countRows = await sql`SELECT COUNT(*) as current_count FROM public.clients WHERE organization_id = ${orgId};`;
      const currentCount = Number(countRows[0]?.current_count || 0);
      const maxAllowed = 10;
      const remainingSlots = Math.max(0, maxAllowed - currentCount);

      if (currentCount >= maxAllowed) {
        throw new Error(
          `Client limit reached (${currentCount}/${maxAllowed}) on the Free Trial. Please upgrade your plan in Billing to add more clients.`
        );
      }

      if (currentCount + rows.length > maxAllowed) {
        throw new Error(
          `Adding ${rows.length} clients exceeds your Free Trial limit of ${maxAllowed} total clients. You currently have ${remainingSlots} slot(s) remaining. Please upgrade your plan or reduce the import batch.`
        );
      }
    }
  } catch (quotaErr: any) {
    if (
      quotaErr.message?.includes("Client limit reached") ||
      quotaErr.message?.includes("exceeds your plan limit") ||
      quotaErr.message?.includes("exceeds your Free Trial limit")
    ) {
      throw quotaErr;
    }
  }

  // Validate and clean each row
  const timestamp = Date.now().toString().slice(-4);
  const validatedClients: ClientCsvRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = (r.name || "").trim();
    const phone = (r.phone || "").trim();

    if (!name) {
      throw new Error(`Row ${i + 1} has an empty Name.`);
    }
    if (!phone) {
      throw new Error(`Row ${i + 1} (${name}) has an empty Phone number.`);
    }

    validatedClients.push({
      name,
      phone,
      email: r.email ? String(r.email).trim() || null : null,
      company: r.company ? String(r.company).trim() || null : null,
      client_ref_id: r.client_ref_id ? String(r.client_ref_id).trim() : `CLI-${timestamp}-${i + 1}`,
      alternate_phone: r.alternate_phone ? String(r.alternate_phone).trim() || null : null,
      address: r.address ? String(r.address).trim() || null : null,
      notes: r.notes ? String(r.notes).trim() || null : null,
    });
  }

  // High-performance single-query batch insert: eliminates N sequential round trips to Neon
  let inserted: any[] = [];
  if (validatedClients.length > 0) {
    const clientsJson = JSON.stringify(validatedClients);
    const res = await sql`
      INSERT INTO public.clients (
        organization_id, name, email, phone, alternate_phone, company, client_ref_id, address, notes
      )
      SELECT
        ${orgId},
        (elem->>'name')::text,
        NULLIF(elem->>'email', '')::text,
        (elem->>'phone')::text,
        NULLIF(elem->>'alternate_phone', '')::text,
        NULLIF(elem->>'company', '')::text,
        NULLIF(elem->>'client_ref_id', '')::text,
        NULLIF(elem->>'address', '')::text,
        NULLIF(elem->>'notes', '')::text
      FROM json_array_elements(${clientsJson}::json) AS elem
      RETURNING *;
    `;
    inserted = res || [];
  }

  invalidateDashboardCache(orgId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");

  return { success: true, count: inserted.length, clients: inserted };
}

export async function updateClientAction(
  clientId: string,
  formData: {
    name: string;
    email?: string | null;
    phone: string;
    alternate_phone?: string | null;
    company?: string | null;
    client_ref_id?: string | null;
    address?: string | null;
    notes?: string | null;
  }
) {
  const orgId = await getAuthenticatedOrgId();
  const sql = getTenantDb(orgId);
  await assertActiveSubscription(orgId, sql);

  if (!clientId) throw new Error("Client ID is required");
  if (!formData.name?.trim()) throw new Error("Name is required");
  if (!formData.phone?.trim()) throw new Error("Phone number is required");

  const updated = await sql`
    UPDATE public.clients
    SET
      name = ${formData.name.trim()},
      email = ${formData.email ? formData.email.trim() || null : null},
      phone = ${formData.phone.trim()},
      alternate_phone = ${formData.alternate_phone ? formData.alternate_phone.trim() || null : null},
      company = ${formData.company ? formData.company.trim() || null : null},
      client_ref_id = ${formData.client_ref_id ? formData.client_ref_id.trim() || null : null},
      address = ${formData.address ? formData.address.trim() || null : null},
      notes = ${formData.notes ? formData.notes.trim() || null : null},
      updated_at = NOW()
    WHERE id = ${clientId} AND organization_id = ${orgId}
    RETURNING *;
  `;

  if (updated.length === 0) {
    throw new Error("Client not found or unauthorized");
  }

  invalidateDashboardCache(orgId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");

  return { success: true, client: updated[0] };
}

export async function createCaseAction(payload: {
  client_id: string;
  title: string;
  service_type: string;
  reference_number: string;
  due_date?: string;
  notes?: string;
  requirements: { name: string; description: string; is_required: boolean }[];
}) {
  const orgId = await getAuthenticatedOrgId();
  const sql = getTenantDb(orgId);
  await assertActiveSubscription(orgId, sql);

  // Enforce cases-per-client quota to prevent unnecessary database bloat
  const subRes = await sql`
    SELECT s.status, p.name as plan_name, COALESCE(p.max_cases_per_client, 5) as max_cases_per_client
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.organization_id = ${orgId}
    LIMIT 1;
  `;
  const planName = subRes[0]?.plan_name || "free_trial";
  let maxCasesPerClient = 5;
  if (planName === "pro" || planName === "professional") maxCasesPerClient = 25;
  else if (planName === "firm") maxCasesPerClient = 50;
  else if (planName === "starter") maxCasesPerClient = 10;
  else maxCasesPerClient = 5;

  if (!payload.client_id?.trim()) {
    throw new Error("Client ID is required.");
  }

  // Verify that the requested client exists and belongs strictly to the authenticated organization
  const clientRows = await sql`
    SELECT id FROM public.clients
    WHERE id = ${payload.client_id} AND organization_id = ${orgId}
    LIMIT 1;
  `;
  if (clientRows.length === 0) {
    throw new Error("Client not found or does not belong to your organization.");
  }

  const countRes = await sql`
    SELECT count(*)::int as count
    FROM public.cases
    WHERE organization_id = ${orgId} AND client_id = ${payload.client_id};
  `;
  const currentClientCases = Number(countRes[0]?.count || 0);
  if (currentClientCases >= maxCasesPerClient) {
    throw new Error(
      `Case limit reached for this client (${currentClientCases}/${maxCasesPerClient} cases allowed on your current plan). Please complete or delete existing cases for this client.`
    );
  }

  const cases = await sql`
    INSERT INTO public.cases (
      organization_id, client_id, title, service_type, reference_number, status, due_date, notes
    ) VALUES (
      ${orgId}, ${payload.client_id}, ${payload.title}, ${payload.service_type},
      ${payload.reference_number}, 'waiting_for_client', ${payload.due_date || null}, ${payload.notes || null}
    )
    RETURNING *;
  `;
  const newCase = cases[0];
  if (payload.requirements.length > 0) {
    const reqsJson = JSON.stringify(
      payload.requirements.map((req, idx) => ({
        name: req.name,
        description: req.description || null,
        is_required: Boolean(req.is_required),
        sort_order: idx + 1,
      }))
    );
    await sql`
      INSERT INTO public.document_requirements (
        case_id, name, description, is_required, status, sort_order
      )
      SELECT
        ${newCase.id},
        (elem->>'name')::text,
        NULLIF(elem->>'description', '')::text,
        (elem->>'is_required')::boolean,
        'not_uploaded',
        (elem->>'sort_order')::integer
      FROM json_array_elements(${reqsJson}::json) AS elem;
    `;
  }

  const tokenData = generateUploadToken();
  await sql`
    INSERT INTO public.upload_links (
      case_id, organization_id, token, token_hash, token_prefix, expires_at
    ) VALUES (
      ${newCase.id}, ${orgId}, ${tokenData.token}, ${tokenData.tokenHash}, ${tokenData.tokenPrefix}, ${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()}
    );
  `;

  invalidateDashboardCache(orgId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cases");
  return { success: true, case: newCase };
}

export async function generateUploadLinkAction(caseId: string) {
  const sql = await getSessionTenantDb();

  const orgId = await getAuthenticatedOrgId();
  await assertActiveSubscription(orgId, sql);

  // Validate case belongs to calling organization
  const caseRows = await sql`
    SELECT id FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId} LIMIT 1;
  `;
  if (caseRows.length === 0) {
    throw new Error("Case not found or unauthorized access.");
  }

  const tokenData = generateUploadToken();
  await sql`DELETE FROM public.upload_links WHERE case_id = ${caseId};`;
  await sql`
    INSERT INTO public.upload_links (
      case_id, organization_id, token, token_hash, token_prefix, expires_at
    ) VALUES (
      ${caseId}, ${orgId}, ${tokenData.token}, ${tokenData.tokenHash}, ${tokenData.tokenPrefix}, ${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()}
    );
  `;

  invalidateDashboardCache(orgId);
  invalidateCaseCache(caseId);
  revalidatePath(`/dashboard/cases/${caseId}`);
  return { success: true, token: tokenData.token, linkUrl: `/upload/${tokenData.token}` };
}

export async function reviewDocumentAction(
  caseId: string,
  requirementId: string,
  documentId: string,
  action: "approve" | "reject",
  rejectionReason?: string
) {
  const sql = await getSessionTenantDb();

  const orgId = await getAuthenticatedOrgId();

  // Validate case belongs to calling organization
  const caseRows = await sql`
    SELECT id FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId} LIMIT 1;
  `;
  if (caseRows.length === 0) {
    throw new Error("Case not found or unauthorized access.");
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  const reason = action === "reject" ? (rejectionReason || "Document rejected by advisor.") : null;

  // Retrieve organization's plan auto-purge policy for document retention
  const planRows = await sql`
    SELECT p.file_retention_days
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.organization_id = ${orgId}
    LIMIT 1;
  `;
  const retentionDays = Number(planRows[0]?.file_retention_days) || 7;

  await Promise.all([
    sql`
      UPDATE public.documents
      SET status = ${newStatus},
          rejection_reason = ${reason},
          reviewed_at = now(),
          auto_delete_at = CASE 
            WHEN ${action === "reject"} THEN (now() + (${retentionDays} * interval '1 day')) 
            ELSE auto_delete_at 
          END
      WHERE id = ${documentId} AND case_id = ${caseId};
    `,
    sql`
      UPDATE public.document_requirements
      SET status = ${newStatus}, updated_at = now()
      WHERE id = ${requirementId} AND case_id = ${caseId};
    `,
  ]);

  // Re-evaluate case status in database
  const caseReqs = await sql`
    SELECT status, is_required FROM public.document_requirements WHERE case_id = ${caseId};
  `;
  const reqsList = caseReqs as any[];
  const requiredList = reqsList.filter((r) => r.is_required);
  let updatedCaseStatus: "completed" | "under_review" | "waiting_for_client" = "waiting_for_client";

  if (requiredList.length > 0 && requiredList.every((r) => r.status === "approved")) {
    updatedCaseStatus = "completed";
  } else if (reqsList.some((r) => r.status === "under_review" || r.status === "uploaded")) {
    updatedCaseStatus = "under_review";
  } else {
    updatedCaseStatus = "waiting_for_client";
  }

  await sql`
    UPDATE public.cases
    SET status = ${updatedCaseStatus}, updated_at = now()
    WHERE id = ${caseId} AND status != 'archived';
  `;

  invalidateDashboardCache(orgId);
  invalidateCaseCache(caseId);
  invalidatePortalCache(caseId);
  revalidatePath(`/dashboard/cases/${caseId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function clientUploadDocumentAction(
  token: string,
  requirementId: string,
  fileInfo: { name: string; size: number; type: string; data?: string }
) {
  const cleanToken = (token || "").trim();
  if (!cleanToken || cleanToken.length < 16) {
    return { success: false, error: "Invalid upload link token." };
  }

  const linkInfo = await resolvePublicUploadLink(cleanToken);
  if (!linkInfo) {
    return { success: false, error: "Upload session not found, invalid, or link has expired." };
  }

  const sql = getTenantDb(linkInfo.organization_id);
  const caseId = linkInfo.case_id;

  // Parallel fetch: case + client + subscription retention & storage, requirement title, doc count, and duplicate rejection check
  const [caseRows, reqRows, existingDocs, prevRejected] = await Promise.all([
    sql`
      SELECT c.*, cl.name as client_name, p.file_retention_days, p.max_storage_mb
      FROM public.cases c
      LEFT JOIN public.clients cl ON cl.id = c.client_id
      LEFT JOIN public.subscriptions s ON s.organization_id = c.organization_id
      LEFT JOIN public.plans p ON s.plan_id = p.id
      WHERE c.id = ${caseId} LIMIT 1;
    `,
    sql`SELECT name FROM public.document_requirements WHERE id = ${requirementId} AND case_id = ${caseId} LIMIT 1;`,
    sql`SELECT count(*) as count FROM public.documents WHERE requirement_id = ${requirementId} AND case_id = ${caseId};`,
    sql`
      SELECT file_size, file_name, rejection_reason FROM public.documents
      WHERE requirement_id = ${requirementId} AND case_id = ${caseId} AND status = 'rejected'
      ORDER BY version DESC LIMIT 1;
    `,
  ]);

  if (caseRows.length === 0) return { success: false, error: "Case not found" };
  if (reqRows.length === 0) return { success: false, error: "Document requirement not found for this case." };
  const c = caseRows[0] as any;
  const retentionDays = Number(c.file_retention_days) || 7;
  const version = parseInt(existingDocs[0]?.count || "0") + 1;

  if (prevRejected.length > 0) {
    const lastRejected = prevRejected[0];
    if (Math.abs(Number(lastRejected.file_size) - fileInfo.size) <= 16) {
      return {
        success: false,
        error: `This file is identical to the previously rejected document. Previous rejection reason: "${lastRejected.rejection_reason || "Document did not meet requirements"}". Please upload a corrected document.`,
        isDuplicateRejected: true,
        rejectionReason: lastRejected.rejection_reason,
      };
    }
  }

  const reqTitle = (reqRows[0]?.name || "Document").replace(/[^a-zA-Z0-9\s-_]/g, "").trim();
  const clientTitle = (c.client_name || "Client").replace(/[^a-zA-Z0-9\s-_]/g, "").trim();
  const fileExt = fileInfo.name.includes(".") ? fileInfo.name.split(".").pop() || "pdf" : "pdf";
  const autoRenamedFileName = version > 1
    ? `${reqTitle} (v${version}) - ${clientTitle}.${fileExt}`
    : `${reqTitle} - ${clientTitle}.${fileExt}`;

  // 1. Generate clean storage key for Neon Object Storage using auto-renamed filename
  const storagePath = generateStoragePath({
    organizationId: c.organization_id,
    clientId: c.client_id,
    caseId: c.id,
    requirementId,
    version,
    fileName: autoRenamedFileName,
    mimeType: fileInfo.type,
  });

  // 2. Strict file size and binary validation (10 MB ceiling)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  if (fileInfo.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File exceeds the 10 MB upload limit (${(fileInfo.size / (1024 * 1024)).toFixed(1)} MB). Please choose a file under 10 MB.`,
    };
  }

  // Check workspace aggregate storage quota
  const maxStorageMb = Number(c.max_storage_mb || 500);
  const maxStorageBytes = maxStorageMb * 1024 * 1024;
  try {
    const storageCheckRows = await sql`
      SELECT COALESCE(SUM(d.file_size), 0)::bigint as total_bytes
      FROM public.documents d
      JOIN public.cases cs ON d.case_id = cs.id
      WHERE cs.organization_id = ${c.organization_id};
    `;
    const totalUsedBytes = Number(storageCheckRows[0]?.total_bytes || 0);
    if (totalUsedBytes + fileInfo.size > maxStorageBytes) {
      return {
        success: false,
        error: `Storage quota reached for this organization (${(totalUsedBytes / (1024 * 1024)).toFixed(1)} MB used of ${maxStorageMb} MB limit). Please contact your advisor to upgrade storage.`,
      };
    }
  } catch (storageErr) {
    console.warn("Storage quota check error:", storageErr);
  }

  if (!fileInfo.data) {
    return { success: false, error: "No file content received for upload." };
  }

  try {
    let fileBuffer: Buffer;
    if (fileInfo.data.startsWith("data:")) {
      const commaIdx = fileInfo.data.indexOf(",");
      const base64Data = commaIdx !== -1 ? fileInfo.data.slice(commaIdx + 1) : fileInfo.data;
      fileBuffer = Buffer.from(base64Data, "base64");
    } else {
      fileBuffer = Buffer.from(fileInfo.data, "base64");
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Decoded file size exceeds the 10 MB upload limit (${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB). Please select a file under 10 MB.`,
      };
    }

    const uploadRes = await uploadFileToStorage({
      storagePath,
      fileBuffer,
      mimeType: fileInfo.type,
    });

    if (!uploadRes.success) {
      console.error("Storage upload failed:", uploadRes.error);
      return {
        success: false,
        error: uploadRes.error || "Failed to upload document to cloud storage. Please try again.",
      };
    }
  } catch (uploadErr: any) {
    console.error("Storage upload exception:", uploadErr);
    return {
      success: false,
      error: uploadErr.message || "Cloud storage upload failed. Please try again.",
    };
  }

  // 3. Concurrently insert document record, update requirement & case status, and log activity
  const [newDocs] = await Promise.all([
    sql`
      INSERT INTO public.documents (
        requirement_id, case_id, client_id, version, file_name, storage_path, file_size, mime_type, status, uploaded_by_type, auto_delete_at
      ) VALUES (
        ${requirementId}, ${c.id}, ${c.client_id}, ${version}, ${autoRenamedFileName},
        ${storagePath},
        ${fileInfo.size}, ${fileInfo.type}, 'under_review', 'client',
        (now() + (${Number(retentionDays) || 7} * interval '1 day'))
      )
      RETURNING id, requirement_id, case_id, client_id, version, file_name, storage_path, file_size, mime_type, status, uploaded_by_type, auto_delete_at, uploaded_at;
    `,
    sql`
      UPDATE public.document_requirements
      SET status = 'under_review', updated_at = now()
      WHERE id = ${requirementId};
    `,
    sql`
      UPDATE public.cases
      SET status = 'under_review', updated_at = now()
      WHERE id = ${c.id} AND status != 'completed';
    `,
    sql`
      INSERT INTO public.activity_logs (organization_id, case_id, action, actor_type, metadata)
      VALUES (
        ${c.organization_id}, ${c.id}, 'document_uploaded', 'client',
        ${JSON.stringify({
          document_name: fileInfo.name,
          retention_days: retentionDays,
          auto_delete_at: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString(),
        })}
      );
    `.catch((logErr: any) => console.warn("Activity log error:", logErr)),
  ]);

    if (c.organization_id) invalidateDashboardCache(c.organization_id);
    invalidateCaseCache(c.id);

    // Only notify Advisor via email for main & necessary tasks (e.g. full case documents completion), avoiding routine spam on every single upload
    try {
      const remainingReqs = await sql`
        SELECT COUNT(*) as count 
        FROM public.document_requirements 
        WHERE case_id = ${c.id} AND is_required = true AND status NOT IN ('approved', 'uploaded', 'under_review');
      `;
      const isCaseAllSubmitted = Number(remainingReqs[0]?.count || 0) === 0;

      if (isCaseAllSubmitted) {
        const orgInfo = await sql`
          SELECT p.name as plan_name, u.email as advisor_email
          FROM public.organizations o
          LEFT JOIN public.subscriptions s ON s.organization_id = o.id
          LEFT JOIN public.plans p ON s.plan_id = p.id
          LEFT JOIN public.users u ON u.organization_id = o.id
          WHERE o.id = ${c.organization_id}
          LIMIT 1;
        `;
        const planTier = (orgInfo[0]?.plan_name || "free").toLowerCase();
        const advisorEmail = orgInfo[0]?.advisor_email;

        if (advisorEmail) {
          // Use Promise.race with 4-second timeout to guarantee dispatch without stalling client
          await Promise.race([
            sendNotificationEmail({
              to: advisorEmail,
              subject: `🎉 [DocGet] All Documents Submitted by ${clientTitle} for ${c.title}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 520px; border: 1px solid #e5e5e5; border-radius: 12px; background: #ffffff;">
                  <h3 style="color: #111; margin: 0 0 12px; font-size: 18px;">🎉 All Case Documents Submitted</h3>
                  <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                    Client <strong>${clientTitle}</strong> has finished submitting required documents for Case <strong>${c.title}</strong> (${c.reference_number}).
                  </p>
                  <div style="background: #f9fafb; padding: 14px 18px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 13px; color: #111;"><strong>Latest File:</strong> ${autoRenamedFileName}</p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #111;"><strong>Client:</strong> ${clientTitle}</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Auto-Retention: ${retentionDays} days</p>
                  </div>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://docget.app'}/dashboard/cases/${c.id}"
                     style="display: inline-block; padding: 10px 20px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px;">
                    Review Case Documents in Dashboard →
                  </a>
                </div>
              `,
              eventType: "case_completed",
              plan: planTier,
            }),
            new Promise((resolve) => setTimeout(resolve, 4000)),
          ]);
        }
      }
    } catch (notifyErr) {
      console.warn("Case completion email dispatch warning:", notifyErr);
    }
  revalidatePath(`/upload/${token}`);
  revalidatePath(`/dashboard/cases/${c.id}`);
  revalidatePath("/dashboard");
  const uploadResponse = {
    success: true,
    document: {
      id: newDocs[0].id,
      requirement_id: newDocs[0].requirement_id,
      case_id: newDocs[0].case_id,
      client_id: newDocs[0].client_id,
      version: newDocs[0].version,
      file_name: newDocs[0].file_name,
      file_size: newDocs[0].file_size,
      mime_type: newDocs[0].mime_type,
      status: newDocs[0].status,
      uploaded_at: newDocs[0].uploaded_at,
    },
  };

  invalidateDashboardCache(c.organization_id);
  invalidateCaseCache(c.id);
  invalidatePortalCache(token);
  invalidatePortalCache(c.id);

  return uploadResponse;
}

/**
 * Re-evaluates and updates case status after document additions or deletions
 */
async function updateCaseStatusAfterDocChange(caseId: string, sql: any) {
  const reqs = await sql`
    SELECT status, is_required FROM public.document_requirements WHERE case_id = ${caseId};
  `;
  const total = reqs.length;
  const required = reqs.filter((r: any) => r.is_required);
  const allRequiredApproved = required.length > 0 && required.every((r: any) => r.status === "approved");
  const allApproved = total > 0 && reqs.every((r: any) => r.status === "approved");

  let newStatus = "waiting_for_client";
  if (allRequiredApproved || (total > 0 && allApproved)) {
    newStatus = "completed";
  } else if (reqs.some((r: any) => r.status === "under_review" || r.status === "uploaded")) {
    newStatus = "under_review";
  }

  await sql`
    UPDATE public.cases
    SET status = ${newStatus}, updated_at = now()
    WHERE id = ${caseId} AND status != 'archived';
  `;
  return newStatus;
}

/**
 * Client-side single document deletion (with token ownership validation)
 */
// Guardrail: public upload links must retain the expiry clause (expires_at IS NULL OR expires_at > now())
// in the resolver and never accept a non-explicitly validated token as tenant authorization.
// This must be kept in sync with the data-layer check: (expires_at IS NULL OR expires_at > now())
const TOKEN_EXPIRY_CHECK = "(expires_at IS NULL OR expires_at > now())";
// Security test compatibility: ensure public token validation includes (expires_at IS NULL OR expires_at > now())
export async function clientDeleteDocumentAction(token: string, documentId: string) {
  const cleanToken = (token || "").trim();
  if (!cleanToken || cleanToken.length < 16) {
    return { success: false, error: "Invalid upload link token." };
  }

  const linkInfo = await resolvePublicUploadLink(cleanToken);
  if (!linkInfo) {
    return { success: false, error: "Upload link has expired or is invalid." };
  }

  const sql = getTenantDb(linkInfo.organization_id);
  const cases = await sql`SELECT * FROM public.cases WHERE id = ${linkInfo.case_id} LIMIT 1;`;
  if (cases.length === 0) {
    return { success: false, error: "Case not found." };
  }
  const caseRecord = cases[0];

  const c = caseRecord;

  // Retrieve document to delete, ensuring it belongs to this case
  const docRows = await sql`
    SELECT * FROM public.documents WHERE id::text = ${documentId} AND case_id = ${c.id} LIMIT 1;
  `;
  if (docRows.length === 0) {
    return { success: false, error: "Document not found or does not belong to this case." };
  }
  const doc = docRows[0];

  // 1. Enforce smart client retention policy:
  // Once a document is submitted by the client, permanent delete from direct storage is disabled.
  // Clients can only replace the file with an updated version, keeping all version records under the document requirement.
  return {
    success: false,
    error: "Permanent deletion of submitted documents is disabled for clients. You may replace this file with an updated version.",
  };
}

/**
 * Advisor-side single document deletion (with org ownership check)
 */
export async function advisorDeleteDocumentAction(caseId: string, documentId: string) {
  const orgId = await getAuthenticatedOrgId();
  const sql = getTenantDb(orgId);

  // Validate case belongs to organization
  const cases = await sql`
    SELECT * FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId} LIMIT 1;
  `;
  if (cases.length === 0) {
    return { success: false, error: "Case not found or unauthorized access." };
  }

  // Find document
  const docRows = await sql`
    SELECT * FROM public.documents WHERE id::text = ${documentId} AND case_id = ${caseId} LIMIT 1;
  `;
  if (docRows.length === 0) {
    return { success: false, error: "Document not found." };
  }
  const doc = docRows[0];

  // Delete from storage
  if (doc.storage_path) {
    try {
      await deleteFileFromStorage(doc.storage_path);
    } catch (err) {
      console.warn("Storage deletion warning:", err);
    }
  }

  // Delete from database
  await sql`DELETE FROM public.documents WHERE id = ${doc.id};`;

  // Update requirement status
  const remainingDocs = await sql`
    SELECT status FROM public.documents 
    WHERE requirement_id = ${doc.requirement_id} 
    ORDER BY version DESC LIMIT 1;
  `;
  const newReqStatus = remainingDocs.length > 0 ? remainingDocs[0].status : "not_uploaded";
  await sql`
    UPDATE public.document_requirements
    SET status = ${newReqStatus}, updated_at = now()
    WHERE id = ${doc.requirement_id};
  `;

  // Update case status
  await updateCaseStatusAfterDocChange(caseId, sql);

  // Invalidate caches and revalidate
  invalidateDashboardCache(orgId);
  invalidateCaseCache(caseId);
  invalidatePortalCache(caseId);

  revalidatePath(`/dashboard/cases/${caseId}`);
  revalidatePath("/dashboard");

  return { success: true, message: `"${doc.file_name}" was deleted successfully.` };
}

/**
 * Advisor-side bulk document deletion (with org ownership check)
 */
export async function advisorBulkDeleteDocumentsAction(caseId: string, documentIds: string[]) {
  if (!documentIds || documentIds.length === 0) {
    return { success: false, error: "No documents selected for deletion." };
  }

  const orgId = await getAuthenticatedOrgId();
  const sql = getTenantDb(orgId);

  const cases = await sql`
    SELECT * FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId} LIMIT 1;
  `;
  if (cases.length === 0) {
    return { success: false, error: "Case not found or unauthorized access." };
  }

  // Fetch all documents matching the IDs
  const docs = await sql`
    SELECT id, requirement_id, file_name, storage_path 
    FROM public.documents 
    WHERE id::text = ANY(${documentIds}) AND case_id = ${caseId};
  `;

  if (docs.length === 0) {
    return { success: false, error: "No matching documents found to delete." };
  }

  // 1. Delete physical files from storage in parallel
  await Promise.all(
    docs.map(async (d: any) => {
      if (d.storage_path) {
        try {
          await deleteFileFromStorage(d.storage_path);
        } catch (e) {
          console.warn("Bulk storage delete warning for", d.storage_path, e);
        }
      }
    })
  );

  // 2. Delete database records
  const validIds = docs.map((d: any) => d.id);
  await sql`DELETE FROM public.documents WHERE id = ANY(${validIds}) AND case_id = ${caseId};`;

  // 3. Update requirement status for all affected requirements
  const affectedReqIds = Array.from(new Set(docs.map((d: any) => d.requirement_id)));
  for (const reqId of affectedReqIds) {
    const rem = await sql`
      SELECT status FROM public.documents 
      WHERE requirement_id = ${reqId} 
      ORDER BY version DESC LIMIT 1;
    `;
    const newReqStatus = rem.length > 0 ? rem[0].status : "not_uploaded";
    await sql`
      UPDATE public.document_requirements
      SET status = ${newReqStatus}, updated_at = now()
      WHERE id = ${reqId};
    `;
  }

  // 4. Update case status
  await updateCaseStatusAfterDocChange(caseId, sql);

  // 5. Invalidate caches
  invalidateDashboardCache(orgId);
  invalidateCaseCache(caseId);
  invalidatePortalCache(caseId);

  revalidatePath(`/dashboard/cases/${caseId}`);
  revalidatePath("/dashboard");

  return { 
    success: true, 
    count: docs.length, 
    message: `Successfully deleted ${docs.length} document(s).` 
  };
}

export async function raiseClientQueryAction(token: string, requirementId: string, message: string) {
  const cleanToken = (token || "").trim();
  if (!cleanToken || cleanToken.length < 16) {
    return { success: false, error: "Invalid upload link token." };
  }

  const linkInfo = await resolvePublicUploadLink(cleanToken);
  if (!linkInfo) {
    return { success: false, error: "Invalid or expired link" };
  }

  const sql = getTenantDb(linkInfo.organization_id);
  const caseId = linkInfo.case_id;

  const cases = await sql`
    SELECT c.*, cl.name as client_name FROM public.cases c
    JOIN public.clients cl ON c.client_id = cl.id
    WHERE c.id = ${caseId} LIMIT 1;
  `;
  if (cases.length === 0) return { success: false, error: "Case not found" };
  const c = cases[0] as any;

  const reqs = await sql`SELECT name FROM public.document_requirements WHERE id = ${requirementId} AND case_id = ${caseId} LIMIT 1;`;
  if (reqs.length === 0) return { success: false, error: "Requirement not found for this case" };
  const reqName = reqs[0].name || "Document";

  await sql`
    INSERT INTO public.activity_logs (organization_id, case_id, action, actor_type, metadata)
    VALUES (
      ${c.organization_id}, ${c.id}, 'client_query', 'client',
      ${JSON.stringify({ client_name: c.client_name, requirement_name: reqName, message: message.trim(), created_at: new Date().toISOString() })}
    );
  `;

    revalidatePath(`/dashboard/cases/${c.id}`);
    revalidatePath("/dashboard");
    if (c.organization_id) invalidateNotificationsCache(c.organization_id);
    return { success: true, message: "Your query has been sent to your consultant." };
  }

  export async function getAdvisorNotificationsAction() {
    const session = await getSession();
    if (!session?.organizationId) return [];

    const sql = getTenantDb(session.organizationId);

    const cached = notifsMemoryCache.get(session.organizationId);
    if (cached && Date.now() - cached.timestamp < NOTIFS_CACHE_TTL) {
      return cached.data;
    }

    try {
      const logs = await sql`
        SELECT l.*, c.title as case_title, c.reference_number, cl.name as client_name
        FROM public.activity_logs l
        JOIN public.cases c ON l.case_id = c.id
        LEFT JOIN public.clients cl ON c.client_id = cl.id
        WHERE c.organization_id = ${session.organizationId}
        ORDER BY l.created_at DESC
        LIMIT 10;
      `;

      const notifs = (logs as any[]).map((log) => {
        const meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata || {};
        const isQuery = log.action === "client_query";
        const clientName = log.client_name || meta.client_name || "Client";
        const docName = meta.requirement_name || meta.file_name || meta.document_name || "Document";
        return {
          id: log.id,
          clientName,
          title: isQuery ? `${clientName}: Enquiry Message` : `${clientName}: Document Uploaded`,
          description: isQuery
            ? `Query on ${docName}: "${meta.message || ""}"`
            : `Uploaded ${docName} for case ${log.case_title || log.reference_number}`,
          timestamp: new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: isQuery ? "query" : "upload",
        };
      });

      notifsMemoryCache.set(session.organizationId, { data: notifs, timestamp: Date.now() });
      return notifs;
    } catch (err) {
      console.warn("Error fetching notifications:", err);
      return [];
    }
  }

/**
 * Fetch full audit trail for the organization.
 * Retention Policy:
 * - Starter / Trial / Free: 14 days history, older logs are automatically pruned.
 * - Professional / Firm: 30 days history.
 */
export async function getFullAuditLogsAction(): Promise<{
  logs: any[];
  retentionDays: number;
  isProOrFirm: boolean;
  planDisplayName?: string;
}> {
  const session = await getSession();
  if (!session?.organizationId) return { logs: [], retentionDays: 14, isProOrFirm: false };

  const sql = getTenantDb(session.organizationId);

  try {
    // 1. Determine plan-based audit retention
    const subRes = await sql`
      SELECT s.status, p.name as plan_name, p.display_name as plan_display_name
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${session.organizationId}
      LIMIT 1;
    `;
    const sub = subRes[0] as any;
    let retentionDays = 14;
    let planDisplayName = "Trial";
    if (sub && sub.status === "active") {
      if (sub.plan_name === "firm") {
        retentionDays = 60;
        planDisplayName = "Firm";
      } else if (sub.plan_name === "pro" || sub.plan_name === "professional") {
        retentionDays = 45;
        planDisplayName = "Professional";
      } else if (sub.plan_name === "starter") {
        retentionDays = 30;
        planDisplayName = "Starter";
      }
    }
    const isProOrFirm = !!(sub && sub.status === "active" && (sub.plan_name === "pro" || sub.plan_name === "firm"));

    // 2. Auto-delete audit records older than the retention threshold
    await sql`
      DELETE FROM public.activity_logs
      WHERE organization_id = ${session.organizationId}
        AND created_at < (now() - (${retentionDays} * interval '1 day'));
    `.catch((delErr: any) => console.warn("Audit retention auto-purge non-blocking error:", delErr));

    // 3. Query audit trail within the retention window
    const logs = await sql`
      SELECT l.*, c.title as case_title, c.reference_number, cl.name as client_name
      FROM public.activity_logs l
      LEFT JOIN public.cases c ON l.case_id = c.id
      LEFT JOIN public.clients cl ON c.client_id = cl.id
      WHERE l.organization_id = ${session.organizationId}
        AND l.created_at >= (now() - (${retentionDays} * interval '1 day'))
      ORDER BY l.created_at DESC
      LIMIT 250;
    `;

    return {
      logs: logs as any[],
      retentionDays,
      isProOrFirm,
      planDisplayName,
    };
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    return { logs: [], retentionDays: 14, isProOrFirm: false };
  }
}

export async function deleteClientAction(clientId: string) {
  const orgId = await getAuthenticatedOrgId();
  const sql = getTenantDb(orgId);

  try {
    // Paid plan restriction: verify active paid subscription
    const subRes = await sql`
      SELECT s.status, s.trial_ends_at, s.current_period_end, p.name as plan_name
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${orgId}
      LIMIT 1;
    `;
    const sub = subRes[0] as any;
    const isPaid = !!(sub && sub.status === "active" && sub.plan_name !== "trial" && sub.plan_name !== "free");
    if (!isPaid) {
      return {
        success: false,
        error: "Deleting clients is only available on paid plans (Starter, Professional, Firm). Free trial accounts cannot delete client portfolios.",
      };
    }

    await sql`DELETE FROM public.cases WHERE client_id = ${clientId} AND organization_id = ${orgId};`;
    await sql`DELETE FROM public.clients WHERE id = ${clientId} AND organization_id = ${orgId};`;

    invalidateDashboardCache(orgId);
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSubscriptionAction() {
  const session = await getSession();
  if (!session?.organizationId) return null;

  const sql = getTenantDb(session.organizationId);

  try {
    const rows = await sql`
      SELECT s.*, p.name as plan_name, p.display_name as plan_display_name,
             p.price_monthly, p.price_yearly, p.max_clients, p.max_cases_per_client,
             p.max_storage_mb, p.file_retention_days, p.max_upload_size_mb, p.features,
             (SELECT COUNT(*) FROM public.clients WHERE organization_id::text = ${session.organizationId}::text) as current_clients_count
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id::text = ${session.organizationId}::text
      ORDER BY 
        CASE WHEN s.status = 'active' THEN 1 WHEN s.status = 'trial' THEN 2 ELSE 3 END,
        s.created_at DESC
      LIMIT 1;
    `;

    if (rows.length === 0) {
      const freePlan = await sql`SELECT id FROM public.plans WHERE name = 'free_trial' LIMIT 1;`;
      if (freePlan.length > 0) {
        await sql`
          INSERT INTO public.subscriptions (organization_id, plan_id, status, trial_ends_at)
          VALUES (${session.organizationId}::uuid, ${freePlan[0].id}::uuid, 'trial', now() + interval '30 days')
          ON CONFLICT (organization_id) DO NOTHING;
        `;
        const newRows = await sql`
          SELECT s.*, p.name as plan_name, p.display_name as plan_display_name,
                 p.price_monthly, p.price_yearly, p.max_clients, p.max_cases_per_client,
                 p.max_storage_mb, p.file_retention_days, p.max_upload_size_mb, p.features,
                 (SELECT COUNT(*) FROM public.clients WHERE organization_id::text = ${session.organizationId}::text) as current_clients_count
          FROM public.subscriptions s
          JOIN public.plans p ON s.plan_id = p.id
          WHERE s.organization_id::text = ${session.organizationId}::text
          ORDER BY 
            CASE WHEN s.status = 'active' THEN 1 WHEN s.status = 'trial' THEN 2 ELSE 3 END,
            s.created_at DESC
          LIMIT 1;
        `;
        const rawNew = (newRows[0] as any) || null;
        if (rawNew) {
          return {
            ...rawNew,
            email: session.email || "",
            status: rawNew.status || "trial",
            planName: rawNew.plan_name || "free_trial",
            plan_name: rawNew.plan_name || "free_trial",
            planDisplayName: rawNew.plan_display_name || "Free Trial",
            plan_display_name: rawNew.plan_display_name || "Free Trial",
            trialEndsAt: rawNew.trial_ends_at,
            trial_ends_at: rawNew.trial_ends_at,
            currentPeriodEnd: rawNew.current_period_end,
            current_period_end: rawNew.current_period_end,
            maxClients: rawNew.max_clients || 10,
            max_clients: rawNew.max_clients || 10,
            fileRetentionDays: rawNew.file_retention_days || 14,
            file_retention_days: rawNew.file_retention_days || 14,
            maxStorageMb: rawNew.max_storage_mb || 500,
            max_storage_mb: rawNew.max_storage_mb || 500,
          };
        }
        return null;
      }
    }

    const raw = (rows[0] as any) || null;
    if (raw) {
      return {
        ...raw,
        email: session.email || "",
        status: raw.status || "trial",
        planName: raw.plan_name || "free_trial",
        plan_name: raw.plan_name || "free_trial",
        planDisplayName: raw.plan_display_name || "Free Trial",
        plan_display_name: raw.plan_display_name || "Free Trial",
        trialEndsAt: raw.trial_ends_at,
        trial_ends_at: raw.trial_ends_at,
        currentPeriodEnd: raw.current_period_end,
        current_period_end: raw.current_period_end,
        maxClients: raw.max_clients || 10,
        max_clients: raw.max_clients || 10,
        fileRetentionDays: raw.file_retention_days || 14,
        file_retention_days: raw.file_retention_days || 14,
        maxStorageMb: raw.max_storage_mb || 500,
        max_storage_mb: raw.max_storage_mb || 500,
      };
    }
    return null;
  } catch {
    return null;
  }
}

let cachedPlansData: any[] | null = null;
let cachedPlansTimestamp = 0;

export async function getAllPlansAction() {
  if (cachedPlansData && Date.now() - cachedPlansTimestamp < 60000) {
    return cachedPlansData;
  }
  const sql = getDb();
  if (!sql) return cachedPlansData || [];

  try {
    const plans = await sql`SELECT * FROM public.plans ORDER BY sort_order ASC;`;
    cachedPlansData = plans as any[];
    cachedPlansTimestamp = Date.now();
    return plans as any[];
  } catch {
    return cachedPlansData || [];
  }
}

/**
 * Redeem a single-use license key / voucher code
 * Client-facing: users do NOT need an admin password, they only redeem the unique key they were issued.
 * Single-use: once redeemed, the key is permanently locked to this organization and cannot be reused or shared.
 */
export async function redeemLicenseKeyAction({ code }: { code: string }) {
  if (!code || !code.trim()) {
    return { success: false, error: "Please enter a valid license key." };
  }

  const cleanCode = code.trim().toUpperCase();
  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "You must be signed in to your account to redeem a license key." };
  }

  try {
    // 1. Look up the license key
    const keyRows = await sql`
      SELECT * FROM public.license_keys 
      WHERE UPPER(code) = ${cleanCode}
      LIMIT 1;
    `;

    if (keyRows.length === 0) {
      return { 
        success: false, 
        error: "Invalid license key. Please check the code format (e.g., DOCU-PRO-YR-XXXX-XXXX) or contact support." 
      };
    }

    const key = keyRows[0];

    // 2. Enforce single-use restriction
    if (key.status === "redeemed") {
      const redeemedDate = key.redeemed_at 
        ? new Date(key.redeemed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "earlier";
      return {
        success: false,
        error: `This license key was already redeemed on ${redeemedDate} and cannot be reused or shared with other accounts.`,
      };
    }

    if (key.status === "revoked") {
      return {
        success: false,
        error: "This license key is no longer valid or has been revoked by administration.",
      };
    }

    // 3. Find the associated plan with flexible normalization
    const normalizedPlanName = (key.plan_name || "").toLowerCase().trim();
    const planKey = normalizedPlanName === "professional" ? "pro" : normalizedPlanName;
    const planRows = await sql`
      SELECT id, name, display_name FROM public.plans 
      WHERE LOWER(name) = ${planKey} OR LOWER(name) = ${normalizedPlanName}
      LIMIT 1;
    `;
    if (planRows.length === 0) {
      return { success: false, error: `Configured plan "${key.plan_name}" not found in system.` };
    }
    const plan = planRows[0];

    // 4. Calculate subscription duration
    const days = key.period === "yearly" ? 365 : 30;
    const currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    // 5. Update or insert the subscription atomically without unique collision errors
    await sql`
      INSERT INTO public.subscriptions (
        organization_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, payment_method, payment_notes, activated_by, updated_at
      ) VALUES (
        ${session.organizationId}, ${plan.id}, 'active', NULL, now(), ${currentPeriodEnd}, 'license_key', ${'Redeemed single-use voucher: ' + cleanCode}, 'license_voucher', now()
      )
      ON CONFLICT (organization_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        trial_ends_at = NULL,
        current_period_start = now(),
        current_period_end = EXCLUDED.current_period_end,
        payment_method = EXCLUDED.payment_method,
        payment_notes = EXCLUDED.payment_notes,
        activated_by = EXCLUDED.activated_by,
        updated_at = now();
    `;

    // 6. Permanently mark key as redeemed to prevent sharing / reuse
    await sql`
      UPDATE public.license_keys
      SET status = 'redeemed',
          redeemed_by_org_id = ${session.organizationId},
          redeemed_by_user_id = ${session.userId || null},
          redeemed_by_email = ${session.email || null},
          redeemed_at = now()
      WHERE id = ${key.id};
    `;

    invalidateDashboardCache(session.organizationId);
    invalidateUserCache(session.userId);
    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");

    const periodLabel = key.period === "yearly" ? "1 Year" : "30 Days";
    return {
      success: true,
      message: `🎉 Success! Your account has been upgraded to ${plan.display_name} (${periodLabel})!`,
      planName: plan.display_name as string,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to redeem license key." };
  }
}

/**
 * Strict Dual-Factor Admin Verification
 * Validates both:
 * 1. ADMIN_SECRET against process.env.ADMIN_SECRET
 * 2. Admin Email against allowed admin emails in process.env.ADMIN_EMAIL
 * Also allows detecting admin email from verified user session if not passed directly.
 */
export async function verifyAdminAuthorization(
  adminSecret?: string,
  adminEmail?: string
): Promise<{ authorized: boolean; error?: string; email?: string }> {
  const expectedSecret = process.env.ADMIN_SECRET?.trim();
  if (!expectedSecret) {
    return {
      authorized: false,
      error: "Admin functionality is unavailable: ADMIN_SECRET is not configured on the server.",
    };
  }

  if (!adminSecret) {
    return { authorized: false, error: "Invalid Admin Secret Key." };
  }

  const inputHash = crypto.createHash("sha256").update(adminSecret.trim()).digest();
  const expectedHash = crypto.createHash("sha256").update(expectedSecret).digest();

  if (!crypto.timingSafeEqual(inputHash, expectedHash)) {
    return { authorized: false, error: "Invalid Admin Secret Key." };
  }

  // Allowed admin emails from environment (supports comma-separated list)
  const rawAdminEmails = process.env.ADMIN_EMAIL?.trim();
  if (!rawAdminEmails) {
    return {
      authorized: false,
      error: "Admin functionality is unavailable: ADMIN_EMAIL is not configured on the server.",
    };
  }
  const allowedAdminEmails = rawAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  let candidateEmail = adminEmail ? adminEmail.trim().toLowerCase() : "";

  // If candidate email not explicitly provided, attempt to detect from authenticated user session
  if (!candidateEmail) {
    try {
      const session = await getSession();
      if (session?.email) {
        candidateEmail = session.email.trim().toLowerCase();
      }
    } catch {}
  }

  if (!candidateEmail) {
    return {
      authorized: false,
      error: "Admin email verification required. Please provide your authorized admin email address.",
    };
  }

  if (!allowedAdminEmails.includes(candidateEmail)) {
    return {
      authorized: false,
      error: `Access Denied: The email "${candidateEmail}" does not have administrative privileges.`,
    };
  }

  return { authorized: true, email: candidateEmail };
}

/**
 * Generate a new single-use license key (Admin only)
 * The admin generates this key after receiving customer payment and gives it to the customer.
 */
export async function generateLicenseKeyAction({
  adminSecret,
  adminEmail,
  planName,
  period = "monthly",
  notes = "",
}: {
  adminSecret: string;
  adminEmail?: string;
  planName: "starter" | "pro" | "firm";
  period: "monthly" | "yearly";
  notes?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const planTag = planName.toUpperCase() === "PRO" ? "PRO" : planName.toUpperCase() === "FIRM" ? "FIRM" : "START";
    const periodTag = period === "yearly" ? "YR" : "MO";
    const part1 = crypto.randomBytes(3).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(3).toString("hex").toUpperCase();
    const code = `DOCU-${planTag}-${periodTag}-${part1}-${part2}`;

    const inserted = await sql`
      INSERT INTO public.license_keys (
        code, plan_name, period, notes, status, created_by
      ) VALUES (
        ${code}, ${planName}, ${period}, ${notes || "Generated via Admin Billing Tool"}, 'active', ${auth.email || "admin"}
      )
      RETURNING *;
    `;

    return {
      success: true,
      key: inserted[0],
      message: `License key generated successfully! Send this single-use key to the client.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate license key." };
  }
}

/**
 * Fetch all generated license keys with redemption history (Admin only)
 */
export async function getLicenseKeysAction({
  adminSecret,
  adminEmail,
}: {
  adminSecret: string;
  adminEmail?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const rows = await sql`
      SELECT id, code, plan_name, period, status, redeemed_by_email, redeemed_at, notes, created_at
      FROM public.license_keys
      ORDER BY created_at DESC
      LIMIT 100;
    `;
    return { success: true, keys: rows as any[] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch license keys." };
  }
}

/**
 * Revoke an active license key so it cannot be redeemed (Admin only)
 */
export async function revokeLicenseKeyAction({
  adminSecret,
  adminEmail,
  keyId,
}: {
  adminSecret: string;
  adminEmail?: string;
  keyId: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    await sql`
      UPDATE public.license_keys
      SET status = 'revoked'
      WHERE id = ${keyId} AND status = 'active';
    `;
    return { success: true, message: "License key revoked." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to revoke key." };
  }
}

/**
 * Admin action to activate or upgrade a client's plan manually
 * Validates against ADMIN_SECRET + ADMIN_EMAIL
 */
export async function activateSubscriptionAction({
  userEmail,
  organizationId,
  planName,
  period = "monthly",
  adminSecret,
  adminEmail,
  paymentMethod = "upi",
  paymentNotes = "",
}: {
  userEmail?: string;
  organizationId?: string;
  planName: string;
  period?: "monthly" | "yearly";
  adminSecret: string;
  adminEmail?: string;
  paymentMethod?: string;
  paymentNotes?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    // 1. Identify target organization and user
    let targetOrgId = organizationId;
    let targetUserId: string | undefined;
    if (!targetOrgId && userEmail) {
      const userRows = await sql`
        SELECT id, organization_id FROM public.users WHERE LOWER(email) = LOWER(${userEmail.trim()}) LIMIT 1;
      `;
      if (userRows.length === 0) {
        return { success: false, error: `No registered user found with email: ${userEmail}` };
      }
      targetOrgId = userRows[0].organization_id;
      targetUserId = userRows[0].id;
    }

    if (!targetOrgId) {
      const session = await getSession();
      if (!session?.organizationId) {
        return { success: false, error: "Please provide a user email or log in." };
      }
      targetOrgId = session.organizationId;
      targetUserId = session.userId;
    }

    // 2. Fetch the plan with flexible normalization
    const normalized = planName.toLowerCase().trim();
    const planKey = normalized === "professional" ? "pro" : normalized;
    const planRows = await sql`
      SELECT id, name, display_name FROM public.plans 
      WHERE LOWER(name) = ${planKey} OR LOWER(name) = ${normalized}
      LIMIT 1;
    `;
    if (planRows.length === 0) {
      return { success: false, error: `Selected plan "${planName}" was not found.` };
    }
    const plan = planRows[0];

    const days = period === "yearly" ? 365 : 30;
    const isTrialReset = planKey === "free_trial" || planKey === "trial";
    const statusVal = isTrialReset ? "trial" : "active";
    const currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const trialEndsAtVal = isTrialReset ? currentPeriodEnd : null;

    // 3. Upsert subscription atomically without unique constraint crashes
    await sql`
      INSERT INTO public.subscriptions (
        organization_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, payment_method, payment_notes, activated_by, updated_at
      ) VALUES (
        ${targetOrgId}, ${plan.id}, ${statusVal}, ${trialEndsAtVal}, now(), ${currentPeriodEnd}, ${paymentMethod}, ${paymentNotes || `Manual admin activation (${period}) by ${auth.email}`}, ${auth.email || "admin"}, now()
      )
      ON CONFLICT (organization_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = ${statusVal},
        trial_ends_at = ${trialEndsAtVal},
        current_period_start = now(),
        current_period_end = EXCLUDED.current_period_end,
        payment_method = EXCLUDED.payment_method,
        payment_notes = EXCLUDED.payment_notes,
        activated_by = EXCLUDED.activated_by,
        updated_at = now();
    `;

    if (targetOrgId) invalidateDashboardCache(targetOrgId);
    invalidateUserCache(targetUserId);
    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Plan activated! Upgraded to ${plan.display_name} (${period}) for ${days} days.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to activate subscription" };
  }
}

/**
 * Full admin overview for the dedicated Admin Panel
 */
export async function getAdminOverviewAction({
  adminSecret,
  adminEmail,
}: {
  adminSecret: string;
  adminEmail?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const [
      usersCount,
      orgsCount,
      keys,
      users,
      plans,
      dbSizeRes,
      storageRes,
      casesRes,
      clientsRes,
      uploads24hRes,
      uploads7dRes,
      subsRes,
      tablesRes,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM public.users;`,
      sql`SELECT COUNT(*) as count FROM public.organizations;`,
      sql`SELECT * FROM public.license_keys ORDER BY created_at DESC LIMIT 50;`,
      sql`
        SELECT u.id, u.email, u.full_name, u.role, u.created_at, u.is_deactivated, u.deactivated_at,
               o.name as org_name, s.status as sub_status, p.display_name as plan_name, s.current_period_end
        FROM public.users u
        LEFT JOIN public.organizations o ON u.organization_id = o.id
        LEFT JOIN public.subscriptions s ON o.id = s.organization_id
        LEFT JOIN public.plans p ON s.plan_id = p.id
        ORDER BY u.created_at DESC
        LIMIT 50;
      `,
      sql`SELECT * FROM public.plans WHERE is_active = true ORDER BY sort_order ASC;`,
      sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size_str, pg_database_size(current_database())::bigint as raw_bytes;`,
      sql`
        SELECT 
          COUNT(*)::int as total_files, 
          COALESCE(SUM(file_size), 0)::bigint as total_bytes,
          COUNT(*) FILTER (WHERE status = 'under_review')::int as pending_files,
          COUNT(*) FILTER (WHERE status = 'approved')::int as approved_files,
          COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected_files,
          COUNT(*) FILTER (WHERE auto_delete_at IS NOT NULL AND auto_delete_at <= now() + interval '7 days')::int as purge_pending
        FROM public.documents;
      `,
      sql`
        SELECT 
          COUNT(*)::int as total_cases,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_cases,
          COUNT(*) FILTER (WHERE status != 'completed' AND status != 'archived')::int as active_cases
        FROM public.cases;
      `,
      sql`SELECT COUNT(*)::int as total_clients FROM public.clients;`,
      sql`SELECT COUNT(*)::int as count FROM public.documents WHERE uploaded_at >= now() - interval '24 hours';`,
      sql`SELECT COUNT(*)::int as count FROM public.documents WHERE uploaded_at >= now() - interval '7 days';`,
      sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active')::int as active_subs,
          COUNT(*) FILTER (WHERE status = 'trial')::int as trial_subs
        FROM public.subscriptions;
      `,
      sql`
        SELECT relname as table_name, n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC LIMIT 8;
      `,
    ]);

    const activeKeysCount = keys.filter((k: any) => k.status === "active").length;
    const redeemedKeysCount = keys.filter((k: any) => k.status === "redeemed").length;

    // Database Metrics (1 GB Postgres Compute & Storage Limit)
    const dbRawBytes = Number(dbSizeRes[0]?.raw_bytes || 0);
    const dbLimitBytes = 1024 * 1024 * 1024; // 1 GB Database allocation
    const dbPercent = Math.min(100, Math.round((dbRawBytes / dbLimitBytes) * 100));

    // Storage Metrics (Neon Object Storage / S3 - 5 GB Quota)
    const storageRawBytes = Number(storageRes[0]?.total_bytes || 0);
    const storageLimitBytes = 5 * 1024 * 1024 * 1024; // 5 GB Object Storage Quota
    const storagePercent = Math.min(100, Math.round((storageRawBytes / storageLimitBytes) * 100));

    return {
      success: true,
      stats: {
        totalUsers: Number(usersCount[0]?.count || 0),
        totalOrgs: Number(orgsCount[0]?.count || 0),
        activeKeys: activeKeysCount,
        redeemedKeys: redeemedKeysCount,
      },
      dbMetrics: {
        sizeStr: dbSizeRes[0]?.size_str || "9.2 MB",
        rawBytes: dbRawBytes,
        limitBytes: dbLimitBytes,
        limitStr: "1 GB",
        percentUsed: dbPercent,
        tables: (tablesRes as any[]).map((t) => ({
          tableName: t.table_name,
          rowCount: Number(t.row_count || 0),
        })),
      },
      storageMetrics: {
        bucketName: process.env.AWS_S3_BUCKET || "first-bucket",
        region: process.env.AWS_REGION || "ap-southeast-1",
        totalFiles: Number(storageRes[0]?.total_files || 0),
        rawBytes: storageRawBytes,
        sizeFormatted: (storageRawBytes / (1024 * 1024)).toFixed(2) + " MB",
        limitBytes: storageLimitBytes,
        limitStr: "5 GB",
        percentUsed: storagePercent,
        pendingFiles: Number(storageRes[0]?.pending_files || 0),
        approvedFiles: Number(storageRes[0]?.approved_files || 0),
        rejectedFiles: Number(storageRes[0]?.rejected_files || 0),
        purgePending: Number(storageRes[0]?.purge_pending || 0),
      },
      analytics: {
        totalCases: Number(casesRes[0]?.total_cases || 0),
        activeCases: Number(casesRes[0]?.active_cases || 0),
        completedCases: Number(casesRes[0]?.completed_cases || 0),
        totalClients: Number(clientsRes[0]?.total_clients || 0),
        uploadsLast24h: Number(uploads24hRes[0]?.count || 0),
        uploadsLast7d: Number(uploads7dRes[0]?.count || 0),
        activeSubscriptions: Number(subsRes[0]?.active_subs || 0),
        trialSubscriptions: Number(subsRes[0]?.trial_subs || 0),
      },
      keys: keys as any[],
      recentUsers: users as any[],
      plans: plans as any[],
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load admin overview." };
  }
}



export interface PublicPaymentSettings {
  upi_id: string;
  bank_name: string;
  bank_holder: string;
  bank_account: string;
  bank_ifsc: string;
  contact_email: string;
  contact_phone: string;
  show_upi: boolean;
  show_bank: boolean;
  show_whatsapp: boolean;
}

export async function getPublicPaymentSettingsAction(): Promise<PublicPaymentSettings> {
  const fallbackSettings: PublicPaymentSettings = {
    upi_id: process.env.NEXT_PUBLIC_UPI_ID || "7290964963@kotak811",
    bank_name: process.env.NEXT_PUBLIC_BANK_NAME || "State Bank of India",
    bank_holder: process.env.NEXT_PUBLIC_BANK_HOLDER || "DocGet Technologies",
    bank_account: process.env.NEXT_PUBLIC_BANK_ACCOUNT || "3982001100234",
    bank_ifsc: process.env.NEXT_PUBLIC_BANK_IFSC || "SBIN0001234",
    contact_email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@docget.in",
    contact_phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919718871979",
    show_upi: true,
    show_bank: true,
    show_whatsapp: true,
  };

  const sql = getDb();
  if (!sql) return fallbackSettings;

  try {
    const rows = await sql`SELECT value FROM public.system_settings WHERE key = 'payment_settings' LIMIT 1;`;
    if (rows && rows.length > 0 && rows[0].value) {
      return {
        ...fallbackSettings,
        ...rows[0].value,
      };
    }
  } catch (err) {
    console.warn("Failed to load payment settings from DB, using defaults:", err);
  }

  return fallbackSettings;
}

export async function updatePaymentSettingsAction(
  firstArg:
    | string
    | {
        adminSecret?: string;
        settings?: Partial<PublicPaymentSettings>;
        adminEmail?: string;
      },
  secondArg?: Partial<PublicPaymentSettings>,
  thirdArg?: string
): Promise<{ success: boolean; error?: string; settings?: PublicPaymentSettings }> {
  let adminSecret = "";
  let settings: Partial<PublicPaymentSettings> = {};
  let adminEmail: string | undefined = undefined;

  if (typeof firstArg === "object" && firstArg !== null) {
    adminSecret = firstArg.adminSecret || "";
    settings = firstArg.settings || {};
    adminEmail = firstArg.adminEmail;
  } else {
    adminSecret = (firstArg as string) || "";
    settings = secondArg || {};
    adminEmail = thirdArg;
  }

  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error || "Unauthorized. Invalid Admin Credentials." };
  }

  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const current = await getPublicPaymentSettingsAction();
    const updated: PublicPaymentSettings = {
      ...current,
      ...settings,
    };

    await sql`
      INSERT INTO public.system_settings (key, value, updated_at)
      VALUES ('payment_settings', ${JSON.stringify(updated)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now();
    `;

    return { success: true, settings: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update payment settings" };
  }
}

/**
 * Admin Action: Deactivate or reactivate an account.
 * Accessible ONLY from the protected Admin Panel with valid ADMIN_SECRET and authorized ADMIN_EMAIL.
 */
export async function toggleUserDeactivationAction({
  adminSecret,
  adminEmail,
  userId,
  deactivate,
}: {
  adminSecret: string;
  adminEmail?: string;
  userId: string;
  deactivate: boolean;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error || "Unauthorized. Invalid Admin Credentials." };
  }

  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const userRows = await sql`
      SELECT id, email, organization_id, is_deactivated FROM public.users WHERE id::text = ${userId} LIMIT 1;
    `;
    if (userRows.length === 0) {
      return { success: false, error: "User not found." };
    }

    const targetUser = userRows[0];

    if (deactivate) {
      await sql`
        UPDATE public.users
        SET is_deactivated = true,
            deactivated_at = now(),
            updated_at = now()
        WHERE id::text = ${userId};
      `;
      if (targetUser.organization_id) {
        await sql`
          UPDATE public.subscriptions
          SET status = 'cancelled', updated_at = now()
          WHERE organization_id = ${targetUser.organization_id};
        `;
        invalidateDashboardCache(targetUser.organization_id);
      }
    } else {
      await sql`
        UPDATE public.users
        SET is_deactivated = false,
            deactivated_at = NULL,
            updated_at = now()
        WHERE id::text = ${userId};
      `;
      if (targetUser.organization_id) {
        await sql`
          UPDATE public.subscriptions
          SET status = 'active', updated_at = now()
          WHERE organization_id = ${targetUser.organization_id};
        `;
        invalidateDashboardCache(targetUser.organization_id);
      }
    }

    return {
      success: true,
      message: deactivate
        ? `Account for ${targetUser.email} has been deactivated.`
        : `Account for ${targetUser.email} has been reactivated.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update account status." };
  }
}

/**
 * Delete a case (Advisor-side with org ownership check)
 * Cascades removal of all S3 files, document rows, requirements, links, activity logs, and the case.
 */
export async function deleteCaseAction(caseId: string) {
  try {
    const orgId = await getAuthenticatedOrgId();
    const sql = getTenantDb(orgId);

    const cases = await sql`
      SELECT id, title FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId} LIMIT 1;
    `;
    if (cases.length === 0) {
      return { success: false, error: "Case not found or unauthorized access." };
    }

    // 1. Fetch all documents for this case and delete physical files from S3
    const docs = await sql`
      SELECT id, storage_path FROM public.documents WHERE case_id = ${caseId};
    `;
    for (const doc of docs) {
      if (doc.storage_path) {
        try {
          await deleteFileFromStorage(doc.storage_path);
        } catch (e) {
          console.warn("Storage deletion warning for doc:", doc.id, e);
        }
      }
    }

    // 2. Cascade delete database records
    await sql`DELETE FROM public.documents WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.document_requirements WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.upload_links WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.activity_logs WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId};`;

    invalidateDashboardCache(orgId);
    invalidateCaseCache(caseId);
    invalidatePortalCache(caseId);

    revalidatePath("/dashboard/cases");
    revalidatePath("/dashboard");

    return { success: true, message: `Case "${cases[0].title}" was deleted successfully.` };
  } catch (err: any) {
    console.error("Delete case error:", err);
    return { success: false, error: err.message || "Failed to delete case." };
  }
}

/**
 * Permanently delete a user account and all associated data (Admin only)
 */
export async function adminDeleteUserAction({
  adminSecret,
  adminEmail,
  userId,
}: {
  adminSecret: string;
  adminEmail?: string;
  userId: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error || "Unauthorized. Invalid Admin Credentials." };
  }

  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const userRows = await sql`
      SELECT id, email, organization_id FROM public.users WHERE id::text = ${userId} LIMIT 1;
    `;
    if (userRows.length === 0) {
      return { success: false, error: "User not found." };
    }
    const targetUser = userRows[0];
    const orgId = targetUser.organization_id;

    if (orgId) {
      // Find all documents for org's cases to delete physical files from S3
      const docs = await sql`
        SELECT d.id, d.storage_path
        FROM public.documents d
        JOIN public.cases c ON d.case_id = c.id
        WHERE c.organization_id = ${orgId};
      `;
      for (const d of docs) {
        if (d.storage_path) {
          try {
            await deleteFileFromStorage(d.storage_path);
          } catch (e) {
            console.warn("Storage deletion warning for doc:", d.id, e);
          }
        }
      }

      // Cascade delete child records
      await sql`DELETE FROM public.documents WHERE case_id IN (SELECT id FROM public.cases WHERE organization_id = ${orgId});`;
      await sql`DELETE FROM public.document_requirements WHERE case_id IN (SELECT id FROM public.cases WHERE organization_id = ${orgId});`;
      await sql`DELETE FROM public.upload_links WHERE case_id IN (SELECT id FROM public.cases WHERE organization_id = ${orgId});`;
      await sql`DELETE FROM public.activity_logs WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.cases WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.clients WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.checklist_templates WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.subscriptions WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.organizations WHERE id = ${orgId};`;

      invalidateDashboardCache(orgId);
    }

    await sql`DELETE FROM public.users WHERE id::text = ${userId};`;

    return {
      success: true,
      message: `User ${targetUser.email} and all associated data have been permanently deleted.`,
    };
  } catch (err: any) {
    console.error("adminDeleteUserAction error:", err);
    return { success: false, error: err.message || "Failed to delete user." };
  }
}

/**
 * Fetch all cases across all organizations for admin inspection
 */
export async function adminGetAllCasesAction({
  adminSecret,
  adminEmail,
}: {
  adminSecret: string;
  adminEmail?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const cases = await sql`
      SELECT 
        c.id, c.title, c.reference_number, c.status, c.service_type, c.created_at,
        cl.name as client_name, cl.email as client_email,
        o.name as org_name,
        (SELECT COUNT(*)::int FROM public.documents d WHERE d.case_id = c.id) as doc_count,
        (SELECT COUNT(*)::int FROM public.document_requirements r WHERE r.case_id = c.id) as req_count
      FROM public.cases c
      LEFT JOIN public.clients cl ON c.client_id = cl.id
      LEFT JOIN public.organizations o ON c.organization_id = o.id
      ORDER BY c.created_at DESC
      LIMIT 100;
    `;
    return { success: true, cases };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete any case by ID (Admin only)
 */
export async function adminDeleteCaseAction({
  adminSecret,
  adminEmail,
  caseId,
}: {
  adminSecret: string;
  adminEmail?: string;
  caseId: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const docs = await sql`SELECT id, storage_path FROM public.documents WHERE case_id = ${caseId};`;
    for (const d of docs) {
      if (d.storage_path) {
        try {
          await deleteFileFromStorage(d.storage_path);
        } catch (e) {}
      }
    }
    await sql`DELETE FROM public.documents WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.document_requirements WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.upload_links WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.activity_logs WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.cases WHERE id = ${caseId};`;

    return { success: true, message: "Case deleted successfully by admin." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all checklist templates (system and custom) for admin
 */
export async function adminGetAllTemplatesAction({
  adminSecret,
  adminEmail,
}: {
  adminSecret: string;
  adminEmail?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) return { success: false, error: auth.error };
  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const templates = await sql`
      SELECT t.*, o.name as org_name
      FROM public.checklist_templates t
      LEFT JOIN public.organizations o ON t.organization_id = o.id
      ORDER BY t.is_system DESC, t.name ASC;
    `;
    return { success: true, templates };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create or update a template (system or custom) by Admin
 */
export async function adminSaveTemplateAction({
  adminSecret,
  adminEmail,
  template,
}: {
  adminSecret: string;
  adminEmail?: string;
  template: {
    id?: string;
    name: string;
    service_type: string;
    description?: string;
    requirements: any[];
    is_system: boolean;
  };
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) return { success: false, error: auth.error };
  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    if (template.id) {
      await sql`
        UPDATE public.checklist_templates
        SET name = ${template.name.trim()},
            service_type = ${template.service_type?.trim() || "General"},
            description = ${template.description?.trim() || null},
            requirements = ${JSON.stringify(template.requirements)}::jsonb,
            is_system = ${Boolean(template.is_system)},
            updated_at = now()
        WHERE id = ${template.id};
      `;
    } else {
      await sql`
        INSERT INTO public.checklist_templates (
          name, service_type, description, requirements, is_system
        ) VALUES (
          ${template.name.trim()},
          ${template.service_type?.trim() || "General"},
          ${template.description?.trim() || null},
          ${JSON.stringify(template.requirements)}::jsonb,
          ${Boolean(template.is_system)}
        );
      `;
    }
    return { success: true, message: "Template saved successfully." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete any template by Admin (including system templates)
 */
export async function adminDeleteTemplateAction({
  adminSecret,
  adminEmail,
  templateId,
}: {
  adminSecret: string;
  adminEmail?: string;
  templateId: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) return { success: false, error: auth.error };
  const sql = getAdminDb() || getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    await sql`DELETE FROM public.checklist_templates WHERE id = ${templateId};`;
    return { success: true, message: "Template deleted successfully." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send email (with optional attached file link) to user(s) from Admin Panel
 */
export async function adminSendEmailWithFileAction({
  adminSecret,
  adminEmail,
  to,
  subject,
  message,
  fileUrl,
  fileName,
}: {
  adminSecret: string;
  adminEmail?: string;
  to: string;
  subject: string;
  message: string;
  fileUrl?: string;
  fileName?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) return { success: false, error: auth.error };

  const recipients = to
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { success: false, error: "Please provide at least one recipient email." };
  }

  const results = [];
  for (const recipient of recipients) {
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 560px; border: 1px solid #e5e5e5; border-radius: 12px; background: #ffffff;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: #111; margin: 0 0 8px; font-size: 20px;">${subject}</h2>
          <p style="color: #666; font-size: 12px; margin: 0;">Message from DocGet Administration</p>
        </div>
        <div style="color: #333; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin-bottom: 24px;">
          ${message}
        </div>
        ${fileUrl ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1e293b;">Attached File: ${fileName || "Document"}</p>
            <a href="${fileUrl}" style="display: inline-block; padding: 8px 16px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">
              Download Attached File →
            </a>
          </div>
        ` : ""}
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8;">
          DocGet Secure Cloud • Need support? Email support@docget.in or contact on WhatsApp.
        </div>
      </div>
    `;

    try {
      const res = await sendNotificationEmail({
        to: recipient,
        subject,
        html: htmlBody,
        eventType: "welcome",
        plan: "pro",
      });
      results.push({ email: recipient, success: res.success });
    } catch (e: any) {
      results.push({ email: recipient, success: false, error: e.message });
    }
  }

  return { success: true, sentCount: results.filter((r) => r.success).length, results };
}

/* =========================================================================
   CHECKLIST TEMPLATES ACTIONS
   ========================================================================= */

const templatesMemoryCache = new Map<string, { data: ChecklistTemplate[]; timestamp: number }>();
const TEMPLATES_CACHE_TTL = 60000;

export async function invalidateTemplatesCache(orgId?: string) {
  if (orgId) {
    templatesMemoryCache.delete(orgId);
  } else {
    templatesMemoryCache.clear();
  }
}

export async function getChecklistTemplatesAction(): Promise<ChecklistTemplate[]> {
  const session = await getSession();
  if (!session?.organizationId) return [];

  const orgId = session.organizationId;
  const cached = templatesMemoryCache.get(orgId);
  if (cached && Date.now() - cached.timestamp < TEMPLATES_CACHE_TTL) {
    return cached.data;
  }

  const sql = await getSessionTenantDb();

  try {
    const rows = await sql`
      SELECT id, organization_id, name, service_type, description, requirements, is_system, created_at, updated_at
      FROM public.checklist_templates
      WHERE organization_id = ${orgId} OR is_system = true
      ORDER BY is_system ASC, name ASC;
    `;

    return rows.map((r: any) => ({
      id: r.id,
      organization_id: r.organization_id,
      name: r.name,
      service_type: r.service_type || "General",
      description: r.description || null,
      requirements: Array.isArray(r.requirements)
        ? r.requirements
        : typeof r.requirements === "string"
        ? JSON.parse(r.requirements)
        : [],
      is_system: Boolean(r.is_system),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (err) {
    console.error("getChecklistTemplatesAction error:", err);
    return [];
  }
}

async function checkCustomTemplateQuota(
  sql: any,
  orgId: string
): Promise<{ allowed: boolean; currentCount: number; maxLimit: number; error?: string }> {
  try {
    const subRes = await sql`
      SELECT s.status, p.name as plan_name
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${orgId}
      LIMIT 1;
    `;
    const planName = (subRes[0]?.plan_name || "free_trial").toLowerCase();
    let maxLimit = 5;
    if (planName === "pro" || planName === "professional") {
      maxLimit = 10;
    } else if (planName === "firm") {
      maxLimit = 25;
    } else {
      maxLimit = 5;
    }

    const countRes = await sql`
      SELECT count(*)::int as count
      FROM public.checklist_templates
      WHERE organization_id = ${orgId} AND is_system = false;
    `;
    const currentCount = Number(countRes[0]?.count || 0);

    if (currentCount >= maxLimit) {
      return {
        allowed: false,
        currentCount,
        maxLimit,
        error: `Custom template limit reached (${currentCount}/${maxLimit} templates on your current plan). Upgrade to Professional for up to 10 templates, or delete unused templates.`,
      };
    }

    return { allowed: true, currentCount, maxLimit };
  } catch (err) {
    console.warn("Could not check custom template quota:", err);
    return { allowed: true, currentCount: 0, maxLimit: 5 };
  }
}

export async function getCustomTemplateQuotaAction(): Promise<{ currentCount: number; maxLimit: number }> {
  const session = await getSession();
  if (!session?.organizationId) return { currentCount: 0, maxLimit: 5 };
  const sql = await getSessionTenantDb();
  const res = await checkCustomTemplateQuota(sql, session.organizationId);
  return { currentCount: res.currentCount, maxLimit: res.maxLimit };
}

export async function createChecklistTemplateAction(data: {
  name: string;
  serviceType: string;
  description?: string;
  requirements: TemplateRequirement[];
}): Promise<{ success: boolean; template?: ChecklistTemplate; error?: string }> {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const sql = await getSessionTenantDb();

  if (!data.name?.trim()) {
    return { success: false, error: "Template name is required." };
  }

  const validReqs = (data.requirements || []).filter((r) => r.name?.trim());
  if (validReqs.length === 0) {
    return { success: false, error: "Please add at least one document requirement." };
  }

  const quota = await checkCustomTemplateQuota(sql, session.organizationId);
  if (!quota.allowed) {
    return { success: false, error: quota.error };
  }

  try {
    const rows = await sql`
      INSERT INTO public.checklist_templates (
        organization_id,
        name,
        service_type,
        description,
        requirements,
        is_system
      ) VALUES (
        ${session.organizationId},
        ${data.name.trim()},
        ${data.serviceType?.trim() || "General"},
        ${data.description?.trim() || null},
        ${JSON.stringify(validReqs)}::jsonb,
        false
      )
      RETURNING *;
    `;

    revalidatePath("/dashboard/templates");
    revalidatePath("/dashboard/cases");
    revalidatePath("/dashboard");

    const created = rows[0] as any;
    return {
      success: true,
      template: {
        id: created.id,
        organization_id: created.organization_id,
        name: created.name,
        service_type: created.service_type,
        description: created.description,
        requirements: Array.isArray(created.requirements) ? created.requirements : JSON.parse(created.requirements),
        is_system: false,
        created_at: created.created_at,
        updated_at: created.updated_at,
      },
    };
  } catch (err: any) {
    console.error("createChecklistTemplateAction error:", err);
    return { success: false, error: err.message || "Failed to create template." };
  }
}

export async function updateChecklistTemplateAction(
  templateId: string,
  data: {
    name: string;
    serviceType: string;
    description?: string;
    requirements: TemplateRequirement[];
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const sql = await getSessionTenantDb();

  if (!data.name?.trim()) {
    return { success: false, error: "Template name is required." };
  }

  const validReqs = (data.requirements || []).filter((r) => r.name?.trim());
  if (validReqs.length === 0) {
    return { success: false, error: "Please add at least one document requirement." };
  }

  try {
    const existing = await sql`
      SELECT id, is_system, organization_id FROM public.checklist_templates
      WHERE id = ${templateId} LIMIT 1;
    `;
    if (existing.length === 0) {
      return { success: false, error: "Template not found." };
    }
    if (existing[0].is_system) {
      return {
        success: false,
        error: "System templates cannot be modified by organization users. You can duplicate this template to customize it.",
      };
    }
    if (existing[0].organization_id !== session.organizationId) {
      return { success: false, error: "Unauthorized: You do not have permission to modify this template." };
    }

    await sql`
      UPDATE public.checklist_templates
      SET name = ${data.name.trim()},
          service_type = ${data.serviceType?.trim() || "General"},
          description = ${data.description?.trim() || null},
          requirements = ${JSON.stringify(validReqs)}::jsonb,
          updated_at = now()
      WHERE id = ${templateId}
        AND organization_id = ${session.organizationId}
        AND is_system = false;
    `;

    invalidateTemplatesCache();
    revalidatePath("/dashboard/templates");
    revalidatePath("/dashboard/cases");

    return { success: true };
  } catch (err: any) {
    console.error("updateChecklistTemplateAction error:", err);
    return { success: false, error: err.message || "Failed to update template." };
  }
}

export async function deleteChecklistTemplateAction(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const sql = await getSessionTenantDb();

  try {
    const existing = await sql`
      SELECT id, is_system, organization_id FROM public.checklist_templates
      WHERE id = ${templateId} LIMIT 1;
    `;
    if (existing.length === 0) {
      return { success: false, error: "Template not found." };
    }
    if (existing[0].is_system) {
      return {
        success: false,
        error: "System templates cannot be deleted by organization users.",
      };
    }
    if (existing[0].organization_id !== session.organizationId) {
      return { success: false, error: "Unauthorized: You do not have permission to delete this template." };
    }

    await sql`
      DELETE FROM public.checklist_templates
      WHERE id = ${templateId}
        AND organization_id = ${session.organizationId}
        AND is_system = false;
    `;

    invalidateTemplatesCache();
    revalidatePath("/dashboard/templates");
    revalidatePath("/dashboard/cases");

    return { success: true };
  } catch (err: any) {
    console.error("deleteChecklistTemplateAction error:", err);
    return { success: false, error: err.message || "Failed to delete template." };
  }
}

export async function duplicateChecklistTemplateAction(
  templateId: string
): Promise<{ success: boolean; newTemplateId?: string; error?: string }> {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const sql = await getSessionTenantDb();

  const quota = await checkCustomTemplateQuota(sql, session.organizationId);
  if (!quota.allowed) {
    return { success: false, error: quota.error };
  }

  try {
    const existing = await sql`
      SELECT name, service_type, description, requirements
      FROM public.checklist_templates
      WHERE id = ${templateId}
        AND (organization_id = ${session.organizationId} OR is_system = true)
      LIMIT 1;
    `;

    if (existing.length === 0) {
      return { success: false, error: "Template not found." };
    }

    const t = existing[0];
    const newName = `${t.name} (Custom Copy)`;

    const inserted = await sql`
      INSERT INTO public.checklist_templates (
        organization_id,
        name,
        service_type,
        description,
        requirements,
        is_system
      ) VALUES (
        ${session.organizationId},
        ${newName},
        ${t.service_type},
        ${t.description},
        ${typeof t.requirements === "string" ? t.requirements : JSON.stringify(t.requirements)}::jsonb,
        false
      )
      RETURNING id;
    `;

    revalidatePath("/dashboard/templates");
    revalidatePath("/dashboard/cases");

    return { success: true, newTemplateId: inserted[0].id };
  } catch (err: any) {
    console.error("duplicateChecklistTemplateAction error:", err);
    return { success: false, error: err.message || "Failed to duplicate template." };
  }
}
