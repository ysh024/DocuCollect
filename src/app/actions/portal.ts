"use server";

import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateUploadToken, hashToken } from "@/lib/tokens";
import { generateStoragePath, uploadFileToStorage } from "@/lib/storage";
import { CaseWithDetails, Client, ClientPortalData, DocumentRequirement, Document } from "@/types";
import crypto from "crypto";

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
const DASHBOARD_CACHE_TTL = 15000; // 15 seconds fast in-memory cache

function invalidateDashboardCache(orgId?: string) {
  if (orgId) {
    dashboardMemoryCache.delete(orgId);
  } else {
    dashboardMemoryCache.clear();
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

  // Parallel fetch: run all independent queries concurrently using Promise.all
  // Crucially excludes file_data (base64 string) so network payloads remain tiny (<5KB instead of multi-megabytes)
  const [clientsRows, casesRows, reqsRows, docsRows, linksRows, subRows] = await Promise.all([
    sql`
      SELECT id, organization_id, name, email, phone, alternate_phone, company, client_ref_id, address, notes, created_at, updated_at
      FROM public.clients
      WHERE organization_id = ${orgId}
      ORDER BY created_at DESC;
    `,
    sql`
      SELECT * FROM public.cases
      WHERE organization_id = ${orgId}
      ORDER BY created_at DESC;
    `,
    sql`
      SELECT r.*, c.organization_id
      FROM public.document_requirements r
      JOIN public.cases c ON r.case_id = c.id
      WHERE c.organization_id = ${orgId}
      ORDER BY r.sort_order ASC;
    `,
    sql`
      SELECT d.id, d.requirement_id, d.case_id, d.client_id, d.version, d.file_name,
             d.storage_path, d.file_size, d.mime_type, d.status, d.rejection_reason,
             d.uploaded_by_type, d.uploaded_at, d.reviewed_at, d.reviewed_by, d.auto_delete_at
      FROM public.documents d
      JOIN public.cases c ON d.case_id = c.id
      WHERE c.organization_id = ${orgId}
      ORDER BY d.version ASC;
    `,
    sql`
      SELECT l.*
      FROM public.upload_links l
      JOIN public.cases c ON l.case_id = c.id
      WHERE c.organization_id = ${orgId};
    `,
    sql`
      SELECT s.status, s.trial_ends_at, s.current_period_end,
             p.display_name as plan_display_name, p.name as plan_name,
             p.max_clients, p.max_cases_per_client
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${orgId}
      LIMIT 1;
    `
  ]);

  const clients = clientsRows as unknown as Client[];
  const cases: CaseWithDetails[] = (casesRows as any[]).map((c) => {
    const client = clients.find((cli) => cli.id === c.client_id) || {
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

    const caseReqs = (reqsRows as any[])
      .filter((r) => r.case_id === c.id)
      .map((r) => ({
        ...r,
        documents: (docsRows as any[]).filter((d) => d.requirement_id === r.id),
      }));

    const link = (linksRows as any[]).find((l) => l.case_id === c.id) || null;

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

    // Keep DB in sync asynchronously if status changed
    if (currentStatus !== c.status && c.id) {
      sql`UPDATE public.cases SET status = ${currentStatus}, updated_at = now() WHERE id = ${c.id};`.catch(() => {});
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

export async function getCaseDetails(caseId: string): Promise<CaseWithDetails | null> {
  const sql = getDb();
  if (!sql) throw new Error("Neon Database is not connected.");

  await getAuthenticatedOrgId(); // Ensure authenticated

  const cases = await sql`SELECT * FROM public.cases WHERE id::text = ${caseId} LIMIT 1;`;
  if (cases.length === 0) return null;
  const c = cases[0] as any;

  // Run remaining lookups concurrently in parallel without heavy file_data
  const [clients, orgs, reqsRows, docsRows, existingLinks] = await Promise.all([
    sql`SELECT * FROM public.clients WHERE id::text = ${c.client_id} LIMIT 1;`,
    sql`SELECT * FROM public.organizations WHERE id::text = ${c.organization_id} LIMIT 1;`,
    sql`
      SELECT * FROM public.document_requirements
      WHERE case_id::text = ${caseId}
      ORDER BY sort_order ASC;
    `,
    sql`
      SELECT id, requirement_id, case_id, client_id, version, file_name, storage_path,
             file_size, mime_type, status, rejection_reason, uploaded_by_type,
             uploaded_at, reviewed_at, reviewed_by, auto_delete_at
      FROM public.documents
      WHERE case_id::text = ${caseId}
      ORDER BY version ASC;
    `,
    sql`
      SELECT * FROM public.upload_links
      WHERE case_id::text = ${caseId}
      ORDER BY created_at DESC
      LIMIT 1;
    `
  ]);

  const client = (clients[0] || null) as unknown as Client;
  const org = orgs[0] as any;
  let link = existingLinks[0] || null;

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

  const requirements = (reqsRows as any[]).map((r) => ({
    ...r,
    documents: (docsRows as any[]).filter((d) => d.requirement_id === r.id),
  }));

  let currentStatus = c.status;
  if (c.status !== "archived") {
    const requiredReqs = requirements.filter((r) => r.is_required);
    if (requiredReqs.length > 0 && requiredReqs.every((r) => r.status === "approved")) {
      currentStatus = "completed";
    } else if (requirements.some((r) => r.status === "under_review" || r.status === "uploaded")) {
      currentStatus = "under_review";
    } else {
      currentStatus = "waiting_for_client";
    }
  }

  return {
    ...c,
    status: currentStatus,
    organization_name: org?.name || "Advisory Services",
    client,
    requirements,
    upload_link: link,
  };
}

export async function getPortalData(token: string): Promise<ClientPortalData | null> {
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

    // Concurrently fetch client, organization, requirements, and document metadata without heavy file_data
    const [clients, orgs, reqsRows, docsRows] = await Promise.all([
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
      `
    ]);

    const client = clients[0] as any;
    const org = orgs[0] as any;

    const reqs = (reqsRows as any[]).map((req) => {
      const docs = (docsRows as any[]).filter((d) => d.requirement_id === req.id);
      const latest = docs.length > 0 ? docs[docs.length - 1] : null;
      return { ...req, latest_document: latest, history: docs };
    });

    const total = reqs.length;
    const required = reqs.filter((r: any) => r.is_required).length;
    const approved = reqs.filter((r: any) => r.status === "approved").length;
    const under_review = reqs.filter((r: any) => r.status === "under_review" || r.status === "uploaded").length;
    const rejected = reqs.filter((r: any) => r.status === "rejected").length;
    const pending = reqs.filter((r: any) => r.status === "not_uploaded").length;
    const percentage = required > 0 ? Math.round((approved / required) * 100) : 0;

    return {
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
      },
      requirements: reqs,
      progress: { total, required, approved, under_review, rejected, pending, percentage },
    };
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

  // Insert all rows
  const inserted: any[] = [];
  for (const client of validatedClients) {
    const res = await sql`
      INSERT INTO public.clients (
        organization_id, name, email, phone, alternate_phone, company, client_ref_id, address, notes
      ) VALUES (
        ${orgId}, ${client.name}, ${client.email}, ${client.phone},
        ${client.alternate_phone}, ${client.company}, ${client.client_ref_id},
        ${client.address}, ${client.notes}
      )
      RETURNING *;
    `;
    if (res && res[0]) {
      inserted.push(res[0]);
    }
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

  for (let i = 0; i < payload.requirements.length; i++) {
    const req = payload.requirements[i];
    await sql`
      INSERT INTO public.document_requirements (
        case_id, name, description, is_required, status, sort_order
      ) VALUES (
        ${newCase.id}, ${req.name}, ${req.description || null}, ${req.is_required}, 'not_uploaded', ${i + 1}
      );
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

  await sql`
    UPDATE public.documents
    SET status = ${newStatus}, rejection_reason = ${reason}, reviewed_at = now()
    WHERE id = ${documentId};
  `;

  await sql`
    UPDATE public.document_requirements
    SET status = ${newStatus}, updated_at = now()
    WHERE id = ${requirementId};
  `;

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
  let links = await sql`SELECT * FROM public.upload_links WHERE token_hash = ${tokenHash} LIMIT 1;`;
  if (links.length === 0) links = await sql`SELECT * FROM public.upload_links WHERE token_hash = ${token} LIMIT 1;`;
  if (links.length === 0) links = await sql`SELECT * FROM public.upload_links WHERE token_prefix = ${token.slice(0, 8)} LIMIT 1;`;

  let caseId = links[0]?.case_id;
  if (!caseId) {
    const cases = await sql`SELECT id FROM public.cases WHERE id::text = ${token} LIMIT 1;`;
    caseId = cases[0]?.id;
  }

  if (!caseId) return { success: false, error: "Upload session not found or link expired" };

  const cases = await sql`SELECT * FROM public.cases WHERE id = ${caseId} LIMIT 1;`;
  if (cases.length === 0) return { success: false, error: "Case not found" };
  const c = cases[0] as any;

  // Get subscription file retention period
  const subRows = await sql`
    SELECT p.file_retention_days FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.organization_id = ${c.organization_id} LIMIT 1;
  `;
  const retentionDays = (subRows[0] as any)?.file_retention_days || 7;

  const existingDocs = await sql`SELECT count(*) as count FROM public.documents WHERE requirement_id = ${requirementId};`;
  const version = parseInt(existingDocs[0]?.count || "0") + 1;

  // 1. Generate clean storage key for Neon Object Storage
  const storagePath = generateStoragePath({
    organizationId: c.organization_id,
    clientId: c.client_id,
    caseId: c.id,
    requirementId,
    version,
    fileName: fileInfo.name,
    mimeType: fileInfo.type,
  });

  // 2. Upload file binary directly to Neon Object Storage
  let s3Uploaded = false;
  if (fileInfo.data) {
    try {
      let fileBuffer: Buffer;
      if (fileInfo.data.startsWith("data:")) {
        const matches = fileInfo.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        fileBuffer = Buffer.from(matches ? matches[2] : fileInfo.data, "base64");
      } else {
        fileBuffer = Buffer.from(fileInfo.data, "base64");
      }

      const uploadRes = await uploadFileToStorage({
        storagePath,
        fileBuffer,
        mimeType: fileInfo.type,
      });

      if (uploadRes.success) {
        s3Uploaded = true;
      }
    } catch (uploadErr) {
      console.warn("Storage upload exception, fallback to DB:", uploadErr);
    }
  }

  // 3. Insert record: file_data is NULL when stored on S3, protecting DB performance & quotas
  const newDocs = await sql`
    INSERT INTO public.documents (
      requirement_id, case_id, client_id, version, file_name, storage_path, file_size, mime_type, status, uploaded_by_type, file_data, auto_delete_at
    ) VALUES (
      ${requirementId}, ${c.id}, ${c.client_id}, ${version}, ${fileInfo.name},
      ${storagePath},
      ${fileInfo.size}, ${fileInfo.type}, 'under_review', 'client',
      ${s3Uploaded ? null : fileInfo.data || null},
      (now() + (${Number(retentionDays) || 7} * interval '1 day'))
    )
    RETURNING *;
  `;

  await sql`
    UPDATE public.document_requirements
    SET status = 'under_review', updated_at = now()
    WHERE id = ${requirementId};
  `;

  await sql`
    UPDATE public.cases
    SET status = 'under_review', updated_at = now()
    WHERE id = ${c.id} AND status != 'completed';
  `;

  try {
    await sql`
      INSERT INTO public.activity_logs (organization_id, case_id, action, actor_type, metadata)
      VALUES (
        ${c.organization_id}, ${c.id}, 'document_uploaded', 'client',
        ${JSON.stringify({
          document_name: fileInfo.name,
          retention_days: retentionDays,
          auto_delete_at: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString(),
        })}
      );
    `;
  } catch (logErr) {
    console.warn("Activity log error:", logErr);
  }

  if (c.organization_id) invalidateDashboardCache(c.organization_id);
  revalidatePath(`/upload/${token}`);
  revalidatePath(`/dashboard/cases/${c.id}`);
  revalidatePath("/dashboard");
  return { success: true, document: newDocs[0] };
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
  return { success: true, message: "Your query has been sent to your consultant." };
}

export async function getAdvisorNotificationsAction() {
  const sql = getDb();
  if (!sql) return [];

  const session = await getSession();
  if (!session?.organizationId) return [];

  try {
    const logs = await sql`
      SELECT l.*, c.title as case_title, c.reference_number
      FROM public.activity_logs l
      JOIN public.cases c ON l.case_id = c.id
      WHERE c.organization_id = ${session.organizationId}
      ORDER BY l.created_at DESC
      LIMIT 10;
    `;

    return (logs as any[]).map((log) => {
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
  } catch (err) {
    console.warn("Error fetching notifications:", err);
    return [];
  }
}

/**
 * Fetch full audit trail for the organization
 */
export async function getFullAuditLogsAction() {
  const sql = getDb();
  if (!sql) return [];

  const session = await getSession();
  if (!session?.organizationId) return [];

  try {
    const logs = await sql`
      SELECT l.*, c.title as case_title, c.reference_number, cl.name as client_name
      FROM public.activity_logs l
      LEFT JOIN public.cases c ON l.case_id = c.id
      LEFT JOIN public.clients cl ON c.client_id = cl.id
      WHERE l.organization_id = ${session.organizationId}
      ORDER BY l.created_at DESC
      LIMIT 100;
    `;
    return logs as any[];
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    return [];
  }
}

export async function deleteClientAction(clientId: string) {
  const sql = getDb();
  if (!sql) throw new Error("Database not connected");

  const orgId = await getAuthenticatedOrgId();

  try {
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
             (SELECT COUNT(*) FROM public.clients WHERE organization_id = ${session.organizationId}) as current_clients_count
      FROM public.subscriptions s
      JOIN public.plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${session.organizationId}
      LIMIT 1;
    `;
    return rows[0] as any || null;
  } catch {
    return null;
  }
}

export async function getAllPlansAction() {
  const sql = getDb();
  if (!sql) return [];

  try {
    const plans = await sql`SELECT * FROM public.plans WHERE is_active = true ORDER BY sort_order ASC;`;
    return plans as any[];
  } catch {
    return [];
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
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to redeem license key." };
  }
}

/**
 * Generate a new single-use license key (Admin only)
 * The admin generates this key after receiving customer payment and gives it to the customer.
 */
export async function generateLicenseKeyAction({
  adminSecret,
  planName,
  period = "monthly",
  notes = "",
}: {
  adminSecret: string;
  planName: "starter" | "pro";
  period: "monthly" | "yearly";
  notes?: string;
}) {
  const EXPECTED_SECRET = process.env.ADMIN_SECRET || "admin123";
  if (adminSecret.trim() !== EXPECTED_SECRET.trim()) {
    return { success: false, error: "Invalid Admin Secret Key." };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const planTag = planName.toUpperCase() === "PRO" ? "PRO" : "START";
    const periodTag = period === "yearly" ? "YR" : "MO";
    const part1 = crypto.randomBytes(3).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(3).toString("hex").toUpperCase();
    const code = `DOCU-${planTag}-${periodTag}-${part1}-${part2}`;

    const inserted = await sql`
      INSERT INTO public.license_keys (
        code, plan_name, period, notes, status, created_by
      ) VALUES (
        ${code}, ${planName}, ${period}, ${notes || "Generated via Admin Billing Tool"}, 'active', 'admin'
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
export async function getLicenseKeysAction({ adminSecret }: { adminSecret: string }) {
  const EXPECTED_SECRET = process.env.ADMIN_SECRET || "admin123";
  if (adminSecret.trim() !== EXPECTED_SECRET.trim()) {
    return { success: false, error: "Invalid Admin Secret Key." };
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
  keyId,
}: {
  adminSecret: string;
  keyId: string;
}) {
  const EXPECTED_SECRET = process.env.ADMIN_SECRET || "admin123";
  if (adminSecret.trim() !== EXPECTED_SECRET.trim()) {
    return { success: false, error: "Invalid Admin Secret Key." };
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
 * Validates against ADMIN_SECRET (defaulting to a secure fallback)
 */
export async function activateSubscriptionAction({
  userEmail,
  organizationId,
  planName,
  period = "monthly",
  adminSecret,
  paymentMethod = "upi",
  paymentNotes = "",
}: {
  userEmail?: string;
  organizationId?: string;
  planName: string;
  period?: "monthly" | "yearly";
  adminSecret: string;
  paymentMethod?: string;
  paymentNotes?: string;
}) {
  const EXPECTED_SECRET = process.env.ADMIN_SECRET || "admin123";
  if (adminSecret.trim() !== EXPECTED_SECRET.trim()) {
    return { success: false, error: "Invalid admin activation code. Please check your secret key." };
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
            payment_notes = ${paymentNotes || `Manual admin activation (${period})`},
            activated_by = 'admin',
            updated_at = now()
        WHERE id = ${existing[0].id};
      `;
    } else {
      await sql`
        INSERT INTO public.subscriptions (
          organization_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, payment_method, payment_notes, activated_by
        ) VALUES (
          ${targetOrgId}, ${plan.id}, 'active', NULL, now(), ${currentPeriodEnd}, ${paymentMethod}, ${paymentNotes || `Manual admin activation (${period})`}, 'admin'
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
export async function getAdminOverviewAction({ adminSecret }: { adminSecret: string }) {
  const EXPECTED_SECRET = process.env.ADMIN_SECRET || "admin123";
  if (adminSecret.trim() !== EXPECTED_SECRET.trim()) {
    return { success: false, error: "Invalid Admin Secret Key." };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected" };

  try {
    const [usersCount, orgsCount, keys, users, plans] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM public.users;`,
      sql`SELECT COUNT(*) as count FROM public.organizations;`,
      sql`SELECT * FROM public.license_keys ORDER BY created_at DESC LIMIT 50;`,
      sql`
        SELECT u.id, u.email, u.full_name, u.role, u.created_at, o.name as org_name,
               s.status as sub_status, p.display_name as plan_name, s.current_period_end
        FROM public.users u
        LEFT JOIN public.organizations o ON u.organization_id = o.id
        LEFT JOIN public.subscriptions s ON o.id = s.organization_id
        LEFT JOIN public.plans p ON s.plan_id = p.id
        ORDER BY u.created_at DESC
        LIMIT 20;
      `,
      sql`SELECT * FROM public.plans WHERE is_active = true ORDER BY sort_order ASC;`,
    ]);

    const activeKeysCount = keys.filter((k: any) => k.status === "active").length;
    const redeemedKeysCount = keys.filter((k: any) => k.status === "redeemed").length;

    return {
      success: true,
      stats: {
        totalUsers: Number(usersCount[0]?.count || 0),
        totalOrgs: Number(orgsCount[0]?.count || 0),
        activeKeys: activeKeysCount,
        redeemedKeys: redeemedKeysCount,
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
  adminSecret: string,
  settings: Partial<PublicPaymentSettings>
): Promise<{ success: boolean; error?: string; settings?: PublicPaymentSettings }> {
  const EXPECTED_SECRET = process.env.ADMIN_SECRET || "admin123";
  if (!adminSecret || adminSecret.trim() !== EXPECTED_SECRET.trim()) {
    return { success: false, error: "Invalid Admin Secret Key." };
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


