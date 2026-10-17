import { NextRequest, NextResponse } from "next/server";
import { getSession, getCurrentUser } from "@/lib/auth";
import { getDashboardData, getAdvisorNotificationsAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.organizationId || !session?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const forceFresh = req.nextUrl.searchParams.get("fresh") === "true";

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const data = await getDashboardData({ forceFresh });

    let notifications: any[] = [];
    try {
      notifications = await getAdvisorNotificationsAction();
    } catch (err) {
      console.warn("Failed to fetch notifications in /api/dashboard:", err);
    }

    return NextResponse.json(
      {
        success: true,
        user,
        data,
        notifications: notifications || [],
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/dashboard error:", err);
    const status = err?.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load dashboard data" },
      { status }
    );
  }
}
