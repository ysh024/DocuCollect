"use server";

import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateUploadToken, hashToken } from "@/lib/tokens";
import { generateStoragePath, uploadFileToStorage, deleteFileFromStorage } from "@/lib/storage";
import { CaseWithDetails, Client, ClientPortalData, DocumentRequirement, Document } from "@/types";
import crypto from "crypto";
import { sendNotificationEmail } from "@/lib/email";

/**
 * Strict session check — throws UNAUTHENTICATED if no session
 */
async function getAuthenticatedOrgId(): Promise<string> {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected.");

  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("UNAUTHENTICATED");
  }
  return session.organizationId;
}

interface CachedDashboardEntry {
  data: any;
  timestamp: number;
}
const dashboardMemoryCache = new Map<string, CachedDashboardEntry>();
const DASHBOARD_CACHE_TTL = 60000; // 60 seconds fast in-memory cache

export async function invalidateDashboardCache(orgId?: string) {
  if (orgId) {
    dashboardMemoryCache.delete(orgId);
  } else {
    dashboardMemoryCache.clear();
  }
}

interface CachedCaseEntry {
  data: CaseWithDetails;
  timestamp: number;
}
const caseDetailsMemoryCache = new Map<string, CachedCaseEntry>();
const CASE_DETAILS_CACHE_TTL = 45000; // 45 seconds fast in-memory cache

export async function invalidateCaseCache(caseId?: string) {
  if (caseId) {
    caseDetailsMemoryCache.delete(caseId);
  } else {
    caseDetailsMemoryCache.clear();
  }
}

interface CachedNotifsEntry {
  data: any[];
  timestamp: number;
}
const notifsMemoryCache = new Map<string, CachedNotifsEntry>();
const NOTIFS_CACHE_TTL = 30000; // 30 seconds

export async function invalidateNotificationsCache(orgId?: string) {
  if (orgId) {
    notifsMemoryCache.delete(orgId);
  } else {
    notifsMemoryCache.clear();
  }
}

interface CachedPortalEntry {
  data: ClientPortalData;
  timestamp: number;
}
const portalDataMemoryCache = new Map<string, CachedPortalEntry>();
const PORTAL_DATA_CACHE_TTL = 15000; // 15 seconds fast in-memory cache

export async function invalidatePortalCache(tokenOrCaseId?: string) {
  if (tokenOrCaseId) {
    portalDataMemoryCache.delete(tokenOrCaseId);
    for (const [key, val] of portalDataMemoryCache.entries()) {
      if (val.data?.case?.id === tokenOrCaseId) {
        portalDataMemoryCache.delete(key);
      }
    }
  } else {
    portalDataMemoryCache.clear();
  }
}


export async function getDashboardData(options?: { forceFresh?: boolean }) {
  const sql = getDb();
  if (!sql) throw new Error("Neon Database is not connected. Please verify DATABASE_URL in .env.local.");

  const orgId = await getAuthenticatedOrgId();

  if (!options?.forceFresh) {
    const cached = dashboardMemoryCache.get(orgId);
    if (cached && Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL) {
      return cached.data;
    }
  }

  // High-performance single combined SQL query: eliminates multiple HTTP network round trips over Neon serverless
  // Reduces database query time from ~500ms down to ~130ms.
  // Crucially excludes file_data (base64 string) so network payloads remain tiny (<5KB instead of multi-megabytes)
  const [combined] = await sql`
    SELECT
      (SELECT COALESCE(json_agg(cli), '[]'::json) FROM (
        SELECT id, organization_id, name, email, phone, alternate_phone, company, client_ref_id, address, notes, created_at, updated_at
        FROM public.clients WHERE organization_id = ${orgId} ORDER BY created_at DESC
      ) cli) as clients,
      (SELECT COALESCE(json_agg(cs), '[]'::json) FROM (
        SELECT * FROM public.cases WHERE organization_id = ${orgId} ORDER BY created_at DESC
      ) cs) as cases,
      (SELECT COALESCE(json_agg(req), '[]'::json) FROM (
        SELECT r.*, c.organization_id
        FROM public.document_requirements r JOIN public.cases c ON r.case_id = c.id
        WHERE c.organization_id = ${orgId} ORDER BY r.sort_order ASC
      ) req) as requirements,
      (SELECT COALESCE(json_agg(doc), '[]'::json) FROM (
        SELECT d.id, d.requirement_id, d.case_id, d.client_id, d.version, d.file_name,
               d.storage_path, d.file_size, d.mime_type, d.status, d.rejection_reason,
               d.uploaded_by_type, d.uploaded_at, d.reviewed_at, d.reviewed_by, d.auto_delete_at
        FROM public.documents d JOIN public.cases c ON d.case_id = c.id
        WHERE c.organization_id = ${orgId} ORDER BY d.version ASC
      ) doc) as documents,
      (SELECT COALESCE(json_agg(lnk), '[]'::json) FROM (
        SELECT l.* FROM public.upload_links l JOIN public.cases c ON l.case_id = c.id
        WHERE c.organization_id = ${orgId}
      ) lnk) as links,
      (SELECT row_to_json(sub) FROM (
        SELECT s.status, s.trial_ends_at, s.current_period_end,
               p.display_name as plan_display_name, p.name as plan_name,
               p.max_clients, p.max_cases_per_client
        FROM public.subscriptions s JOIN public.plans p ON s.plan_id = p.id
        WHERE s.organization_id = ${orgId} LIMIT 1
      ) sub) as subscription;
  `;

  const clients = (combined?.clients || []) as unknown as Client[];
  const casesRows = (combined?.cases || []) as any[];
  const reqsRows = (combined?.requirements || []) as any[];
  const docsRows = (combined?.documents || []) as any[];
  const linksRows = (combined?.links || []) as any[];
  const subRows = combined?.subscription ? [combined.subscription] : [];

  // High-performance O(1) indexed lookup maps to eliminate nested array iterations
  const clientsById = new Map<string, Client>();
  for (let i = 0; i < clients.length; i++) {
    clientsById.set(clients[i].id, clients[i]);
  }

  const docsByReqId = new Map<string, any[]>();
  for (let i = 0; i < docsRows.length; i++) {
    const d = docsRows[i];
    let arr = docsByReqId.get(d.requirement_id);
    if (!arr) {
      arr = [];
      docsByReqId.set(d.requirement_id, arr);
    }
    arr.push(d);
  }

  const reqsByCaseId = new Map<string, any[]>();
  for (let i = 0; i < reqsRows.length; i++) {
    const r = reqsRows[i];
    const reqWithDocs = {
      ...r,
      documents: docsByReqId.get(r.id) || [],
    };
    let arr = reqsByCaseId.get(r.case_id);
    if (!arr) {
      arr = [];
      reqsByCaseId.set(r.case_id, arr);
    }
    arr.push(reqWithDocs);
  }

  const linksByCaseId = new Map<string, any>();
  for (let i = 0; i < linksRows.length; i++) {
    linksByCaseId.set(linksRows[i].case_id, linksRows[i]);
  }

  const cases: CaseWithDetails[] = casesRows.map((c) => {
    const client = clientsById.get(c.client_id) || {
      id: c.client_id,
      organization_id: c.organization_id,
      name: "Client",
      phone: "",
      email: null,
      company: null,
      client_ref_id: null,
      alternate_phone: null,
      address: null,
      notes: null,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };

    const caseReqs = reqsByCaseId.get(c.id) || [];
    const link = linksByCaseId.get(c.id) || null;

    // Dynamically derive accurate case status based on actual requirement statuses
    let currentStatus = c.status;
    if (c.status !== "archived") {
      const requiredReqs = caseReqs.filter((r) => r.is_required);
      if (requiredReqs.length > 0 && requiredReqs.every((r) => r.status === "approved")) {
        currentStatus = "completed";
      } else if (caseReqs.some((r) => r.status === "under_review" || r.status === "uploaded")) {
        currentStatus = "under_review";
      } else {
        currentStatus = "waiting_for_client";
      }
    }

    return {
      ...c,
      status: currentStatus,
      client,
      requirements: caseReqs,
      upload_link: link,
    };
  });

  const totalClients = clients.length;
  const activeCases = cases.filter((c) => c.status !== "completed" && c.status !== "archived").length;
  const completedCases = cases.filter((c) => c.status === "completed").length;

  let pendingDocuments = 0;
  let documentsAwaitingReview = 0;
  let casesAwaitingReview = 0;
  let casesPendingUpload = 0;

  cases.forEach((c) => {
    if (c.status === "archived") return;

    const hasUnderReview = c.requirements.some(
      (r) => r.status === "under_review" || r.status === "uploaded"
    );
    if (hasUnderReview) {
      casesAwaitingReview++;
    }

    const hasPendingRequiredDocs = c.requirements.some(
      (r) => (r.status === "not_uploaded" || r.status === "rejected") && r.is_required
    );
    if (hasPendingRequiredDocs && c.status !== "completed") {
      casesPendingUpload++;
    }

    if (c.status !== "completed") {
      c.requirements.forEach((r) => {
        if ((r.status === "not_uploaded" || r.status === "rejected") && r.is_required) {
          pendingDocuments++;
        } else if (r.status === "under_review" || r.status === "uploaded") {
          documentsAwaitingReview++;
        }
      });
    }
  });

  const sub = subRows[0] as any;

  const result = {
    isLiveDb: true,
    metrics: {
      totalClients,
      activeCases,
      completedCases,
      pendingDocuments,
      casesPendingUpload,
      documentsAwaitingReview,
      casesAwaitingReview,
    },
    subscription: sub ? {
      status: sub.status,
      trialEndsAt: sub.trial_ends_at,
      planName: sub.plan_name,
      planDisplayName: sub.plan_display_name,
      maxClients: sub.max_clients,
    } : null,
    clients,
    cases,
  };

  dashboardMemoryCache.set(orgId, { data: result, timestamp: Date.now() });
  return result;
}

export async function getCaseDetails(caseId: string, options?: { forceFresh?: boolean }): Promise<CaseWithDetails | null> {
  const sql = getDb();
  if (!sql) throw new Error("Neon Database is not connected.");

  await getAuthenticatedOrgId(); // Ensure authenticated

  if (!options?.forceFresh) {
    const cached = caseDetailsMemoryCache.get(caseId);
    if (cached && Date.now() - cached.timestamp < CASE_DETAILS_CACHE_TTL) {
      return cached.data;
    }
  }

  const [combinedCase] = await sql`
    SELECT
      (SELECT row_to_json(c) FROM (SELECT * FROM public.cases WHERE id::text = ${caseId} LIMIT 1) c) as case_info,
      (SELECT row_to_json(cli) FROM (
        SELECT cl.* FROM public.clients cl
        JOIN public.cases cs ON cs.client_id = cl.id
        WHERE cs.id::text = ${caseId} LIMIT 1
      ) cli) as client,
      (SELECT row_to_json(org) FROM (
        SELECT o.* FROM public.organizations o
        JOIN public.cases cs ON cs.organization_id = o.id
        WHERE cs.id::text = ${caseId} LIMIT 1
      ) org) as organization,
      (SELECT COALESCE(json_agg(req), '[]'::json) FROM (
        SELECT * FROM public.document_requirements
        WHERE case_id::text = ${caseId}
        ORDER BY sort_order ASC
      ) req) as requirements,
      (SELECT COALESCE(json_agg(doc), '[]'::json) FROM (
        SELECT id, requirement_id, case_id, client_id, version, file_name, storage_path,
               file_size, mime_type, status, rejection_reason, uploaded_by_type,
               uploaded_at, reviewed_at, reviewed_by, auto_delete_at
        FROM public.documents
        WHERE case_id::text = ${caseId}
        ORDER BY version ASC
      ) doc) as documents,
      (SELECT row_to_json(lnk) FROM (
        SELECT * FROM public.upload_links
        WHERE case_id::text = ${caseId}
        ORDER BY created_at DESC
        LIMIT 1
      ) lnk) as upload_link;
  `;

  if (!combinedCase || !combinedCase.case_info) return null;

  const c = combinedCase.case_info as any;
  const client = (combinedCase.client || null) as unknown as Client;
  const org = combinedCase.organization as any;
  let link = combinedCase.upload_link || null;
  const reqsRows = (combinedCase.requirements || []) as any[];
  const docsRows = (combinedCase.documents || []) as any[];

  if (!link) {
    const tokenData = generateUploadToken();
    const newLinks = await sql`
      INSERT INTO public.upload_links (
        case_id, token_hash, token_prefix, expires_at
      ) VALUES (
        ${caseId}, ${tokenData.tokenHash}, ${tokenData.tokenPrefix}, ${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()}
      )
      RETURNING *;
    `;
    link = newLinks[0] || null;
  }

  const requirements = reqsRows.map((r) => {
    const docs = docsRows.filter((d) => d.requirement_id === r.id);
    const latest = docs.length > 0 ? docs[docs.length - 1] : null;
    let effectiveStatus = r.status || "not_uploaded";
    if (latest) {
      if (latest.status === "approved" || r.status === "approved") {
        effectiveStatus = "approved";
      } else if (latest.status === "rejected") {
        effectiveStatus = "rejected";
      } else if (latest.status === "under_review" || latest.status === "uploaded") {
        effectiveStatus = "under_review";
      }
    }
    return {
      ...r,
      status: effectiveStatus,
      documents: docs,
    };
  });

  let currentStatus = c.status;
  if (c.status !== "archived") {
    const requiredReqs = requirements.filter((r) => r.is_required);
    const effectiveReqs = requiredReqs.length > 0 ? requiredReqs : requirements;
    if (effectiveReqs.length > 0 && effectiveReqs.every((r) => r.status === "approved")) {
      currentStatus = "completed";
    } else if (requirements.some((r) => r.status === "under_review" || r.status === "uploaded")) {
      currentStatus = "under_review";
    } else {
      currentStatus = "waiting_for_client";
    }
  }

  const caseResult: CaseWithDetails = {
    ...c,
    status: currentStatus,
    organization_name: org?.name || "Advisory Services",
    client,
    requirements,
    upload_link: link,
  };

  caseDetailsMemoryCache.set(caseId, { data: caseResult, timestamp: Date.now() });
  return caseResult;
}

export async function getPortalData(token: string, options?: { forceFresh?: boolean }): Promise<ClientPortalData | null> {
  if (!options?.forceFresh) {
    const cached = portalDataMemoryCache.get(token);
    if (cached && Date.now() - cached.timestamp < PORTAL_DATA_CACHE_TTL) {
      return cached.data;
    }
  }

  const sql = getDb();
  if (!sql) return null;

  try {
    const tokenHash = hashToken(token);
    let links = await sql`SELECT * FROM public.upload_links WHERE token_hash = ${tokenHash} LIMIT 1;`;
    if (links.length === 0) {
      links = await sql`SELECT * FROM public.upload_links WHERE token_hash = ${token} LIMIT 1;`;
    }
    if (links.length === 0) {
      links = await sql`SELECT * FROM public.upload_links WHERE token_prefix = ${token.slice(0, 8)} LIMIT 1;`;
    }

    let caseRecord: any = null;
    if (links.length > 0) {
      const cases = await sql`SELECT * FROM public.cases WHERE id = ${links[0].case_id} LIMIT 1;`;
      if (cases.length > 0) caseRecord = cases[0];
    } else {
      const cases = await sql`SELECT * FROM public.cases WHERE id::text = ${token} OR reference_number = ${token} LIMIT 1;`;
      if (cases.length > 0) caseRecord = cases[0];
    }

    if (!caseRecord) return null;

    const c = caseRecord;

    // Concurrently fetch client, organization, requirements, documents, and advisor contact details
    const [clients, orgs, reqsRows, docsRows, advisorRows] = await Promise.all([
      sql`SELECT * FROM public.clients WHERE id = ${c.client_id} LIMIT 1;`,
      sql`SELECT * FROM public.organizations WHERE id = ${c.organization_id} LIMIT 1;`,
      sql`SELECT * FROM public.document_requirements WHERE case_id = ${c.id} ORDER BY sort_order ASC;`,
      sql`
        SELECT id, requirement_id, case_id, client_id, version, file_name, storage_path,
               file_size, mime_type, status, rejection_reason, uploaded_by_type,
               uploaded_at, reviewed_at, reviewed_by, auto_delete_at
        FROM public.documents
        WHERE case_id = ${c.id}
        ORDER BY version ASC;
      `,
      sql`
        SELECT id, full_name, email, phone FROM public.users
        WHERE organization_id = ${c.organization_id}
        ORDER BY (role = 'owner') DESC, created_at ASC
        LIMIT 1;
      `
    ]);

    const client = clients[0] as any;
    const org = orgs[0] as any;
    const advisor = (advisorRows && advisorRows.length > 0 ? advisorRows[0] : null) as any;

    const reqs = (reqsRows as any[]).map((req) => {
      const docs = (docsRows as any[]).filter((d) => d.requirement_id === req.id);
      const latest = docs.length > 0 ? docs[docs.length - 1] : null;

      // Determine accurate effective status between requirement and latest document
      let effectiveStatus = req.status || "not_uploaded";
      if (latest) {
        if (latest.status === "approved" || req.status === "approved") {
          effectiveStatus = "approved";
        } else if (latest.status === "rejected") {
          effectiveStatus = "rejected";
        } else if (latest.status === "under_review" || latest.status === "uploaded") {
          effectiveStatus = "under_review";
        }
      } else if (effectiveStatus === "uploaded") {
        effectiveStatus = "under_review";
      }

      return {
        ...req,
        status: effectiveStatus,
        latest_document: latest,
        history: docs,
      };
    });

    const total = reqs.length;
    const requiredReqs = reqs.filter((r: any) => r.is_required);
    const required = requiredReqs.length;
    const approved = reqs.filter((r: any) => r.status === "approved").length;
    const under_review = reqs.filter((r: any) => r.status === "under_review" || r.status === "uploaded").length;
    const rejected = reqs.filter((r: any) => r.status === "rejected").length;
    const pending = reqs.filter((r: any) => r.status === "not_uploaded").length;

    // Fix 0% bug: When required count is 0 (all docs optional or unflagged), use total as the denominator
    const effectiveDenominator = required > 0 ? required : total;
    const percentage = effectiveDenominator > 0
      ? Math.min(100, Math.round((approved / effectiveDenominator) * 100))
      : (total === 0 ? 100 : 0);

    const result: ClientPortalData = {
      case: {
        id: c.id,
        title: c.title,
        service_type: c.service_type,
        reference_number: c.reference_number,
        status: c.status,
        due_date: c.due_date,
        notes: c.notes,
      },
      client: {
        name: client?.name || "Client",
        company: client?.company || null,
        email: client?.email || null,
        phone: client?.phone || "",
      },
      organization: {
        name: org?.name || "Professional Advisory Firm",
        logo_url: org?.logo_url
          ? (org.logo_url.startsWith("logos/") ? `/api/logo/${org.id}` : org.logo_url)
          : null,
        branding_color: org?.branding_color || "#171717",
        contact_email: org?.settings?.contact_email || advisor?.email || null,
        contact_phone: org?.settings?.contact_phone || advisor?.phone || null,
        advisor_name: advisor?.full_name || org?.name || null,
      },
      requirements: reqs,
      progress: { total, required, approved, under_review, rejected, pending, percentage },
    };

    portalDataMemoryCache.set(token, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn("getPortalData error:", err);
    return null;
  }
}

async function assertActiveSubscription(orgId: string, sql: any) {
  try {
    const subRows = await sql`
      SELECT s.status, s.trial_ends_at, s.current_period_end
      FROM public.subscriptions s
      WHERE s.organization_id = ${orgId}
      LIMIT 1;
    `;
    if (subRows.length === 0) return;

    const sub = subRows[0];
    const now = new Date();

    if (sub.status === "expired") {
      throw new Error(
        "Your 30-day free trial has expired. To continue using DocuCollect, please contact the administrator via UPI or WhatsApp to renew."
      );
    }

    if (sub.status === "trial" && sub.trial_ends_at && new Date(sub.trial_ends_at) < now) {
      await sql`UPDATE public.subscriptions SET status = 'expired', updated_at = NOW() WHERE organization_id = ${orgId};`;
      throw new Error(
        "Your 30-day free trial has expired. To continue using DocuCollect, please contact the administrator via UPI or WhatsApp to renew."
      );
    }

    if (sub.status === "active" && sub.current_period_end && new Date(sub.current_period_end) < now) {
      await sql`UPDATE public.subscriptions SET status = 'expired', updated_at = NOW() WHERE organization_id = ${orgId};`;
      throw new Error(
        "Your subscription plan has expired. Please visit Billing or contact the administrator to renew."
      );
    }
  } catch (err: any) {
    if (err.message?.includes("expired") || err.message?.includes("trial")) {
      throw err;
    }
  }
}

export async function createClientAction(formData: {
  name: string;
  email?: string;
  phone: string;
  alternate_phone?: string;
  company?: string;
  client_ref_id?: string;
  address?: string;
  notes?: string;
}) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();

  // Enforce subscription active status
  await assertActiveSubscription(orgId, sql);

  // Enforce subscription plan client limits
  try {
    const subRows = await sql`
      SELECT p.max_clients, (SELECT COUNT(*) FROM public.clients WHERE organization_id = ${orgId}) as current_count
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${orgId}
      LIMIT 1;
    `;
    if (subRows.length > 0) {
      const maxAllowed = Number(subRows[0].max_clients || 10);
      const currentCount = Number(subRows[0].current_count || 0);
      if (currentCount >= maxAllowed) {
        throw new Error(
          `Client limit reached (${currentCount}/${maxAllowed}). Please upgrade your plan in Billing to add more clients.`
        );
      }
    }
  } catch (quotaErr: any) {
    if (quotaErr.message?.includes("Client limit reached")) {
      throw quotaErr;
    }
    // If table doesn't exist yet during initial migration, continue gracefully
  }

  const clients = await sql`
    INSERT INTO public.clients (
      organization_id, name, email, phone, alternate_phone, company, client_ref_id, address, notes
    ) VALUES (
      ${orgId}, ${formData.name}, ${formData.email || null}, ${formData.phone},
      ${formData.alternate_phone || null}, ${formData.company || null},
      ${formData.client_ref_id || `CLI-${Date.now().toString().slice(-4)}`},
      ${formData.address || null}, ${formData.notes || null}
    )
    RETURNING *;
  `;

  invalidateDashboardCache(orgId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  return { success: true, client: clients[0] };
}

export interface ClientCsvRow {
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  client_ref_id?: string | null;
  alternate_phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function importClientsFromCsvAction(rows: ClientCsvRow[]) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();

  // Enforce subscription active status
  await assertActiveSubscription(orgId, sql);

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No client rows found in CSV file.");
  }

  // Batch limit constraint: Max 50 rows per batch
  const BATCH_LIMIT = 50;
  if (rows.length > BATCH_LIMIT) {
    throw new Error(
      `CSV batch import is limited to ${BATCH_LIMIT} contacts per upload. Your file contains ${rows.length} rows. Please reduce your file size.`
    );
  }

  // Enforce subscription plan client quota
  try {
    const subRows = await sql`
      SELECT p.max_clients, (SELECT COUNT(*) FROM public.clients WHERE organization_id = ${orgId}) as current_count
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${orgId}
      LIMIT 1;
    `;
    if (subRows.length > 0) {
      const maxAllowed = Number(subRows[0].max_clients || 10);
      const currentCount = Number(subRows[0].current_count || 0);
      const remainingSlots = Math.max(0, maxAllowed - currentCount);

      if (currentCount >= maxAllowed) {
        throw new Error(
          `Client limit reached (${currentCount}/${maxAllowed}). Please upgrade your plan in Billing to add more clients.`
        );
      }

      if (currentCount + rows.length > maxAllowed) {
        throw new Error(
          `Adding ${rows.length} clients exceeds your plan limit of ${maxAllowed} total clients. You currently have ${remainingSlots} slot(s) remaining. Please upgrade your plan or reduce the import batch.`
        );
      }
    }
  } catch (quotaErr: any) {
    if (
      quotaErr.message?.includes("Client limit reached") ||
      quotaErr.message?.includes("exceeds your plan limit")
    ) {
      throw quotaErr;
    }
  }

  // Validate and clean each row
  const timestamp = Date.now().toString().slice(-4);
  const validatedClients: ClientCsvRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = (r.name || "").trim();
    const phone = (r.phone || "").trim();

    if (!name) {
      throw new Error(`Row ${i + 1} has an empty Name.`);
    }
    if (!phone) {
      throw new Error(`Row ${i + 1} (${name}) has an empty Phone number.`);
    }

    validatedClients.push({
      name,
      phone,
      email: r.email ? String(r.email).trim() || null : null,
      company: r.company ? String(r.company).trim() || null : null,
      client_ref_id: r.client_ref_id ? String(r.client_ref_id).trim() : `CLI-${timestamp}-${i + 1}`,
      alternate_phone: r.alternate_phone ? String(r.alternate_phone).trim() || null : null,
      address: r.address ? String(r.address).trim() || null : null,
      notes: r.notes ? String(r.notes).trim() || null : null,
    });
  }

  // High-performance single-query batch insert: eliminates N sequential round trips to Neon
  let inserted: any[] = [];
  if (validatedClients.length > 0) {
    const clientsJson = JSON.stringify(validatedClients);
    const res = await sql`
      INSERT INTO public.clients (
        organization_id, name, email, phone, alternate_phone, company, client_ref_id, address, notes
      )
      SELECT
        ${orgId},
        (elem->>'name')::text,
        NULLIF(elem->>'email', '')::text,
        (elem->>'phone')::text,
        NULLIF(elem->>'alternate_phone', '')::text,
        NULLIF(elem->>'company', '')::text,
        NULLIF(elem->>'client_ref_id', '')::text,
        NULLIF(elem->>'address', '')::text,
        NULLIF(elem->>'notes', '')::text
      FROM json_array_elements(${clientsJson}::json) AS elem
      RETURNING *;
    `;
    inserted = res || [];
  }

  invalidateDashboardCache(orgId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");

  return { success: true, count: inserted.length, clients: inserted };
}

export async function updateClientAction(
  clientId: string,
  formData: {
    name: string;
    email?: string | null;
    phone: string;
    alternate_phone?: string | null;
    company?: string | null;
    client_ref_id?: string | null;
    address?: string | null;
    notes?: string | null;
  }
) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();
  await assertActiveSubscription(orgId, sql);

  if (!clientId) throw new Error("Client ID is required");
  if (!formData.name?.trim()) throw new Error("Name is required");
  if (!formData.phone?.trim()) throw new Error("Phone number is required");

  const updated = await sql`
    UPDATE public.clients
    SET
      name = ${formData.name.trim()},
      email = ${formData.email ? formData.email.trim() || null : null},
      phone = ${formData.phone.trim()},
      alternate_phone = ${formData.alternate_phone ? formData.alternate_phone.trim() || null : null},
      company = ${formData.company ? formData.company.trim() || null : null},
      client_ref_id = ${formData.client_ref_id ? formData.client_ref_id.trim() || null : null},
      address = ${formData.address ? formData.address.trim() || null : null},
      notes = ${formData.notes ? formData.notes.trim() || null : null},
      updated_at = NOW()
    WHERE id = ${clientId} AND organization_id = ${orgId}
    RETURNING *;
  `;

  if (updated.length === 0) {
    throw new Error("Client not found or unauthorized");
  }

  invalidateDashboardCache(orgId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");

  return { success: true, client: updated[0] };
}

export async function createCaseAction(payload: {
  client_id: string;
  title: string;
  service_type: string;
  reference_number: string;
  due_date?: string;
  notes?: string;
  requirements: { name: string; description: string; is_required: boolean }[];
}) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();
  await assertActiveSubscription(orgId, sql);

  // Enforce cases-per-client quota to prevent unnecessary database bloat
  const subRes = await sql`
    SELECT s.status, p.name as plan_name, COALESCE(p.max_cases_per_client, 5) as max_cases_per_client
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.organization_id = ${orgId}
    LIMIT 1;
  `;
  const planName = subRes[0]?.plan_name || "free_trial";
  let maxCasesPerClient = 5;
  if (planName === "pro" || planName === "professional") maxCasesPerClient = 25;
  else if (planName === "firm") maxCasesPerClient = 50;
  else if (planName === "starter") maxCasesPerClient = 10;
  else maxCasesPerClient = 5;

  const countRes = await sql`
    SELECT count(*)::int as count
    FROM public.cases
    WHERE organization_id = ${orgId} AND client_id = ${payload.client_id};
  `;
  const currentClientCases = Number(countRes[0]?.count || 0);
  if (currentClientCases >= maxCasesPerClient) {
    throw new Error(
      `Case limit reached for this client (${currentClientCases}/${maxCasesPerClient} cases allowed on your current plan). Please complete or delete existing cases for this client.`
    );
  }

  const cases = await sql`
    INSERT INTO public.cases (
      organization_id, client_id, title, service_type, reference_number, status, due_date, notes
    ) VALUES (
      ${orgId}, ${payload.client_id}, ${payload.title}, ${payload.service_type},
      ${payload.reference_number}, 'waiting_for_client', ${payload.due_date || null}, ${payload.notes || null}
    )
    RETURNING *;
  `;
  const newCase = cases[0];
  if (payload.requirements.length > 0) {
    const reqsJson = JSON.stringify(
      payload.requirements.map((req, idx) => ({
        name: req.name,
        description: req.description || null,
        is_required: Boolean(req.is_required),
        sort_order: idx + 1,
      }))
    );
    await sql`
      INSERT INTO public.document_requirements (
        case_id, name, description, is_required, status, sort_order
      )
      SELECT
        ${newCase.id},
        (elem->>'name')::text,
        NULLIF(elem->>'description', '')::text,
        (elem->>'is_required')::boolean,
        'not_uploaded',
        (elem->>'sort_order')::integer
      FROM json_array_elements(${reqsJson}::json) AS elem;
    `;
  }

  const tokenData = generateUploadToken();
  await sql`
    INSERT INTO public.upload_links (
      case_id, token_hash, token_prefix, expires_at
    ) VALUES (
      ${newCase.id}, ${tokenData.tokenHash}, ${tokenData.tokenPrefix}, ${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()}
    );
  `;

  invalidateDashboardCache(orgId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cases");
  return { success: true, case: newCase };
}

export async function generateUploadLinkAction(caseId: string) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();
  await assertActiveSubscription(orgId, sql);

  const tokenData = generateUploadToken();
  await sql`DELETE FROM public.upload_links WHERE case_id = ${caseId};`;
  await sql`
    INSERT INTO public.upload_links (
      case_id, token_hash, token_prefix, expires_at
    ) VALUES (
      ${caseId}, ${tokenData.tokenHash}, ${tokenData.tokenPrefix}, ${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()}
    );
  `;

  invalidateDashboardCache(orgId);
  invalidateCaseCache(caseId);
  revalidatePath(`/dashboard/cases/${caseId}`);
  return { success: true, token: tokenData.token, linkUrl: `/upload/${tokenData.token}` };
}

export async function reviewDocumentAction(
  caseId: string,
  requirementId: string,
  documentId: string,
  action: "approve" | "reject",
  rejectionReason?: string
) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();

  const newStatus = action === "approve" ? "approved" : "rejected";
  const reason = action === "reject" ? (rejectionReason || "Document rejected by advisor.") : null;

  // Retrieve organization's plan auto-purge policy for document retention
  const planRows = await sql`
    SELECT p.file_retention_days
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.organization_id = ${orgId}
    LIMIT 1;
  `;
  const retentionDays = Number(planRows[0]?.file_retention_days) || 7;

  await Promise.all([
    sql`
      UPDATE public.documents
      SET status = ${newStatus},
          rejection_reason = ${reason},
          reviewed_at = now(),
          auto_delete_at = CASE 
            WHEN ${action === "reject"} THEN (now() + (${retentionDays} * interval '1 day')) 
            ELSE auto_delete_at 
          END
      WHERE id = ${documentId};
    `,
    sql`
      UPDATE public.document_requirements
      SET status = ${newStatus}, updated_at = now()
      WHERE id = ${requirementId};
    `,
  ]);

  // Re-evaluate case status in database
  const caseReqs = await sql`
    SELECT status, is_required FROM public.document_requirements WHERE case_id = ${caseId};
  `;
  const reqsList = caseReqs as any[];
  const requiredList = reqsList.filter((r) => r.is_required);
  let updatedCaseStatus: "completed" | "under_review" | "waiting_for_client" = "waiting_for_client";

  if (requiredList.length > 0 && requiredList.every((r) => r.status === "approved")) {
    updatedCaseStatus = "completed";
  } else if (reqsList.some((r) => r.status === "under_review" || r.status === "uploaded")) {
    updatedCaseStatus = "under_review";
  } else {
    updatedCaseStatus = "waiting_for_client";
  }

  await sql`
    UPDATE public.cases
    SET status = ${updatedCaseStatus}, updated_at = now()
    WHERE id = ${caseId} AND status != 'archived';
  `;

  invalidateDashboardCache(orgId);
  invalidateCaseCache(caseId);
  invalidatePortalCache(caseId);
  revalidatePath(`/dashboard/cases/${caseId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function clientUploadDocumentAction(
  token: string,
  requirementId: string,
  fileInfo: { name: string; size: number; type: string; data?: string }
) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const tokenHash = hashToken(token);
  const links = await sql`
    SELECT * FROM public.upload_links 
    WHERE token_hash = ${tokenHash} OR token_hash = ${token} OR token_prefix = ${token.slice(0, 8)} 
    LIMIT 1;
  `;

  let caseId = links[0]?.case_id;
  if (!caseId) {
    const fallbackCases = await sql`SELECT id FROM public.cases WHERE id::text = ${token} LIMIT 1;`;
    caseId = fallbackCases[0]?.id;
  }

  if (!caseId) return { success: false, error: "Upload session not found or link expired" };

  // Parallel fetch: case + client + subscription retention, requirement title, doc count, and duplicate rejection check
  const [caseRows, reqRows, existingDocs, prevRejected] = await Promise.all([
    sql`
      SELECT c.*, cl.name as client_name, p.file_retention_days
      FROM public.cases c
      LEFT JOIN public.clients cl ON cl.id = c.client_id
      LEFT JOIN public.subscriptions s ON s.organization_id = c.organization_id
      LEFT JOIN public.plans p ON s.plan_id = p.id
      WHERE c.id = ${caseId} LIMIT 1;
    `,
    sql`SELECT name FROM public.document_requirements WHERE id = ${requirementId} LIMIT 1;`,
    sql`SELECT count(*) as count FROM public.documents WHERE requirement_id = ${requirementId};`,
    sql`
      SELECT file_size, file_name, rejection_reason FROM public.documents
      WHERE requirement_id = ${requirementId} AND status = 'rejected'
      ORDER BY version DESC LIMIT 1;
    `,
  ]);

  if (caseRows.length === 0) return { success: false, error: "Case not found" };
  const c = caseRows[0] as any;
  const retentionDays = Number(c.file_retention_days) || 7;
  const version = parseInt(existingDocs[0]?.count || "0") + 1;

  if (prevRejected.length > 0) {
    const lastRejected = prevRejected[0];
    if (Math.abs(Number(lastRejected.file_size) - fileInfo.size) <= 16) {
      return {
        success: false,
        error: `This file is identical to the previously rejected document. Previous rejection reason: "${lastRejected.rejection_reason || "Document did not meet requirements"}". Please upload a corrected document.`,
        isDuplicateRejected: true,
        rejectionReason: lastRejected.rejection_reason,
      };
    }
  }

  const reqTitle = (reqRows[0]?.name || "Document").replace(/[^a-zA-Z0-9\s-_]/g, "").trim();
  const clientTitle = (c.client_name || "Client").replace(/[^a-zA-Z0-9\s-_]/g, "").trim();
  const fileExt = fileInfo.name.includes(".") ? fileInfo.name.split(".").pop() || "pdf" : "pdf";
  const autoRenamedFileName = version > 1
    ? `${reqTitle} (v${version}) - ${clientTitle}.${fileExt}`
    : `${reqTitle} - ${clientTitle}.${fileExt}`;

  // 1. Generate clean storage key for Neon Object Storage using auto-renamed filename
  const storagePath = generateStoragePath({
    organizationId: c.organization_id,
    clientId: c.client_id,
    caseId: c.id,
    requirementId,
    version,
    fileName: autoRenamedFileName,
    mimeType: fileInfo.type,
  });

  // 2. Strict file size and binary validation (10 MB ceiling)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  if (fileInfo.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File exceeds the 10 MB upload limit (${(fileInfo.size / (1024 * 1024)).toFixed(1)} MB). Please choose a file under 10 MB.`,
    };
  }

  if (!fileInfo.data) {
    return { success: false, error: "No file content received for upload." };
  }

  try {
    let fileBuffer: Buffer;
    if (fileInfo.data.startsWith("data:")) {
      const commaIdx = fileInfo.data.indexOf(",");
      const base64Data = commaIdx !== -1 ? fileInfo.data.slice(commaIdx + 1) : fileInfo.data;
      fileBuffer = Buffer.from(base64Data, "base64");
    } else {
      fileBuffer = Buffer.from(fileInfo.data, "base64");
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Decoded file size exceeds the 10 MB upload limit (${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB). Please select a file under 10 MB.`,
      };
    }

    const uploadRes = await uploadFileToStorage({
      storagePath,
      fileBuffer,
      mimeType: fileInfo.type,
    });

    if (!uploadRes.success) {
      console.error("Storage upload failed:", uploadRes.error);
      return {
        success: false,
        error: uploadRes.error || "Failed to upload document to cloud storage. Please try again.",
      };
    }
  } catch (uploadErr: any) {
    console.error("Storage upload exception:", uploadErr);
    return {
      success: false,
      error: uploadErr.message || "Cloud storage upload failed. Please try again.",
    };
  }

  // 3. Concurrently insert document record, update requirement & case status, and log activity
  const [newDocs] = await Promise.all([
    sql`
      INSERT INTO public.documents (
        requirement_id, case_id, client_id, version, file_name, storage_path, file_size, mime_type, status, uploaded_by_type, auto_delete_at
      ) VALUES (
        ${requirementId}, ${c.id}, ${c.client_id}, ${version}, ${autoRenamedFileName},
        ${storagePath},
        ${fileInfo.size}, ${fileInfo.type}, 'under_review', 'client',
        (now() + (${Number(retentionDays) || 7} * interval '1 day'))
      )
      RETURNING id, requirement_id, case_id, client_id, version, file_name, storage_path, file_size, mime_type, status, uploaded_by_type, auto_delete_at, uploaded_at;
    `,
    sql`
      UPDATE public.document_requirements
      SET status = 'under_review', updated_at = now()
      WHERE id = ${requirementId};
    `,
    sql`
      UPDATE public.cases
      SET status = 'under_review', updated_at = now()
      WHERE id = ${c.id} AND status != 'completed';
    `,
    sql`
      INSERT INTO public.activity_logs (organization_id, case_id, action, actor_type, metadata)
      VALUES (
        ${c.organization_id}, ${c.id}, 'document_uploaded', 'client',
        ${JSON.stringify({
          document_name: fileInfo.name,
          retention_days: retentionDays,
          auto_delete_at: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString(),
        })}
      );
    `.catch((logErr: any) => console.warn("Activity log error:", logErr)),
  ]);

    if (c.organization_id) invalidateDashboardCache(c.organization_id);
    invalidateCaseCache(c.id);

    // Automated email notification to Advisor (sent via Google Apps Script Webhook / Resend)
    try {
      const orgInfo = await sql`
        SELECT p.name as plan_name, u.email as advisor_email
        FROM public.organizations o
        LEFT JOIN public.subscriptions s ON s.organization_id = o.id
        LEFT JOIN public.plans p ON s.plan_id = p.id
        LEFT JOIN public.users u ON u.organization_id = o.id
        WHERE o.id = ${c.organization_id}
        LIMIT 1;
      `;
      const planTier = (orgInfo[0]?.plan_name || "free").toLowerCase();
      const advisorEmail = orgInfo[0]?.advisor_email;

      if (advisorEmail) {
        // Use Promise.race with 4-second timeout to guarantee dispatch without stalling client
        await Promise.race([
          sendNotificationEmail({
            to: advisorEmail,
            subject: `📄 [DocuCollect] ${clientTitle} uploaded "${autoRenamedFileName}" for ${c.title}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 520px; border: 1px solid #e5e5e5; border-radius: 12px; background: #ffffff;">
                <h3 style="color: #111; margin: 0 0 12px; font-size: 18px;">📄 New Document Uploaded</h3>
                <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                  Client <strong>${clientTitle}</strong> has uploaded a document for requirement <strong>${reqTitle}</strong> in Case <strong>${c.title}</strong>.
                </p>
                <div style="background: #f9fafb; padding: 14px 18px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
                  <p style="margin: 0; font-size: 13px; color: #111;"><strong>Document:</strong> ${autoRenamedFileName}</p>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #111;"><strong>Client:</strong> ${clientTitle}</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Size: ${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB · Auto-Retention: ${retentionDays} days</p>
                </div>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://docucollect.app'}/dashboard/cases/${c.id}"
                   style="display: inline-block; padding: 10px 20px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px;">
                  Review Document in Dashboard →
                </a>
              </div>
            `,
            eventType: "doc_uploaded",
            plan: planTier,
          }),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
      }
    } catch (notifyErr) {
      console.warn("Client upload email dispatch warning:", notifyErr);
    }
  revalidatePath(`/upload/${token}`);
  revalidatePath(`/dashboard/cases/${c.id}`);
  revalidatePath("/dashboard");
  const uploadResponse = {
    success: true,
    document: {
      id: newDocs[0].id,
      requirement_id: newDocs[0].requirement_id,
      case_id: newDocs[0].case_id,
      client_id: newDocs[0].client_id,
      version: newDocs[0].version,
      file_name: newDocs[0].file_name,
      file_size: newDocs[0].file_size,
      mime_type: newDocs[0].mime_type,
      status: newDocs[0].status,
      uploaded_at: newDocs[0].uploaded_at,
    },
  };

  invalidateDashboardCache(c.organization_id);
  invalidateCaseCache(c.id);
  invalidatePortalCache(token);
  invalidatePortalCache(c.id);

  return uploadResponse;
}

/**
 * Re-evaluates and updates case status after document additions or deletions
 */
async function updateCaseStatusAfterDocChange(caseId: string, sql: any) {
  const reqs = await sql`
    SELECT status, is_required FROM public.document_requirements WHERE case_id = ${caseId};
  `;
  const total = reqs.length;
  const required = reqs.filter((r: any) => r.is_required);
  const allRequiredApproved = required.length > 0 && required.every((r: any) => r.status === "approved");
  const allApproved = total > 0 && reqs.every((r: any) => r.status === "approved");

  let newStatus = "waiting_for_client";
  if (allRequiredApproved || (total > 0 && allApproved)) {
    newStatus = "completed";
  } else if (reqs.some((r: any) => r.status === "under_review" || r.status === "uploaded")) {
    newStatus = "under_review";
  }

  await sql`
    UPDATE public.cases
    SET status = ${newStatus}, updated_at = now()
    WHERE id = ${caseId} AND status != 'archived';
  `;
  return newStatus;
}

/**
 * Client-side single document deletion (with token ownership validation)
 */
export async function clientDeleteDocumentAction(token: string, documentId: string) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const tokenHash = hashToken(token);
  let links = await sql`
    SELECT * FROM public.upload_links 
    WHERE token_hash = ${tokenHash} OR token_hash = ${token} OR token_prefix = ${token.slice(0, 8)} 
    LIMIT 1;
  `;

  let caseRecord: any = null;
  if (links.length > 0) {
    const cases = await sql`SELECT * FROM public.cases WHERE id = ${links[0].case_id} LIMIT 1;`;
    if (cases.length > 0) caseRecord = cases[0];
  } else {
    const cases = await sql`SELECT * FROM public.cases WHERE id::text = ${token} OR reference_number = ${token} LIMIT 1;`;
    if (cases.length > 0) caseRecord = cases[0];
  }

  if (!caseRecord) {
    return { success: false, error: "Upload link has expired or is invalid." };
  }

  const c = caseRecord;

  // Retrieve document to delete, ensuring it belongs to this case
  const docRows = await sql`
    SELECT * FROM public.documents WHERE id::text = ${documentId} AND case_id = ${c.id} LIMIT 1;
  `;
  if (docRows.length === 0) {
    return { success: false, error: "Document not found or does not belong to this case." };
  }
  const doc = docRows[0];

  // 1. Delete physical file from object storage
  if (doc.storage_path) {
    try {
      await deleteFileFromStorage(doc.storage_path);
    } catch (storageErr) {
      console.warn("Could not delete file from object storage:", storageErr);
    }
  }

  // 2. Remove document record from database
  await sql`DELETE FROM public.documents WHERE id = ${doc.id};`;

  // 3. Update requirement status based on any remaining documents
  const remainingDocs = await sql`
    SELECT status FROM public.documents 
    WHERE requirement_id = ${doc.requirement_id} 
    ORDER BY version DESC LIMIT 1;
  `;
  const newReqStatus = remainingDocs.length > 0 ? remainingDocs[0].status : "not_uploaded";
  await sql`
    UPDATE public.document_requirements
    SET status = ${newReqStatus}, updated_at = now()
    WHERE id = ${doc.requirement_id};
  `;

  // 4. Update overall case status
  await updateCaseStatusAfterDocChange(c.id, sql);

  // 5. Invalidate caches and revalidate paths
  invalidateDashboardCache(c.organization_id);
  invalidateCaseCache(c.id);
  invalidatePortalCache(token);
  invalidatePortalCache(c.id);

  revalidatePath(`/upload/${token}`);
  revalidatePath(`/dashboard/cases/${c.id}`);
  revalidatePath("/dashboard");

  return { success: true, message: `"${doc.file_name}" was deleted successfully.` };
}

/**
 * Advisor-side single document deletion (with org ownership check)
 */
export async function advisorDeleteDocumentAction(caseId: string, documentId: string) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();

  // Validate case belongs to organization
  const cases = await sql`
    SELECT * FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId} LIMIT 1;
  `;
  if (cases.length === 0) {
    return { success: false, error: "Case not found or unauthorized access." };
  }

  // Find document
  const docRows = await sql`
    SELECT * FROM public.documents WHERE id::text = ${documentId} AND case_id = ${caseId} LIMIT 1;
  `;
  if (docRows.length === 0) {
    return { success: false, error: "Document not found." };
  }
  const doc = docRows[0];

  // Delete from storage
  if (doc.storage_path) {
    try {
      await deleteFileFromStorage(doc.storage_path);
    } catch (err) {
      console.warn("Storage deletion warning:", err);
    }
  }

  // Delete from database
  await sql`DELETE FROM public.documents WHERE id = ${doc.id};`;

  // Update requirement status
  const remainingDocs = await sql`
    SELECT status FROM public.documents 
    WHERE requirement_id = ${doc.requirement_id} 
    ORDER BY version DESC LIMIT 1;
  `;
  const newReqStatus = remainingDocs.length > 0 ? remainingDocs[0].status : "not_uploaded";
  await sql`
    UPDATE public.document_requirements
    SET status = ${newReqStatus}, updated_at = now()
    WHERE id = ${doc.requirement_id};
  `;

  // Update case status
  await updateCaseStatusAfterDocChange(caseId, sql);

  // Invalidate caches and revalidate
  invalidateDashboardCache(orgId);
  invalidateCaseCache(caseId);
  invalidatePortalCache(caseId);

  revalidatePath(`/dashboard/cases/${caseId}`);
  revalidatePath("/dashboard");

  return { success: true, message: `"${doc.file_name}" was deleted successfully.` };
}

/**
 * Advisor-side bulk document deletion (with org ownership check)
 */
export async function advisorBulkDeleteDocumentsAction(caseId: string, documentIds: string[]) {
  if (!documentIds || documentIds.length === 0) {
    return { success: false, error: "No documents selected for deletion." };
  }

  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();

  const cases = await sql`
    SELECT * FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId} LIMIT 1;
  `;
  if (cases.length === 0) {
    return { success: false, error: "Case not found or unauthorized access." };
  }

  // Fetch all documents matching the IDs
  const docs = await sql`
    SELECT id, requirement_id, file_name, storage_path 
    FROM public.documents 
    WHERE id::text = ANY(${documentIds}) AND case_id = ${caseId};
  `;

  if (docs.length === 0) {
    return { success: false, error: "No matching documents found to delete." };
  }

  // 1. Delete physical files from storage in parallel
  await Promise.all(
    docs.map(async (d: any) => {
      if (d.storage_path) {
        try {
          await deleteFileFromStorage(d.storage_path);
        } catch (e) {
          console.warn("Bulk storage delete warning for", d.storage_path, e);
        }
      }
    })
  );

  // 2. Delete database records
  const validIds = docs.map((d: any) => d.id);
  await sql`DELETE FROM public.documents WHERE id = ANY(${validIds}) AND case_id = ${caseId};`;

  // 3. Update requirement status for all affected requirements
  const affectedReqIds = Array.from(new Set(docs.map((d: any) => d.requirement_id)));
  for (const reqId of affectedReqIds) {
    const rem = await sql`
      SELECT status FROM public.documents 
      WHERE requirement_id = ${reqId} 
      ORDER BY version DESC LIMIT 1;
    `;
    const newReqStatus = rem.length > 0 ? rem[0].status : "not_uploaded";
    await sql`
      UPDATE public.document_requirements
      SET status = ${newReqStatus}, updated_at = now()
      WHERE id = ${reqId};
    `;
  }

  // 4. Update case status
  await updateCaseStatusAfterDocChange(caseId, sql);

  // 5. Invalidate caches
  invalidateDashboardCache(orgId);
  invalidateCaseCache(caseId);
  invalidatePortalCache(caseId);

  revalidatePath(`/dashboard/cases/${caseId}`);
  revalidatePath("/dashboard");

  return { 
    success: true, 
    count: docs.length, 
    message: `Successfully deleted ${docs.length} document(s).` 
  };
}

export async function raiseClientQueryAction(token: string, requirementId: string, message: string) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const tokenHash = hashToken(token);
  let links = await sql`SELECT * FROM public.upload_links WHERE token_hash = ${tokenHash} LIMIT 1;`;
  if (links.length === 0) links = await sql`SELECT * FROM public.upload_links WHERE token_hash = ${token} LIMIT 1;`;
  if (links.length === 0) links = await sql`SELECT * FROM public.upload_links WHERE token_prefix = ${token.slice(0, 8)} LIMIT 1;`;

  let caseId = links[0]?.case_id;
  if (!caseId) {
    const cases = await sql`SELECT id FROM public.cases WHERE id::text = ${token} LIMIT 1;`;
    caseId = cases[0]?.id;
  }

  if (!caseId) return { success: false, error: "Invalid link" };

  const cases = await sql`
    SELECT c.*, cl.name as client_name FROM public.cases c
    JOIN public.clients cl ON c.client_id = cl.id
    WHERE c.id = ${caseId} LIMIT 1;
  `;
  if (cases.length === 0) return { success: false, error: "Case not found" };
  const c = cases[0] as any;

  const reqs = await sql`SELECT name FROM public.document_requirements WHERE id = ${requirementId} LIMIT 1;`;
  const reqName = reqs[0]?.name || "Document";

  await sql`
    INSERT INTO public.activity_logs (organization_id, case_id, action, actor_type, metadata)
    VALUES (
      ${c.organization_id}, ${c.id}, 'client_query', 'client',
      ${JSON.stringify({ client_name: c.client_name, requirement_name: reqName, message: message.trim(), created_at: new Date().toISOString() })}
    );
  `;

    revalidatePath(`/dashboard/cases/${c.id}`);
    revalidatePath("/dashboard");
    if (c.organization_id) invalidateNotificationsCache(c.organization_id);
    return { success: true, message: "Your query has been sent to your consultant." };
  }

  export async function getAdvisorNotificationsAction() {
    const sql = getDb();
    if (!sql) return [];

    const session = await getSession();
    if (!session?.organizationId) return [];

    const cached = notifsMemoryCache.get(session.organizationId);
    if (cached && Date.now() - cached.timestamp < NOTIFS_CACHE_TTL) {
      return cached.data;
    }

    try {
      const logs = await sql`
        SELECT l.*, c.title as case_title, c.reference_number
        FROM public.activity_logs l
        JOIN public.cases c ON l.case_id = c.id
        WHERE c.organization_id = ${session.organizationId}
        ORDER BY l.created_at DESC
        LIMIT 10;
      `;

      const notifs = (logs as any[]).map((log) => {
        const meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata || {};
        const isQuery = log.action === "client_query";
        return {
          id: log.id,
          title: isQuery ? `Client Message: ${meta.client_name || "Client"}` : "Document Submission",
          description: isQuery
            ? `Query on ${meta.requirement_name || "item"}: "${meta.message}"`
            : `New file submitted for ${log.case_title}`,
          timestamp: new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: isQuery ? "query" : "upload",
        };
      });

      notifsMemoryCache.set(session.organizationId, { data: notifs, timestamp: Date.now() });
      return notifs;
    } catch (err) {
      console.warn("Error fetching notifications:", err);
      return [];
    }
  }

/**
 * Fetch full audit trail for the organization.
 * Retention Policy:
 * - Starter / Trial / Free: 14 days history, older logs are automatically pruned.
 * - Professional / Firm: 30 days history.
 */
export async function getFullAuditLogsAction(): Promise<{
  logs: any[];
  retentionDays: number;
  isProOrFirm: boolean;
  planDisplayName?: string;
}> {
  const sql = getDb();
  if (!sql) return { logs: [], retentionDays: 14, isProOrFirm: false };

  const session = await getSession();
  if (!session?.organizationId) return { logs: [], retentionDays: 14, isProOrFirm: false };

  try {
    // 1. Determine plan-based audit retention
    const subRes = await sql`
      SELECT s.status, p.name as plan_name, p.display_name as plan_display_name
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${session.organizationId}
      LIMIT 1;
    `;
    const sub = subRes[0] as any;
    let retentionDays = 14;
    let planDisplayName = "Trial";
    if (sub && sub.status === "active") {
      if (sub.plan_name === "firm") {
        retentionDays = 60;
        planDisplayName = "Firm";
      } else if (sub.plan_name === "pro" || sub.plan_name === "professional") {
        retentionDays = 45;
        planDisplayName = "Professional";
      } else if (sub.plan_name === "starter") {
        retentionDays = 30;
        planDisplayName = "Starter";
      }
    }
    const isProOrFirm = !!(sub && sub.status === "active" && (sub.plan_name === "pro" || sub.plan_name === "firm"));

    // 2. Auto-delete audit records older than the retention threshold
    await sql`
      DELETE FROM public.activity_logs
      WHERE organization_id = ${session.organizationId}
        AND created_at < (now() - (${retentionDays} * interval '1 day'));
    `.catch((delErr: any) => console.warn("Audit retention auto-purge non-blocking error:", delErr));

    // 3. Query audit trail within the retention window
    const logs = await sql`
      SELECT l.*, c.title as case_title, c.reference_number, cl.name as client_name
      FROM public.activity_logs l
      LEFT JOIN public.cases c ON l.case_id = c.id
      LEFT JOIN public.clients cl ON c.client_id = cl.id
      WHERE l.organization_id = ${session.organizationId}
        AND l.created_at >= (now() - (${retentionDays} * interval '1 day'))
      ORDER BY l.created_at DESC
      LIMIT 250;
    `;

    return {
      logs: logs as any[],
      retentionDays,
      isProOrFirm,
      planDisplayName,
    };
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    return { logs: [], retentionDays: 14, isProOrFirm: false };
  }
}

export async function deleteClientAction(clientId: string) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();

  try {
    // Paid plan restriction: verify active paid subscription
    const subRes = await sql`
      SELECT s.status, s.trial_ends_at, s.current_period_end, p.name as plan_name
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${orgId}
      LIMIT 1;
    `;
    const sub = subRes[0] as any;
    const isPaid = !!(sub && sub.status === "active" && sub.plan_name !== "trial" && sub.plan_name !== "free");
    if (!isPaid) {
      return {
        success: false,
        error: "Deleting clients is only available on paid plans (Starter, Professional, Firm). Free trial accounts cannot delete client portfolios.",
      };
    }

    await sql`DELETE FROM public.cases WHERE client_id = ${clientId} AND organization_id = ${orgId};`;
    await sql`DELETE FROM public.clients WHERE id = ${clientId} AND organization_id = ${orgId};`;

    invalidateDashboardCache(orgId);
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSubscriptionAction() {
  const sql = getDb();
  if (!sql) return null;

  const session = await getSession();
  if (!session?.organizationId) return null;

  try {
    const rows = await sql`
      SELECT s.*, p.name as plan_name, p.display_name as plan_display_name,
             p.price_monthly, p.price_yearly, p.max_clients, p.max_cases_per_client,
             p.max_storage_mb, p.file_retention_days, p.features,
             (SELECT COUNT(*) FROM public.clients WHERE organization_id::text = ${session.organizationId}::text) as current_clients_count
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id::text = ${session.organizationId}::text
      LIMIT 1;
    `;

    if (rows.length === 0) {
      const freePlan = await sql`SELECT id FROM public.plans WHERE name = 'free_trial' LIMIT 1;`;
      if (freePlan.length > 0) {
        await sql`
          INSERT INTO public.subscriptions (organization_id, plan_id, status, trial_ends_at)
          VALUES (${session.organizationId}::uuid, ${freePlan[0].id}::uuid, 'trial', now() + interval '30 days')
          ON CONFLICT (organization_id) DO NOTHING;
        `;
        const newRows = await sql`
          SELECT s.*, p.name as plan_name, p.display_name as plan_display_name,
                 p.price_monthly, p.price_yearly, p.max_clients, p.max_cases_per_client,
                 p.max_storage_mb, p.file_retention_days, p.features,
                 (SELECT COUNT(*) FROM public.clients WHERE organization_id::text = ${session.organizationId}::text) as current_clients_count
          FROM public.subscriptions s
          JOIN public.plans p ON s.plan_id = p.id
          WHERE s.organization_id::text = ${session.organizationId}::text
          LIMIT 1;
        `;
        const res = (newRows[0] as any) || null;
        if (res) res.email = session.email || "";
        return res;
      }
    }

    const res = (rows[0] as any) || null;
    if (res) {
      res.email = session.email || "";
    }
    return res;
  } catch {
    return null;
  }
}

let cachedPlansData: any[] | null = null;
let cachedPlansTimestamp = 0;

export async function getAllPlansAction() {
  if (cachedPlansData && Date.now() - cachedPlansTimestamp < 60000) {
    return cachedPlansData;
  }
  const sql = getDb();
  if (!sql) return cachedPlansData || [];

  try {
    const plans = await sql`SELECT * FROM public.plans ORDER BY sort_order ASC;`;
    cachedPlansData = plans as any[];
    cachedPlansTimestamp = Date.now();
    return plans as any[];
  } catch {
    return cachedPlansData || [];
  }
}

/**
 * Redeem a single-use license key / voucher code
 * Client-facing: users do NOT need an admin password, they only redeem the unique key they were issued.
 * Single-use: once redeemed, the key is permanently locked to this organization and cannot be reused or shared.
 */
export async function redeemLicenseKeyAction({ code }: { code: string }) {
  if (!code || !code.trim()) {
    return { success: false, error: "Please enter a valid license key." };
  }

  const cleanCode = code.trim().toUpperCase();
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "You must be signed in to your account to redeem a license key." };
  }

  try {
    // 1. Look up the license key
    const keyRows = await sql`
      SELECT * FROM public.license_keys 
      WHERE UPPER(code) = ${cleanCode}
      LIMIT 1;
    `;

    if (keyRows.length === 0) {
      return { 
        success: false, 
        error: "Invalid license key. Please check the code format (e.g., DOCU-PRO-YR-XXXX-XXXX) or contact support." 
      };
    }

    const key = keyRows[0];

    // 2. Enforce single-use restriction
    if (key.status === "redeemed") {
      const redeemedDate = key.redeemed_at 
        ? new Date(key.redeemed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "earlier";
      return {
        success: false,
        error: `This license key was already redeemed on ${redeemedDate} and cannot be reused or shared with other accounts.`,
      };
    }

    if (key.status === "revoked") {
      return {
        success: false,
        error: "This license key is no longer valid or has been revoked by administration.",
      };
    }

    // 3. Find the associated plan
    const planRows = await sql`
      SELECT id, name, display_name FROM public.plans WHERE name = ${key.plan_name} LIMIT 1;
    `;
    if (planRows.length === 0) {
      return { success: false, error: `Configured plan "${key.plan_name}" not found in system.` };
    }
    const plan = planRows[0];

    // 4. Calculate subscription duration
    const days = key.period === "yearly" ? 365 : 30;
    const currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    // 5. Update or insert the subscription for this organization
    const existing = await sql`
      SELECT id FROM public.subscriptions WHERE organization_id = ${session.organizationId} LIMIT 1;
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE public.subscriptions
        SET plan_id = ${plan.id},
            status = 'active',
            trial_ends_at = NULL,
            current_period_start = now(),
            current_period_end = ${currentPeriodEnd},
            payment_method = 'license_key',
            payment_notes = ${'Redeemed single-use voucher: ' + cleanCode},
            activated_by = 'license_voucher',
            updated_at = now()
        WHERE id = ${existing[0].id};
      `;
    } else {
      await sql`
        INSERT INTO public.subscriptions (
          organization_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, payment_method, payment_notes, activated_by
        ) VALUES (
          ${session.organizationId}, ${plan.id}, 'active', NULL, now(), ${currentPeriodEnd}, 'license_key', ${'Redeemed single-use voucher: ' + cleanCode}, 'license_voucher'
        );
      `;
    }

    // 6. Permanently mark key as redeemed to prevent sharing / reuse
    await sql`
      UPDATE public.license_keys
      SET status = 'redeemed',
          redeemed_by_org_id = ${session.organizationId},
          redeemed_by_user_id = ${session.userId || null},
          redeemed_by_email = ${session.email || null},
          redeemed_at = now()
      WHERE id = ${key.id};
    `;

    invalidateDashboardCache(session.organizationId);
    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");

    const periodLabel = key.period === "yearly" ? "1 Year" : "30 Days";
    return {
      success: true,
      message: `🎉 Success! Your account has been upgraded to ${plan.display_name} (${periodLabel})!`,
      planName: plan.display_name as string,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to redeem license key." };
  }
}

/**
 * Strict Dual-Factor Admin Verification
 * Validates both:
 * 1. ADMIN_SECRET against process.env.ADMIN_SECRET
 * 2. Admin Email against allowed admin emails in process.env.ADMIN_EMAIL
 * Also allows detecting admin email from verified user session if not passed directly.
 */
export async function verifyAdminAuthorization(
  adminSecret?: string,
  adminEmail?: string
): Promise<{ authorized: boolean; error?: string; email?: string }> {
  const EXPECTED_SECRET = (process.env.ADMIN_SECRET || "admin123").trim();

  if (!adminSecret || adminSecret.trim() !== EXPECTED_SECRET) {
    return { authorized: false, error: "Invalid Admin Secret Key." };
  }

  // Allowed admin emails from environment (supports comma-separated list)
  const rawAdminEmails = process.env.ADMIN_EMAIL || "yashveer2024@gmail.com,amankumarak5933485@gmail.com";
  const allowedAdminEmails = rawAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  let candidateEmail = adminEmail ? adminEmail.trim().toLowerCase() : "";

  // If candidate email not explicitly provided, attempt to detect from authenticated user session
  if (!candidateEmail) {
    try {
      const session = await getSession();
      if (session?.email) {
        candidateEmail = session.email.trim().toLowerCase();
      }
    } catch {}
  }

  if (!candidateEmail) {
    return {
      authorized: false,
      error: "Admin email verification required. Please provide your authorized admin email address.",
    };
  }

  if (!allowedAdminEmails.includes(candidateEmail)) {
    return {
      authorized: false,
      error: `Access Denied: The email "${candidateEmail}" does not have administrative privileges.`,
    };
  }

  return { authorized: true, email: candidateEmail };
}

/**
 * Generate a new single-use license key (Admin only)
 * The admin generates this key after receiving customer payment and gives it to the customer.
 */
export async function generateLicenseKeyAction({
  adminSecret,
  adminEmail,
  planName,
  period = "monthly",
  notes = "",
}: {
  adminSecret: string;
  adminEmail?: string;
  planName: "starter" | "pro" | "firm";
  period: "monthly" | "yearly";
  notes?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const planTag = planName.toUpperCase() === "PRO" ? "PRO" : planName.toUpperCase() === "FIRM" ? "FIRM" : "START";
    const periodTag = period === "yearly" ? "YR" : "MO";
    const part1 = crypto.randomBytes(3).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(3).toString("hex").toUpperCase();
    const code = `DOCU-${planTag}-${periodTag}-${part1}-${part2}`;

    const inserted = await sql`
      INSERT INTO public.license_keys (
        code, plan_name, period, notes, status, created_by
      ) VALUES (
        ${code}, ${planName}, ${period}, ${notes || "Generated via Admin Billing Tool"}, 'active', ${auth.email || "admin"}
      )
      RETURNING *;
    `;

    return {
      success: true,
      key: inserted[0],
      message: `License key generated successfully! Send this single-use key to the client.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate license key." };
  }
}

/**
 * Fetch all generated license keys with redemption history (Admin only)
 */
export async function getLicenseKeysAction({
  adminSecret,
  adminEmail,
}: {
  adminSecret: string;
  adminEmail?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const rows = await sql`
      SELECT id, code, plan_name, period, status, redeemed_by_email, redeemed_at, notes, created_at
      FROM public.license_keys
      ORDER BY created_at DESC
      LIMIT 100;
    `;
    return { success: true, keys: rows as any[] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch license keys." };
  }
}

/**
 * Revoke an active license key so it cannot be redeemed (Admin only)
 */
export async function revokeLicenseKeyAction({
  adminSecret,
  adminEmail,
  keyId,
}: {
  adminSecret: string;
  adminEmail?: string;
  keyId: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    await sql`
      UPDATE public.license_keys
      SET status = 'revoked'
      WHERE id = ${keyId} AND status = 'active';
    `;
    return { success: true, message: "License key revoked." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to revoke key." };
  }
}

/**
 * Admin action to activate or upgrade a client's plan manually
 * Validates against ADMIN_SECRET + ADMIN_EMAIL
 */
export async function activateSubscriptionAction({
  userEmail,
  organizationId,
  planName,
  period = "monthly",
  adminSecret,
  adminEmail,
  paymentMethod = "upi",
  paymentNotes = "",
}: {
  userEmail?: string;
  organizationId?: string;
  planName: string;
  period?: "monthly" | "yearly";
  adminSecret: string;
  adminEmail?: string;
  paymentMethod?: string;
  paymentNotes?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    // 1. Identify target organization
    let targetOrgId = organizationId;
    if (!targetOrgId && userEmail) {
      const userRows = await sql`
        SELECT organization_id FROM public.users WHERE LOWER(email) = LOWER(${userEmail.trim()}) LIMIT 1;
      `;
      if (userRows.length === 0) {
        return { success: false, error: `No registered user found with email: ${userEmail}` };
      }
      targetOrgId = userRows[0].organization_id;
    }

    if (!targetOrgId) {
      const session = await getSession();
      if (!session?.organizationId) {
        return { success: false, error: "Please provide a user email or log in." };
      }
      targetOrgId = session.organizationId;
    }

    // 2. Fetch the plan
    const planRows = await sql`
      SELECT id, name, display_name FROM public.plans WHERE name = ${planName} LIMIT 1;
    `;
    if (planRows.length === 0) {
      return { success: false, error: `Selected plan "${planName}" was not found.` };
    }
    const plan = planRows[0];

    const days = period === "yearly" ? 365 : 30;
    const currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    // 3. Upsert subscription
    const existing = await sql`
      SELECT id FROM public.subscriptions WHERE organization_id = ${targetOrgId} LIMIT 1;
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE public.subscriptions
        SET plan_id = ${plan.id},
            status = 'active',
            trial_ends_at = NULL,
            current_period_start = now(),
            current_period_end = ${currentPeriodEnd},
            payment_method = ${paymentMethod},
            payment_notes = ${paymentNotes || `Manual admin activation (${period}) by ${auth.email}`},
            activated_by = ${auth.email || "admin"},
            updated_at = now()
        WHERE id = ${existing[0].id};
      `;
    } else {
      await sql`
        INSERT INTO public.subscriptions (
          organization_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, payment_method, payment_notes, activated_by
        ) VALUES (
          ${targetOrgId}, ${plan.id}, 'active', NULL, now(), ${currentPeriodEnd}, ${paymentMethod}, ${paymentNotes || `Manual admin activation (${period}) by ${auth.email}`}, ${auth.email || "admin"}
        );
      `;
    }

    if (targetOrgId) invalidateDashboardCache(targetOrgId);
    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Plan activated! Upgraded to ${plan.display_name} (${period}) for ${days} days.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to activate subscription" };
  }
}

/**
 * Full admin overview for the dedicated Admin Panel
 */
export async function getAdminOverviewAction({
  adminSecret,
  adminEmail,
}: {
  adminSecret: string;
  adminEmail?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const [
      usersCount,
      orgsCount,
      keys,
      users,
      plans,
      dbSizeRes,
      storageRes,
      casesRes,
      clientsRes,
      uploads24hRes,
      uploads7dRes,
      subsRes,
      tablesRes,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM public.users;`,
      sql`SELECT COUNT(*) as count FROM public.organizations;`,
      sql`SELECT * FROM public.license_keys ORDER BY created_at DESC LIMIT 50;`,
      sql`
        SELECT u.id, u.email, u.full_name, u.role, u.created_at, u.is_deactivated, u.deactivated_at,
               o.name as org_name, s.status as sub_status, p.display_name as plan_name, s.current_period_end
        FROM public.users u
        LEFT JOIN public.organizations o ON u.organization_id = o.id
        LEFT JOIN public.subscriptions s ON o.id = s.organization_id
        LEFT JOIN public.plans p ON s.plan_id = p.id
        ORDER BY u.created_at DESC
        LIMIT 50;
      `,
      sql`SELECT * FROM public.plans WHERE is_active = true ORDER BY sort_order ASC;`,
      sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size_str, pg_database_size(current_database())::bigint as raw_bytes;`,
      sql`
        SELECT 
          COUNT(*)::int as total_files, 
          COALESCE(SUM(file_size), 0)::bigint as total_bytes,
          COUNT(*) FILTER (WHERE status = 'under_review')::int as pending_files,
          COUNT(*) FILTER (WHERE status = 'approved')::int as approved_files,
          COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected_files,
          COUNT(*) FILTER (WHERE auto_delete_at IS NOT NULL AND auto_delete_at <= now() + interval '7 days')::int as purge_pending
        FROM public.documents;
      `,
      sql`
        SELECT 
          COUNT(*)::int as total_cases,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_cases,
          COUNT(*) FILTER (WHERE status != 'completed' AND status != 'archived')::int as active_cases
        FROM public.cases;
      `,
      sql`SELECT COUNT(*)::int as total_clients FROM public.clients;`,
      sql`SELECT COUNT(*)::int as count FROM public.documents WHERE uploaded_at >= now() - interval '24 hours';`,
      sql`SELECT COUNT(*)::int as count FROM public.documents WHERE uploaded_at >= now() - interval '7 days';`,
      sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active')::int as active_subs,
          COUNT(*) FILTER (WHERE status = 'trial')::int as trial_subs
        FROM public.subscriptions;
      `,
      sql`
        SELECT relname as table_name, n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC LIMIT 8;
      `,
    ]);

    const activeKeysCount = keys.filter((k: any) => k.status === "active").length;
    const redeemedKeysCount = keys.filter((k: any) => k.status === "redeemed").length;

    // Database Metrics (1 GB Postgres Compute & Storage Limit)
    const dbRawBytes = Number(dbSizeRes[0]?.raw_bytes || 0);
    const dbLimitBytes = 1024 * 1024 * 1024; // 1 GB Database allocation
    const dbPercent = Math.min(100, Math.round((dbRawBytes / dbLimitBytes) * 100));

    // Storage Metrics (Neon Object Storage / S3 - 5 GB Quota)
    const storageRawBytes = Number(storageRes[0]?.total_bytes || 0);
    const storageLimitBytes = 5 * 1024 * 1024 * 1024; // 5 GB Object Storage Quota
    const storagePercent = Math.min(100, Math.round((storageRawBytes / storageLimitBytes) * 100));

    return {
      success: true,
      stats: {
        totalUsers: Number(usersCount[0]?.count || 0),
        totalOrgs: Number(orgsCount[0]?.count || 0),
        activeKeys: activeKeysCount,
        redeemedKeys: redeemedKeysCount,
      },
      dbMetrics: {
        sizeStr: dbSizeRes[0]?.size_str || "9.2 MB",
        rawBytes: dbRawBytes,
        limitBytes: dbLimitBytes,
        limitStr: "1 GB",
        percentUsed: dbPercent,
        tables: (tablesRes as any[]).map((t) => ({
          tableName: t.table_name,
          rowCount: Number(t.row_count || 0),
        })),
      },
      storageMetrics: {
        bucketName: process.env.AWS_S3_BUCKET || "first-bucket",
        region: process.env.AWS_REGION || "ap-southeast-1",
        totalFiles: Number(storageRes[0]?.total_files || 0),
        rawBytes: storageRawBytes,
        sizeFormatted: (storageRawBytes / (1024 * 1024)).toFixed(2) + " MB",
        limitBytes: storageLimitBytes,
        limitStr: "5 GB",
        percentUsed: storagePercent,
        pendingFiles: Number(storageRes[0]?.pending_files || 0),
        approvedFiles: Number(storageRes[0]?.approved_files || 0),
        rejectedFiles: Number(storageRes[0]?.rejected_files || 0),
        purgePending: Number(storageRes[0]?.purge_pending || 0),
      },
      analytics: {
        totalCases: Number(casesRes[0]?.total_cases || 0),
        activeCases: Number(casesRes[0]?.active_cases || 0),
        completedCases: Number(casesRes[0]?.completed_cases || 0),
        totalClients: Number(clientsRes[0]?.total_clients || 0),
        uploadsLast24h: Number(uploads24hRes[0]?.count || 0),
        uploadsLast7d: Number(uploads7dRes[0]?.count || 0),
        activeSubscriptions: Number(subsRes[0]?.active_subs || 0),
        trialSubscriptions: Number(subsRes[0]?.trial_subs || 0),
      },
      keys: keys as any[],
      recentUsers: users as any[],
      plans: plans as any[],
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load admin overview." };
  }
}



export interface PublicPaymentSettings {
  upi_id: string;
  bank_name: string;
  bank_holder: string;
  bank_account: string;
  bank_ifsc: string;
  contact_email: string;
  contact_phone: string;
  show_upi: boolean;
  show_bank: boolean;
  show_whatsapp: boolean;
}

export async function getPublicPaymentSettingsAction(): Promise<PublicPaymentSettings> {
  const fallbackSettings: PublicPaymentSettings = {
    upi_id: process.env.NEXT_PUBLIC_UPI_ID || "7290964963@kotak811",
    bank_name: process.env.NEXT_PUBLIC_BANK_NAME || "State Bank of India",
    bank_holder: process.env.NEXT_PUBLIC_BANK_HOLDER || "DocuCollect Technologies",
    bank_account: process.env.NEXT_PUBLIC_BANK_ACCOUNT || "3982001100234",
    bank_ifsc: process.env.NEXT_PUBLIC_BANK_IFSC || "SBIN0001234",
    contact_email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@docucollect.in",
    contact_phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919718871979",
    show_upi: true,
    show_bank: true,
    show_whatsapp: true,
  };

  const sql = getDb();
  if (!sql) return fallbackSettings;

  try {
    const rows = await sql`SELECT value FROM public.system_settings WHERE key = 'payment_settings' LIMIT 1;`;
    if (rows && rows.length > 0 && rows[0].value) {
      return {
        ...fallbackSettings,
        ...rows[0].value,
      };
    }
  } catch (err) {
    console.warn("Failed to load payment settings from DB, using defaults:", err);
  }

  return fallbackSettings;
}

export async function updatePaymentSettingsAction(
  firstArg:
    | string
    | {
        adminSecret?: string;
        settings?: Partial<PublicPaymentSettings>;
        adminEmail?: string;
      },
  secondArg?: Partial<PublicPaymentSettings>,
  thirdArg?: string
): Promise<{ success: boolean; error?: string; settings?: PublicPaymentSettings }> {
  let adminSecret = "";
  let settings: Partial<PublicPaymentSettings> = {};
  let adminEmail: string | undefined = undefined;

  if (typeof firstArg === "object" && firstArg !== null) {
    adminSecret = firstArg.adminSecret || "";
    settings = firstArg.settings || {};
    adminEmail = firstArg.adminEmail;
  } else {
    adminSecret = (firstArg as string) || "";
    settings = secondArg || {};
    adminEmail = thirdArg;
  }

  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error || "Unauthorized. Invalid Admin Credentials." };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const current = await getPublicPaymentSettingsAction();
    const updated: PublicPaymentSettings = {
      ...current,
      ...settings,
    };

    await sql`
      INSERT INTO public.system_settings (key, value, updated_at)
      VALUES ('payment_settings', ${JSON.stringify(updated)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now();
    `;

    return { success: true, settings: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update payment settings" };
  }
}

/**
 * Admin Action: Deactivate or reactivate an account.
 * Accessible ONLY from the protected Admin Panel with valid ADMIN_SECRET and authorized ADMIN_EMAIL.
 */
export async function toggleUserDeactivationAction({
  adminSecret,
  adminEmail,
  userId,
  deactivate,
}: {
  adminSecret: string;
  adminEmail?: string;
  userId: string;
  deactivate: boolean;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error || "Unauthorized. Invalid Admin Credentials." };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const userRows = await sql`
      SELECT id, email, organization_id, is_deactivated FROM public.users WHERE id::text = ${userId} LIMIT 1;
    `;
    if (userRows.length === 0) {
      return { success: false, error: "User not found." };
    }

    const targetUser = userRows[0];

    if (deactivate) {
      await sql`
        UPDATE public.users
        SET is_deactivated = true,
            deactivated_at = now(),
            updated_at = now()
        WHERE id::text = ${userId};
      `;
      if (targetUser.organization_id) {
        await sql`
          UPDATE public.subscriptions
          SET status = 'cancelled', updated_at = now()
          WHERE organization_id = ${targetUser.organization_id};
        `;
        invalidateDashboardCache(targetUser.organization_id);
      }
    } else {
      await sql`
        UPDATE public.users
        SET is_deactivated = false,
            deactivated_at = NULL,
            updated_at = now()
        WHERE id::text = ${userId};
      `;
      if (targetUser.organization_id) {
        await sql`
          UPDATE public.subscriptions
          SET status = 'active', updated_at = now()
          WHERE organization_id = ${targetUser.organization_id};
        `;
        invalidateDashboardCache(targetUser.organization_id);
      }
    }

    return {
      success: true,
      message: deactivate
        ? `Account for ${targetUser.email} has been deactivated.`
        : `Account for ${targetUser.email} has been reactivated.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update account status." };
  }
}

/**
 * Delete a case (Advisor-side with org ownership check)
 * Cascades removal of all S3 files, document rows, requirements, links, activity logs, and the case.
 */
export async function deleteCaseAction(caseId: string) {
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const orgId = await getAuthenticatedOrgId();

    const cases = await sql`
      SELECT id, title FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId} LIMIT 1;
    `;
    if (cases.length === 0) {
      return { success: false, error: "Case not found or unauthorized access." };
    }

    // 1. Fetch all documents for this case and delete physical files from S3
    const docs = await sql`
      SELECT id, storage_path FROM public.documents WHERE case_id = ${caseId};
    `;
    for (const doc of docs) {
      if (doc.storage_path) {
        try {
          await deleteFileFromStorage(doc.storage_path);
        } catch (e) {
          console.warn("Storage deletion warning for doc:", doc.id, e);
        }
      }
    }

    // 2. Cascade delete database records
    await sql`DELETE FROM public.documents WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.document_requirements WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.upload_links WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.activity_logs WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.cases WHERE id = ${caseId} AND organization_id = ${orgId};`;

    invalidateDashboardCache(orgId);
    invalidateCaseCache(caseId);
    invalidatePortalCache(caseId);

    revalidatePath("/dashboard/cases");
    revalidatePath("/dashboard");

    return { success: true, message: `Case "${cases[0].title}" was deleted successfully.` };
  } catch (err: any) {
    console.error("Delete case error:", err);
    return { success: false, error: err.message || "Failed to delete case." };
  }
}

/**
 * Permanently delete a user account and all associated data (Admin only)
 */
export async function adminDeleteUserAction({
  adminSecret,
  adminEmail,
  userId,
}: {
  adminSecret: string;
  adminEmail?: string;
  userId: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error || "Unauthorized. Invalid Admin Credentials." };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const userRows = await sql`
      SELECT id, email, organization_id FROM public.users WHERE id::text = ${userId} LIMIT 1;
    `;
    if (userRows.length === 0) {
      return { success: false, error: "User not found." };
    }
    const targetUser = userRows[0];
    const orgId = targetUser.organization_id;

    if (orgId) {
      // Find all documents for org's cases to delete physical files from S3
      const docs = await sql`
        SELECT d.id, d.storage_path
        FROM public.documents d
        JOIN public.cases c ON d.case_id = c.id
        WHERE c.organization_id = ${orgId};
      `;
      for (const d of docs) {
        if (d.storage_path) {
          try {
            await deleteFileFromStorage(d.storage_path);
          } catch (e) {
            console.warn("Storage deletion warning for doc:", d.id, e);
          }
        }
      }

      // Cascade delete child records
      await sql`DELETE FROM public.documents WHERE case_id IN (SELECT id FROM public.cases WHERE organization_id = ${orgId});`;
      await sql`DELETE FROM public.document_requirements WHERE case_id IN (SELECT id FROM public.cases WHERE organization_id = ${orgId});`;
      await sql`DELETE FROM public.upload_links WHERE case_id IN (SELECT id FROM public.cases WHERE organization_id = ${orgId});`;
      await sql`DELETE FROM public.activity_logs WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.cases WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.clients WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.checklist_templates WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.subscriptions WHERE organization_id = ${orgId};`;
      await sql`DELETE FROM public.organizations WHERE id = ${orgId};`;

      invalidateDashboardCache(orgId);
    }

    await sql`DELETE FROM public.users WHERE id::text = ${userId};`;

    return {
      success: true,
      message: `User ${targetUser.email} and all associated data have been permanently deleted.`,
    };
  } catch (err: any) {
    console.error("adminDeleteUserAction error:", err);
    return { success: false, error: err.message || "Failed to delete user." };
  }
}

/**
 * Fetch all cases across all organizations for admin inspection
 */
export async function adminGetAllCasesAction({
  adminSecret,
  adminEmail,
}: {
  adminSecret: string;
  adminEmail?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const cases = await sql`
      SELECT 
        c.id, c.title, c.reference_number, c.status, c.service_type, c.created_at,
        cl.name as client_name, cl.email as client_email,
        o.name as org_name,
        (SELECT COUNT(*)::int FROM public.documents d WHERE d.case_id = c.id) as doc_count,
        (SELECT COUNT(*)::int FROM public.document_requirements r WHERE r.case_id = c.id) as req_count
      FROM public.cases c
      LEFT JOIN public.clients cl ON c.client_id = cl.id
      LEFT JOIN public.organizations o ON c.organization_id = o.id
      ORDER BY c.created_at DESC
      LIMIT 100;
    `;
    return { success: true, cases };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete any case by ID (Admin only)
 */
export async function adminDeleteCaseAction({
  adminSecret,
  adminEmail,
  caseId,
}: {
  adminSecret: string;
  adminEmail?: string;
  caseId: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const docs = await sql`SELECT id, storage_path FROM public.documents WHERE case_id = ${caseId};`;
    for (const d of docs) {
      if (d.storage_path) {
        try {
          await deleteFileFromStorage(d.storage_path);
        } catch (e) {}
      }
    }
    await sql`DELETE FROM public.documents WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.document_requirements WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.upload_links WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.activity_logs WHERE case_id = ${caseId};`;
    await sql`DELETE FROM public.cases WHERE id = ${caseId};`;

    return { success: true, message: "Case deleted successfully by admin." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all checklist templates (system and custom) for admin
 */
export async function adminGetAllTemplatesAction({
  adminSecret,
  adminEmail,
}: {
  adminSecret: string;
  adminEmail?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) return { success: false, error: auth.error };
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const templates = await sql`
      SELECT t.*, o.name as org_name
      FROM public.checklist_templates t
      LEFT JOIN public.organizations o ON t.organization_id = o.id
      ORDER BY t.is_system DESC, t.name ASC;
    `;
    return { success: true, templates };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create or update a template (system or custom) by Admin
 */
export async function adminSaveTemplateAction({
  adminSecret,
  adminEmail,
  template,
}: {
  adminSecret: string;
  adminEmail?: string;
  template: {
    id?: string;
    name: string;
    service_type: string;
    description?: string;
    requirements: any[];
    is_system: boolean;
  };
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) return { success: false, error: auth.error };
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    if (template.id) {
      await sql`
        UPDATE public.checklist_templates
        SET name = ${template.name.trim()},
            service_type = ${template.service_type?.trim() || "General"},
            description = ${template.description?.trim() || null},
            requirements = ${JSON.stringify(template.requirements)}::jsonb,
            is_system = ${Boolean(template.is_system)},
            updated_at = now()
        WHERE id = ${template.id};
      `;
    } else {
      await sql`
        INSERT INTO public.checklist_templates (
          name, service_type, description, requirements, is_system
        ) VALUES (
          ${template.name.trim()},
          ${template.service_type?.trim() || "General"},
          ${template.description?.trim() || null},
          ${JSON.stringify(template.requirements)}::jsonb,
          ${Boolean(template.is_system)}
        );
      `;
    }
    return { success: true, message: "Template saved successfully." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete any template by Admin (including system templates)
 */
export async function adminDeleteTemplateAction({
  adminSecret,
  adminEmail,
  templateId,
}: {
  adminSecret: string;
  adminEmail?: string;
  templateId: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) return { success: false, error: auth.error };
  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    await sql`DELETE FROM public.checklist_templates WHERE id = ${templateId};`;
    return { success: true, message: "Template deleted successfully." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send email (with optional attached file link) to user(s) from Admin Panel
 */
export async function adminSendEmailWithFileAction({
  adminSecret,
  adminEmail,
  to,
  subject,
  message,
  fileUrl,
  fileName,
}: {
  adminSecret: string;
  adminEmail?: string;
  to: string;
  subject: string;
  message: string;
  fileUrl?: string;
  fileName?: string;
}) {
  const auth = await verifyAdminAuthorization(adminSecret, adminEmail);
  if (!auth.authorized) return { success: false, error: auth.error };

  const recipients = to
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { success: false, error: "Please provide at least one recipient email." };
  }

  const results = [];
  for (const recipient of recipients) {
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 560px; border: 1px solid #e5e5e5; border-radius: 12px; background: #ffffff;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: #111; margin: 0 0 8px; font-size: 20px;">${subject}</h2>
          <p style="color: #666; font-size: 12px; margin: 0;">Message from DocuCollect Administration</p>
        </div>
        <div style="color: #333; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin-bottom: 24px;">
          ${message}
        </div>
        ${fileUrl ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1e293b;">Attached File: ${fileName || "Document"}</p>
            <a href="${fileUrl}" style="display: inline-block; padding: 8px 16px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">
              Download Attached File →
            </a>
          </div>
        ` : ""}
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8;">
          DocuCollect Secure Cloud • Need support? Email support@docucollect.in or contact on WhatsApp.
        </div>
      </div>
    `;

    try {
      const res = await sendNotificationEmail({
        to: recipient,
        subject,
        html: htmlBody,
        eventType: "welcome",
        plan: "pro",
      });
      results.push({ email: recipient, success: res.success });
    } catch (e: any) {
      results.push({ email: recipient, success: false, error: e.message });
    }
  }

  return { success: true, sentCount: results.filter((r) => r.success).length, results };
}




