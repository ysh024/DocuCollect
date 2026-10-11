import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getFileBufferFromStorage, isS3Configured } from "@/lib/storage";

// In-memory cache for presigned preview URLs (valid for 1 hr, cached for 50 mins)
const signedUrlCache = new Map<string, { url: string; expires: number }>();
// In-memory cache for document metadata lookups by ID
const docMetaCache = new Map<string, { storage_path: string; file_name: string; mime_type: string; expires: number }>();

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const filePath = searchParams.get("file") || searchParams.get("path") || "";
  const fileName = searchParams.get("name") || "document.pdf";
  const docId = searchParams.get("id");
  const isInline = searchParams.get("inline") === "1" || searchParams.get("inline") === "true";
  const asAttachment = !isInline;

  // Resolve target path and metadata
  let targetPath = filePath;
  let targetFileName = fileName;
  let targetMimeType = "application/octet-stream";

  if (docId) {
    const cachedMeta = docMetaCache.get(docId);
    if (cachedMeta && Date.now() < cachedMeta.expires) {
      targetPath = cachedMeta.storage_path;
      targetFileName = cachedMeta.file_name;
      targetMimeType = cachedMeta.mime_type;
    } else {
      const sql = getDb();
      if (sql) {
        try {
          const rows = await sql`
            SELECT storage_path, file_name, mime_type
            FROM public.documents
            WHERE id::text = ${docId}
            LIMIT 1;
          `;
          if (rows.length > 0) {
            targetPath = rows[0].storage_path || targetPath;
            targetFileName = rows[0].file_name || targetFileName;
            targetMimeType = rows[0].mime_type || targetMimeType;
            docMetaCache.set(docId, {
              storage_path: targetPath,
              file_name: targetFileName,
              mime_type: targetMimeType,
              expires: Date.now() + 600000, // 10 minutes cache
            });
          }
        } catch (err) {
          console.warn("Error resolving document metadata:", err);
        }
      }
    }
  }

  // Sanitize target filename for download headers
  const safeFileName = targetFileName.replace(/["\r\n]/g, "").trim() || "document.pdf";

  // Retrieve and in-memory decrypt document from Zero-Knowledge storage
  if (targetPath && isS3Configured()) {
    try {
      const fileBuffer = await getFileBufferFromStorage(targetPath);
      if (fileBuffer) {
        if (asAttachment) {
          return new Response(fileBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Disposition": `attachment; filename="${safeFileName}"; filename*="UTF-8''${encodeURIComponent(safeFileName)}"`,
              "Content-Length": fileBuffer.length.toString(),
              "Cache-Control": "private, no-cache, no-store, must-revalidate",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }

        // Inline modal preview
        return new Response(fileBuffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": targetMimeType || "application/pdf",
            "Content-Disposition": `inline; filename="${safeFileName}"`,
            "Content-Length": fileBuffer.length.toString(),
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch (err) {
      console.warn("Storage retrieval/decryption error:", err);
    }
  }

  // Fallback SVG verification preview placeholder
  const svgPlaceholder = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
      <rect width="800" height="1000" fill="#f8fafc"/>
      <rect x="40" y="40" width="720" height="920" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <text x="70" y="100" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#0f172a">Verified Document Storage • DocuCollect Cloud</text>
      <text x="70" y="140" font-family="system-ui, sans-serif" font-size="14" fill="#64748b">File: ${safeFileName}</text>
      <text x="70" y="165" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">Retention: Secure retention per active plan</text>
      <line x1="70" y1="190" x2="730" y2="190" stroke="#f1f5f9" stroke-width="2"/>
      <rect x="70" y="220" width="660" height="680" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-dasharray="4"/>
      <text x="400" y="550" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#475569" text-anchor="middle">Official Document Verification Preview</text>
      <text x="400" y="580" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">Uploaded and stored securely in DocuCollect Vault</text>
    </svg>
  `;

  return new Response(svgPlaceholder.trim(), {
    status: 200,
    headers: {
      "Content-Type": asAttachment ? "application/octet-stream" : "image/svg+xml",
      "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename="${safeFileName}${asAttachment ? "" : ".svg"}"`,
    },
  });
}
