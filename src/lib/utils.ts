import { type ClassValue, clsx } from "clsx";
import crypto from "crypto";
import { z } from "zod";
import { CaseStatus, RequirementStatus } from "@/types";

// =====================================================================
// CSS CLASS UTILITIES & FORMATTERS
// =====================================================================

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getCaseStatusBadge(status: CaseStatus): {
  label: string;
  className: string;
  dotColor: string;
} {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700",
        dotColor: "bg-neutral-400",
      };
    case "active":
      return {
        label: "Active",
        className: "bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
        dotColor: "bg-blue-500",
      };
    case "waiting_for_client":
      return {
        label: "Waiting for Client",
        className: "bg-amber-50/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
        dotColor: "bg-amber-500",
      };
    case "under_review":
      return {
        label: "Under Review",
        className: "bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60",
        dotColor: "bg-indigo-500",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
        dotColor: "bg-emerald-500",
      };
    case "archived":
      return {
        label: "Archived",
        className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200/60 dark:border-neutral-700",
        dotColor: "bg-neutral-400",
      };
    default:
      return {
        label: status,
        className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700",
        dotColor: "bg-neutral-400",
      };
  }
}

export function getRequirementStatusBadge(status: RequirementStatus): {
  label: string;
  className: string;
  dotColor: string;
  borderAccent: string;
  bgCard: string;
} {
  switch (status) {
    case "not_uploaded":
      return {
        label: "To Upload",
        className: "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 font-semibold",
        dotColor: "bg-amber-500",
        borderAccent: "border-l-amber-500 border-amber-200 dark:border-amber-800/60",
        bgCard: "bg-amber-50/20 dark:bg-amber-950/20",
      };
    case "uploaded":
    case "under_review":
      return {
        label: "Under Review",
        className: "bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-800/80 font-semibold",
        dotColor: "bg-blue-500",
        borderAccent: "border-l-blue-500 border-blue-200 dark:border-blue-800/60",
        bgCard: "bg-blue-50/15 dark:bg-blue-950/20",
      };
    case "approved":
      return {
        label: "Approved",
        className: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80 font-semibold",
        dotColor: "bg-emerald-500",
        borderAccent: "border-l-emerald-500 border-emerald-200 dark:border-emerald-800/60",
        bgCard: "bg-emerald-50/20 dark:bg-emerald-950/20",
      };
    case "rejected":
      return {
        label: "Needs Re-upload",
        className: "bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-800/80 font-semibold",
        dotColor: "bg-rose-600",
        borderAccent: "border-l-rose-500 border-rose-300 dark:border-rose-800/60",
        bgCard: "bg-rose-50/30 dark:bg-rose-950/20",
      };
    default:
      return {
        label: status,
        className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium",
        dotColor: "bg-neutral-400",
        borderAccent: "border-l-neutral-400 border-neutral-200 dark:border-neutral-700",
        bgCard: "bg-white dark:bg-neutral-900",
      };
  }
}

// =====================================================================
// UPLOAD TOKENS & SECURITY HELPERS
// =====================================================================

export function generateUploadToken(): {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const token = crypto.randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const tokenPrefix = token.substring(0, 6);

  return {
    token,
    tokenHash,
    tokenPrefix,
  };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// =====================================================================
// IN-MEMORY LOGO CACHE
// =====================================================================

const logoUrlCache = new Map<string, { logoUrl: string | null; expires: number }>();

export function getCachedLogo(orgId: string): { logoUrl: string | null; expires: number } | undefined {
  return logoUrlCache.get(orgId);
}

export function setCachedLogo(orgId: string, data: { logoUrl: string | null; expires: number }): void {
  logoUrlCache.set(orgId, data);
}

export function invalidateLogoCache(orgId?: string): void {
  if (orgId) {
    logoUrlCache.delete(orgId);
  } else {
    logoUrlCache.clear();
  }
}

// =====================================================================
// RATE LIMITING
// =====================================================================

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, record] of Array.from(rateLimitStore.entries())) {
    const activeTimestamps = record.timestamps.filter((ts) => now - ts < 3600 * 1000);
    if (activeTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = activeTimestamps;
    }
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  cleanupStaleEntries(now);

  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key) || { timestamps: [] };
  const recentTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  const effectiveMax =
    process.env.NODE_ENV === "development" ? Math.max(maxAttempts, 100) : maxAttempts;

  if (recentTimestamps.length >= effectiveMax) {
    const oldestInWindow = recentTimestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  recentTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: recentTimestamps });

  return {
    allowed: true,
    remaining: maxAttempts - recentTimestamps.length,
    retryAfterSeconds: 0,
  };
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// =====================================================================
// CLIENT DOWNLOAD WITH FEEDBACK
// =====================================================================

export async function downloadFileWithFeedback({
  url,
  fileName,
  toast,
  onStart,
  onComplete,
}: {
  url: string;
  fileName: string;
  toast?: (options: { title: string; description?: string; type?: "success" | "error" | "info" }) => void;
  onStart?: () => void;
  onComplete?: () => void;
}): Promise<boolean> {
  if (onStart) onStart();

  if (toast) {
    toast({
      title: "Download Started",
      description: `Downloading "${fileName}"...`,
      type: "info",
    });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with status ${res.status}`);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);

    if (toast) {
      toast({
        title: "Download Complete",
        description: `"${fileName}" has been downloaded successfully.`,
        type: "success",
      });
    }

    if (onComplete) onComplete();
    return true;
  } catch (err: any) {
    console.error("Download error:", err);
    if (toast) {
      toast({
        title: "Download Failed",
        description: err?.message || `Could not download "${fileName}". Please check your internet connection.`,
        type: "error",
      });
    }
    if (onComplete) onComplete();
    return false;
  }
}

// =====================================================================
// SCHEMA VALIDATIONS
// =====================================================================

export const clientSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(8, "Phone number is required"),
  alternate_phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  client_ref_id: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const caseSchema = z.object({
  client_id: z.string().uuid("Valid client ID is required"),
  title: z.string().min(2, "Case title is required"),
  service_type: z.string().min(2, "Service type is required"),
  reference_number: z.string().min(1, "Reference number is required"),
  due_date: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const documentRequirementSchema = z.object({
  case_id: z.string().uuid(),
  name: z.string().min(2, "Document name is required"),
  description: z.string().optional().or(z.literal("")),
  is_required: z.boolean().default(true),
  allowed_types: z.array(z.string()).min(1, "At least one allowed file type required"),
  max_size_mb: z.number().min(1).max(50).default(25),
});

export const reviewDocumentSchema = z.object({
  document_id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().optional(),
});

// =====================================================================
// UNIFIED EMAIL NOTIFICATION SERVICE
// =====================================================================

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  eventType: "auth_otp" | "welcome" | "doc_uploaded" | "doc_reviewed" | "password_reset" | "license_redeemed" | "case_completed";
  plan?: string;
}

export async function sendNotificationEmail(opts: EmailOptions): Promise<{ success: boolean; status?: string; error?: string }> {
  const googleScriptUrl = process.env.GOOGLE_SCRIPT_EMAIL_URL;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (googleScriptUrl) {
    try {
      const response = await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        redirect: "follow",
        signal: AbortSignal.timeout(4000),
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
    }
  }

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "DocGet <amankumarak5933485@gmail.com>",
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

  if (process.env.NODE_ENV === "development") {
    console.log(`[Email Mock (${opts.eventType})] To: ${opts.to} | Subject: ${opts.subject}`);
  }
  return { success: true, status: "DEV_FALLBACK" };
}
