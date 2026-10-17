import { NextRequest, NextResponse } from "next/server";
import { getCaseDetails, reviewDocumentAction } from "@/app/actions";
import { getFileBufferFromStorage } from "@/lib/storage";
import JSZip from "jszip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    if (!caseId) {
      return NextResponse.json({ error: "Missing case ID parameter" }, { status: 400 });
    }

    const isZip =
      request.nextUrl.searchParams.get("download") === "zip" ||
      request.nextUrl.searchParams.get("zip") === "true" ||
      request.nextUrl.pathname.endsWith("/download-zip");

    const caseData = await getCaseDetails(caseId, { forceFresh: isZip });
    if (!caseData) {
      return NextResponse.json({ error: "Case not found or access denied" }, { status: 404 });
    }

    // Normal JSON case details
    if (!isZip) {
      return NextResponse.json({ success: true, caseData });
    }

    // ZIP Download handling
    const clientName = (caseData.client?.name || "Client").trim();
    const docsToBundle: {
      storage_path: string;
      file_name: string;
      req_name: string;
      version: number;
      status: string;
    }[] = [];

    const seenStoragePaths = new Set<string>();

    caseData.requirements?.forEach((req) => {
      const nonRejectedDocs = (req.documents || []).filter(
        (d) => d.status !== "rejected" && Boolean(d.storage_path)
      );

      nonRejectedDocs.forEach((doc) => {
        if (doc.storage_path && !seenStoragePaths.has(doc.storage_path)) {
          seenStoragePaths.add(doc.storage_path);
          docsToBundle.push({
            storage_path: doc.storage_path,
            file_name: doc.file_name || `${req.name}.pdf`,
            req_name: req.name,
            version: doc.version || 1,
            status: doc.status,
          });
        }
      });
    });

    if (docsToBundle.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid documents found for this case. All existing submissions may have been rejected or no documents have been uploaded yet.",
        },
        { status: 400 }
      );
    }

    const zip = new JSZip();
    const usedNames = new Set<string>();
    let attachedFileCount = 0;

    for (const item of docsToBundle) {
      try {
        const buffer = await getFileBufferFromStorage(item.storage_path);
        if (!buffer || buffer.length === 0) continue;

        const originalExt = item.file_name.includes(".") ? item.file_name.split(".").pop() : "pdf";
        const ext = (originalExt || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanReq = item.req_name.replace(/[\\/:*?"<>|]/g, " ").trim();
        const cleanClient = clientName.replace(/[\\/:*?"<>|]/g, " ").trim();

        let properName = `${cleanReq} - ${cleanClient}.${ext}`;
        if (usedNames.has(properName) || (item.version && item.version > 1)) {
          properName = `${cleanReq} (v${item.version}) - ${cleanClient}.${ext}`;
        }

        let finalName = properName;
        let counter = 2;
        while (usedNames.has(finalName)) {
          finalName = `${cleanReq} (${counter}) - ${cleanClient}.${ext}`;
          counter++;
        }
        usedNames.add(finalName);

        zip.file(finalName, buffer);
        attachedFileCount++;
      } catch (docErr) {
        console.warn(`Error bundling file ${item.storage_path}:`, docErr);
      }
    }

    if (attachedFileCount === 0) {
      return NextResponse.json(
        { error: "Could not retrieve document files from storage for this archive." },
        { status: 500 }
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "STORE",
    });

    const cleanClientNameForZip = clientName.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_");
    const cleanCaseRef = (caseData.reference_number || caseData.id.slice(0, 8))
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .trim();
    const zipFileName = `${cleanClientNameForZip}_${cleanCaseRef}_case_documents.zip`;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName}"; filename*="UTF-8''${encodeURIComponent(zipFileName)}"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("GET /api/cases/[id] error:", err);
    const status = err.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process request" },
      { status }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const { requirementId, documentId, action, rejectionReason } = body;

    if (!caseId || !requirementId || !documentId || !action) {
      return NextResponse.json({ success: false, error: "Missing required review parameters" }, { status: 400 });
    }

    const res = await reviewDocumentAction(caseId, requirementId, documentId, action, rejectionReason);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error("POST /api/cases/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process document review" },
      { status: 500 }
    );
  }
}
