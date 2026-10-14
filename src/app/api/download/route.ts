import { NextRequest, NextResponse } from "next/server";
import { getDb, getTenantDb, resolvePublicUploadLink } from "@/lib/db";
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

  // 1. Look up document record and owning case/organization with tenant context
  let docRecord: {
    id: string;
    storage_path: string;
    file_name: string;
    mime_type: string;
    case_id: string;
    organization_id: string;
  } | null = null;

  try {
    if (session?.organizationId) {
      // Path A: Authenticated user with active organization session
      const tenantSql = getTenantDb(session.organizationId);
      if (docId) {
        const rows = await tenantSql`
          SELECT d.id, d.storage_path, d.file_name, d.mime_type, d.case_id, c.organization_id
          FROM public.documents d
          JOIN public.cases c ON c.id = d.case_id
          WHERE d.id::text = ${docId} AND c.organization_id = ${session.organizationId}
          LIMIT 1;
        `;
        if (rows.length > 0) docRecord = rows[0] as any;
      } else if (filePath) {
        const rows = await tenantSql`
          SELECT d.id, d.storage_path, d.file_name, d.mime_type, d.case_id, c.organization_id
          FROM public.documents d
          JOIN public.cases c ON c.id = d.case_id
          WHERE d.storage_path = ${filePath} AND c.organization_id = ${session.organizationId}
          LIMIT 1;
        `;
        if (rows.length > 0) docRecord = rows[0] as any;
      }
    } else if (rawToken) {
      // Path B: Client accessing via a validated upload link token
      const linkInfo = await resolvePublicUploadLink(rawToken);
      if (!linkInfo) {
        return NextResponse.json(
          { error: "Forbidden: Upload token is invalid, expired, or not authorized for this document." },
          { status: 403 }
        );
      }

      const tenantSql = getTenantDb(linkInfo.organization_id);
      if (docId) {
        const rows = await tenantSql`
          SELECT d.id, d.storage_path, d.file_name, d.mime_type, d.case_id, c.organization_id
          FROM public.documents d
          JOIN public.cases c ON c.id = d.case_id
          WHERE d.id::text = ${docId} AND d.case_id = ${linkInfo.case_id} AND c.organization_id = ${linkInfo.organization_id}
          LIMIT 1;
        `;
        if (rows.length > 0) docRecord = rows[0] as any;
      } else if (filePath) {
        const rows = await tenantSql`
          SELECT d.id, d.storage_path, d.file_name, d.mime_type, d.case_id, c.organization_id
          FROM public.documents d
          JOIN public.cases c ON c.id = d.case_id
          WHERE d.storage_path = ${filePath} AND d.case_id = ${linkInfo.case_id} AND c.organization_id = ${linkInfo.organization_id}
          LIMIT 1;
        `;
        if (rows.length > 0) docRecord = rows[0] as any;
      }
    }
  } catch (dbErr) {
    console.error("Error resolving document record in /api/download:", dbErr);
    return NextResponse.json({ error: "Failed to resolve document metadata" }, { status: 500 });
  }

  if (!docRecord) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
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
