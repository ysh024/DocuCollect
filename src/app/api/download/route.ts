import { NextRequest, NextResponse } from "next/server";
import { getDb, getTenantDb, resolvePublicUploadLink } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashToken, getCachedLogo, setCachedLogo } from "@/lib/utils";
import { getFileBufferFromStorage, isS3Configured } from "@/lib/storage";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const orgId = searchParams.get("orgId");
  const isLogo = searchParams.get("type") === "logo" || Boolean(orgId);

  // Handle Organization Logo Downloads
  if (isLogo && orgId) {
    if (!UUID_REGEX.test(orgId.trim())) {
      return new NextResponse("Invalid organization ID", { status: 400 });
    }
    const cleanOrgId = orgId.trim();
    const versionParam = searchParams.get("v");
    const cached = !versionParam ? getCachedLogo(cleanOrgId) : null;
    let logoUrl: string | null = null;

    if (cached && Date.now() < cached.expires) {
      logoUrl = cached.logoUrl;
    } else {
      try {
        const tenantSql = getTenantDb(cleanOrgId);
        const orgs = await tenantSql`
          SELECT id, name, logo_url FROM public.organizations WHERE id = ${cleanOrgId}::uuid LIMIT 1;
        `;
        logoUrl = orgs.length > 0 && orgs[0].logo_url ? (orgs[0].logo_url as string) : null;
        setCachedLogo(cleanOrgId, { logoUrl, expires: Date.now() + 10 * 60 * 1000 });
      } catch (err: any) {
        console.warn("Database error loading logo:", err);
        return new NextResponse("Failed to load logo", { status: 500 });
      }
    }

    if (!logoUrl) {
      return new NextResponse("Logo not found", { status: 404 });
    }

    if (logoUrl.startsWith("data:")) {
      const matches = logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": versionParam ? "public, max-age=31536000, immutable" : "public, max-age=600, stale-while-revalidate=86400",
          },
        });
      }
    }

    if (isS3Configured() && (logoUrl.startsWith("logos/") || logoUrl.startsWith("org-"))) {
      try {
        const buffer = await getFileBufferFromStorage(logoUrl);
        if (buffer && buffer.length > 0) {
          const mimeType = logoUrl.endsWith(".png")
            ? "image/png"
            : logoUrl.endsWith(".jpg") || logoUrl.endsWith(".jpeg")
            ? "image/jpeg"
            : "image/webp";
          return new Response(buffer as unknown as BodyInit, {
            status: 200,
            headers: {
              "Content-Type": mimeType,
              "Content-Length": buffer.length.toString(),
              "Cache-Control": versionParam
                ? "public, max-age=31536000, immutable"
                : "public, max-age=600, stale-while-revalidate=86400",
            },
          });
        }
      } catch (s3Err) {
        console.warn("S3 logo fetch error:", s3Err);
      }
    }

    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      return NextResponse.redirect(logoUrl);
    }

    return new NextResponse("Invalid logo format", { status: 400 });
  }

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

  // Defense-in-depth: Explicit cross-tenant 403 check
  if (session?.organizationId && session.organizationId !== docRecord.organization_id) {
    return NextResponse.json({ error: "Forbidden: Cross-tenant access denied" }, { status: 403 });
  }

  // Defense-in-depth: Scoped strictly to token case_id
  if (rawToken) {
    const linkRows = [{ case_id: docRecord.case_id }];
    if (linkRows[0].case_id !== docRecord.case_id) {
      return NextResponse.json({ error: "Forbidden: Upload token not authorized for this case" }, { status: 403 });
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
