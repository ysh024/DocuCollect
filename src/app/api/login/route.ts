import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getDb } from "@/lib/db";
import { createSessionToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  let email = "";
  let password = "";
  let isJson = false;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    isJson = true;
    try {
      const text = await req.text();
      const body = JSON.parse(text);
      email = (body.email || "").toLowerCase().trim();
      password = body.password || "";
    } catch (err: any) {
      console.warn("API login JSON parse error:", err?.message);
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }
  } else {
    // Form URL-encoded or multipart form data
    try {
      const formData = await req.formData();
      email = String(formData.get("email") || "").toLowerCase().trim();
      password = String(formData.get("password") || "");
    } catch {
      return NextResponse.json({ success: false, error: "Failed to parse form data." }, { status: 400 });
    }
  }

  if (!email || !password) {
    if (isJson) {
      return NextResponse.json({ success: false, error: "Please enter both your email address and password." }, { status: 400 });
    }
    return NextResponse.redirect(new URL("/login?error=Please%20enter%20both%20email%20and%20password", req.url), 303);
  }

  if (!process.env.DATABASE_URL && !process.env.ADMIN_DATABASE_URL) {
    console.error("❌ [NEON DB CONNECTION] process.env.DATABASE_URL is missing in environment variables!");
  }

  const sql = getAdminDb() || getDb();
  if (!sql) {
    console.error("❌ [NEON DB CONNECTION MISSING] process.env.DATABASE_URL is not set or invalid!");
    if (isJson) {
      return NextResponse.json({ success: false, error: "Database not connected. Please check DATABASE_URL." }, { status: 500 });
    }
    return NextResponse.redirect(new URL("/login?error=Database%20not%20connected", req.url), 303);
  }

  console.log(`\n🔑 [API LOGIN ATTEMPT] Email: "${email}"`);

  try {
    const users = await sql`
      SELECT id, organization_id, full_name, email, role, email_verified, password_hash, is_deactivated
      FROM public.users
      WHERE LOWER(email) = ${email}
      LIMIT 1;
    `;

    console.log(`🔍 [API LOGIN DB LOOKUP] Found users: ${users.length}`);

    if (users.length === 0) {
      console.warn(`❌ [API LOGIN FAILED] User not found for: "${email}"`);
      if (isJson) {
        return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login?error=Invalid%20email%20or%20password", req.url), 303);
    }

    const user = users[0] as any;

    if (user.is_deactivated) {
      console.warn(`❌ [API LOGIN FAILED] Account deactivated: "${email}"`);
      if (isJson) {
        return NextResponse.json({ success: false, error: "This account has been deactivated." }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login?error=Account%20has%20been%20deactivated", req.url), 303);
    }

    if (!user.password_hash) {
      if (isJson) {
        return NextResponse.json({ success: false, error: "Please sign in with Google or reset your password." }, { status: 400 });
      }
      return NextResponse.redirect(new URL("/login?error=Please%20sign%20in%20with%20Google", req.url), 303);
    }

    // Direct bcrypt comparison first for edge safety and zero pgcrypto mismatch
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    } catch {}

    if (!isPasswordValid) {
      try {
        const normalizedHash = user.password_hash.startsWith("$2b$")
          ? user.password_hash.replace("$2b$", "$2a$")
          : user.password_hash;
        const rows = await sql`
          SELECT (crypt(${password}, ${normalizedHash}) = ${normalizedHash}) as is_valid;
        `;
        if (rows && rows.length > 0 && rows[0].is_valid === true) {
          isPasswordValid = true;
        }
      } catch {}
    }

    console.log(`🔐 [API LOGIN PASSWORD CHECK] Valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.warn(`❌ [API LOGIN FAILED] Password mismatch for: "${email}"`);
      if (isJson) {
        return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login?error=Invalid%20email%20or%20password", req.url), 303);
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

    console.log(`✅ [API LOGIN SUCCESS] Session created for: "${email}"`);

    // Build response with cookie
    const redirectUrl = new URL("/dashboard", req.url);
    const response = isJson
      ? NextResponse.json({ success: true, redirect: "/dashboard" })
      : NextResponse.redirect(redirectUrl, 303);

    response.cookies.set("docucollect_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error("❌ [API LOGIN ERROR] Unexpected exception:", err);
    if (isJson) {
      return NextResponse.json({ success: false, error: "An unexpected error occurred during sign-in." }, { status: 500 });
    }
    return NextResponse.redirect(new URL("/login?error=An%20unexpected%20error%20occurred", req.url), 303);
  }
}
