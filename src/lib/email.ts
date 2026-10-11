/**
 * DocuCollect Unified Email Notification Service
 * Supports:
 * 1. Google Apps Script Webhook (logs to Google Sheets and sends via Gmail/MailApp)
 * 2. Resend API (production transactional emails)
 * 3. Local Development console fallback
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  eventType: "auth_otp" | "welcome" | "doc_uploaded" | "doc_reviewed" | "password_reset" | "license_redeemed";
  plan?: string; // "free" | "starter" | "pro" | "firm"
}

export async function sendNotificationEmail(opts: EmailOptions): Promise<{ success: boolean; status?: string; error?: string }> {
  const googleScriptUrl = process.env.GOOGLE_SCRIPT_EMAIL_URL;
  const resendApiKey = process.env.RESEND_API_KEY;

  // 1. Google Apps Script Webhook Priority
  if (googleScriptUrl) {
    try {
      const response = await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        redirect: "follow",
        body: JSON.stringify({
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
          eventType: opts.eventType,
          plan: opts.plan || "free",
        }),
      });

      const data = await response.json().catch(() => ({}));
      return {
        success: Boolean(data.success),
        status: data.status || "SENT",
        error: data.error,
      };
    } catch (err: any) {
      console.warn("Google Apps Script email service error:", err);
      // Fall through to Resend or fallback
    }
  }

  // 2. Resend API Priority
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "DocuCollect <noreply@docucollect.in>",
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
        }),
      });

      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        status: response.ok ? "SENT" : "ERROR",
        error: data.message,
      };
    } catch (err: any) {
      console.warn("Resend email delivery error:", err);
    }
  }

  // 3. Fallback in development or when unconfigured
  if (process.env.NODE_ENV === "development") {
    console.log(`[Email Mock (${opts.eventType})] To: ${opts.to} | Subject: ${opts.subject}`);
  }
  return { success: true, status: "DEV_FALLBACK" };
}
