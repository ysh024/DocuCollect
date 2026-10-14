import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashToken } from "@/lib/tokens";
import { getFileBufferFromStorage, isS3Configured } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const filePath = searchParams.get("file") || searchParams.get("path") || "";
  const fileName = searchParams.get("name") || "document.pdf";
  const docId = searchParams.get("id");
  const token = searchParams.get("token");
  const isInline = searchParams.get("inline") === "1" || searchParams.get("inline") === "true";
  const asAttachment = !isInline;

  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const session = await getSession();
  const rawToken = searchParams.get("token") || searchParams.get("uploadToken");

  // Immediate authentication check: Require either valid user session or upload token
  if (!session?.organizationId && !rawToken) {
    return NextResponse.json(
      { error: "Unauthorized: Sign-in or valid access token required to download documents." },
      { status: 401 }
    );
  }

  // 1. Look up document record and owning case/organization
  let docRecord: {
    id: string;
    storage_path: string;
    file_name: string;
    mime_type: string;
    case_id: string;
    organization_id: string;
  } | null = null;

  try {
    if (docId) {
      const rows = await sql`
        SELECT d.id, d.storage_path, d.file_name, d.mime_type, d.case_id, c.organization_id
        FROM public.documents d
        JOIN public.cases c ON c.id = d.case_id
        WHERE d.id::text = ${docId}
        LIMIT 1;
      `;
      if (rows.length > 0) docRecord = rows[0] as any;
    } else if (filePath) {
      const rows = await sql`
        SELECT d.id, d.storage_path, d.file_name, d.mime_type, d.case_id, c.organization_id
        FROM public.documents d
        JOIN public.cases c ON c.id = d.case_id
        WHERE d.storage_path = ${filePath}
        LIMIT 1;
      `;
      if (rows.length > 0) docRecord = rows[0] as any;
    }
  } catch (dbErr) {
    console.error("Error resolving document record in /api/download:", dbErr);
    return NextResponse.json({ error: "Failed to resolve document metadata" }, { status: 500 });
  }

  if (!docRecord) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // 2. Authorization Verification
  // Path A: Authenticated advisor/staff member
  if (session?.organizationId) {
    if (session.organizationId !== docRecord.organization_id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to documents from another organization." },
        { status: 403 }
      );
    }
  } else if (rawToken) {
    // Path B: Client accessing via valid upload link token
    const tokenHash = hashToken(rawToken);
    const linkRows = await sql`
      SELECT case_id FROM public.upload_links
      WHERE (token = ${rawToken} OR token_hash = ${tokenHash})
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;
    `;

    if (linkRows.length === 0 || linkRows[0].case_id !== docRecord.case_id) {
      return NextResponse.json(
        { error: "Forbidden: Upload token is invalid, expired, or not authorized for this document." },
        { status: 403 }
      );
    }
  }

  // 3. Decrypt and Stream Document
  const targetPath = docRecord.storage_path;
  const safeFileName = (docRecord.file_name || fileName).replace(/["\r\n]/g, "").trim() || "document.pdf";
  const targetMimeType = docRecord.mime_type || "application/octet-stream";

  if (targetPath && isS3Configured()) {
    try {
      const fileBuffer = await getFileBufferFromStorage(targetPath);
      if (fileBuffer) {
        return new Response(fileBuffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": asAttachment ? "application/octet-stream" : targetMimeType,
            "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename="${safeFileName}"; filename*="UTF-8''${encodeURIComponent(safeFileName)}"`,
            "Content-Length": fileBuffer.length.toString(),
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch (err) {
      console.error("Storage decryption error in /api/download:", err);
      return NextResponse.json({ error: "Failed to decrypt and stream document." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Storage object unavailable." }, { status: 404 });
}
