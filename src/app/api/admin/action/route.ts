import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminAuthorization,
  generateLicenseKeyAction,
  revokeLicenseKeyAction,
  activateSubscriptionAction,
  getAdminOverviewAction,
  getLicenseKeysAction,
  toggleUserDeactivationAction,
  updatePaymentSettingsAction,
} from "@/app/actions/portal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionType, adminSecret, adminEmail, payload } = body;

    const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized. Invalid Admin Credentials." },
        { status: 401 }
      );
    }

    switch (actionType) {
      case "save_payment": {
        const res = await updatePaymentSettingsAction({
          adminSecret,
          adminEmail,
          settings: payload?.settings || {},
        });
        return NextResponse.json(res);
      }
      case "generate_key": {
        const res = await generateLicenseKeyAction({
          adminSecret,
          adminEmail,
          planName: payload.planName,
          period: payload.period,
          notes: payload.notes,
        });
        return NextResponse.json(res);
      }
      case "revoke_key": {
        const res = await revokeLicenseKeyAction({
          adminSecret,
          adminEmail,
          keyId: payload.keyId,
        });
        return NextResponse.json(res);
      }
      case "activate_subscription": {
        const res = await activateSubscriptionAction({
          adminSecret,
          adminEmail,
          userEmail: payload.userEmail,
          planName: payload.planName,
          period: payload.period,
          paymentMethod: payload.paymentMethod || "admin_direct",
          paymentNotes: payload.paymentNotes || "Activated via Admin Portal",
        });
        return NextResponse.json(res);
      }
      case "toggle_deactivation": {
        const res = await toggleUserDeactivationAction({
          adminSecret,
          adminEmail,
          userId: payload.userId,
          deactivate: payload.deactivate,
        });
        return NextResponse.json(res);
      }
      case "overview": {
        const res = await getAdminOverviewAction({ adminSecret, adminEmail });
        return NextResponse.json(res);
      }
      case "keys": {
        const res = await getLicenseKeysAction({ adminSecret, adminEmail });
        return NextResponse.json(res);
      }
      default:
        return NextResponse.json(
          { success: false, error: `Unknown actionType: ${actionType}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("Admin API action error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
