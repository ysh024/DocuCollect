import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  verifyAdminAuthorization,
  getPublicPaymentSettingsAction,
  PublicPaymentSettings,
} from "@/app/actions/portal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminSecret, adminEmail, settings } = body;

    const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized. Invalid Admin Credentials." },
        { status: 401 }
      );
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json(
        { success: false, error: "Database not connected" },
        { status: 500 }
      );
    }

    const current = await getPublicPaymentSettingsAction();
    const updated: PublicPaymentSettings = {
      ...current,
      ...(settings || {}),
    };

    await sql`
      INSERT INTO public.system_settings (key, value, updated_at)
      VALUES ('payment_settings', ${JSON.stringify(updated)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now();
    `;

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    console.error("API update payment settings error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
