import { NextRequest, NextResponse } from "next/server";
import { getCaseDetails } from "@/app/actions/portal";
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

    const caseData = await getCaseDetails(caseId, { forceFresh: true });
    if (!caseData) {
      return NextResponse.json({ error: "Case not found or access denied" }, { status: 404 });
    }

    const clientName = (caseData.client?.name || "Client").trim();

    // Collect all files uploaded for the case EXCEPT rejected files
    const docsToBundle: {
      storage_path: string;
      file_name: string;
      req_name: string;
      version: number;
      status: string;
    }[] = [];

    const seenStoragePaths = new Set<string>();

    caseData.requirements?.forEach((req) => {
      // Strictly exclude any document with status === 'rejected'
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

    // Concurrently fetch all valid document buffers directly from object storage (parallel high-speed fetch)
    const fileBuffers = await Promise.all(
      docsToBundle.map(async (item) => {
        const buffer = await getFileBufferFromStorage(item.storage_path);
        return { item, buffer };
      })
    );

    // Initialize fast ZIP archive
    const zip = new JSZip();
    const usedNames = new Set<string>();

    for (const { item, buffer } of fileBuffers) {
      if (!buffer || buffer.length === 0) {
        console.warn(`Could not retrieve buffer for ${item.storage_path}`);
        continue;
      }

      // Determine file extension
      const originalExt = item.file_name.includes(".") ? item.file_name.split(".").pop() : "pdf";
      const ext = (originalExt || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");

      // Format clean, professional, human-readable file name for the zip
      const cleanReq = item.req_name.replace(/[\\/:*?"<>|]/g, " ").trim();
      const cleanClient = clientName.replace(/[\\/:*?"<>|]/g, " ").trim();

      let properName = `${cleanReq} - ${cleanClient}.${ext}`;

      // If duplicate or version > 1, annotate version clearly
      if (usedNames.has(properName) || (item.version && item.version > 1)) {
        properName = `${cleanReq} (v${item.version}) - ${cleanClient}.${ext}`;
      }

      // If still duplicate, add index
      let finalName = properName;
      let counter = 2;
      while (usedNames.has(finalName)) {
        finalName = `${cleanReq} (${counter}) - ${cleanClient}.${ext}`;
        counter++;
      }
      usedNames.add(finalName);

      zip.file(finalName, buffer);
    }

    // Generate zip binary with STORE compression (fast zero-CPU packaging to prevent Error 1102 on edge workers)
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "STORE",
    });

    // Clean, structured zip filename formatted with Client Name and Case ID / Reference Number
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
    console.error("Error creating case zip download:", err);
    return NextResponse.json(
      { error: err.message || "Failed to package documents into zip archive" },
      { status: 500 }
    );
  }
}
