import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deleteFileFromStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Automated Cleanup Cron for Neon Storage & Quota Management
 * Schedule: Runs daily (e.g. at 02:00 UTC)
 * Can be triggered via Vercel Cron or GET /api/cron/cleanup-storage?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET || "admin123";

  const isAuthorized =
    (authHeader && authHeader === `Bearer ${expectedSecret}`) ||
    (querySecret && querySecret === expectedSecret) ||
    process.env.NODE_ENV === "development";

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  try {
    // 1. Purge expired documents to protect storage quotas
    // (Documents where auto_delete_at is in the past)
    const purgedDocs = await sql`
      DELETE FROM public.documents
      WHERE auto_delete_at IS NOT NULL AND auto_delete_at < NOW()
      RETURNING id, storage_path, file_name, file_size;
    `;

    // Also delete from Neon Object Storage (S3)
    for (const doc of purgedDocs) {
      if (doc.storage_path) {
        try {
          await deleteFileFromStorage(doc.storage_path);
        } catch {
          // Continue
        }
      }
    }

    const totalFreedBytes = purgedDocs.reduce(
      (acc: number, doc: any) => acc + (Number(doc.file_size) || 0),
      0
    );

    // 2. Purge expired OTP verification codes
    const purgedOtps = await sql`
      DELETE FROM public.otp_codes
      WHERE expires_at < NOW()
      RETURNING id;
    `;

    // 3. Mark expired trial subscriptions
    const expiredTrials = await sql`
      UPDATE public.subscriptions
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'trial' AND trial_ends_at < NOW()
      RETURNING id, organization_id;
    `;

    // 4. Mark expired paid subscriptions
    const expiredPaid = await sql`
      UPDATE public.subscriptions
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'active' AND current_period_end < NOW()
      RETURNING id, organization_id;
    `;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        documentsPurged: purgedDocs.length,
        freedStorageBytes: totalFreedBytes,
        freedStorageMB: (totalFreedBytes / (1024 * 1024)).toFixed(2),
        otpsPurged: purgedOtps.length,
        trialsExpired: expiredTrials.length,
        paidSubsExpired: expiredPaid.length,
      },
    });
  } catch (err: any) {
    console.error("Cron execution error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Cron task failed" },
      { status: 500 }
    );
  }
}
