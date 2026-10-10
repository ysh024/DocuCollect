import { NextRequest, NextResponse } from "next/server";
import { getCaseDetails } from "@/app/actions/portal";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing case ID" }, { status: 400 });
    }

    const caseData = await getCaseDetails(id);
    if (!caseData) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, caseData });
  } catch (err: any) {
    console.error("GET /api/cases/[id] error:", err);
    const status = err.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load case details" },
      { status }
    );
  }
}
