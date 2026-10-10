import { NextRequest, NextResponse } from "next/server";
import { reviewDocumentAction } from "@/app/actions/portal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, requirementId, documentId, action, rejectionReason } = body;

    if (!caseId || !requirementId || !documentId || !action) {
      return NextResponse.json({ success: false, error: "Missing required review parameters" }, { status: 400 });
    }

    const res = await reviewDocumentAction(caseId, requirementId, documentId, action, rejectionReason);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error("POST /api/cases/review error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process document review" },
      { status: 500 }
    );
  }
}
