# DOCUCOLLECT — TENANT ISOLATION ROOT CAUSE ANALYSIS

## Executive Summary

An investigation was conducted into the report that **Firm A can see Firm B's case links after logging in**.
Using an adversarial reproduction lab with synthetic test organizations (`Alpha Firm / FIRM_A_PRIVATE_MARKER` and `Beta Firm / FIRM_B_PRIVATE_MARKER`), we successfully reproduced the vulnerability, traced its execution across the browser and backend, and isolated three primary contributing root causes.

---

## 1. Vulnerability Classification & Findings Matrix

| Finding | Classification | Severity | Impact |
| :--- | :--- | :--- | :--- |
| **Finding 1: Client-Side Session Storage & Global Memory Cache Bleed** | CWE-488: Exposure of Data Between Different Contexts | **CRITICAL** | Firm A immediately viewed Firm B's client names, cases, and upload links upon login if Firm B logged out on the same browser/device without closing the tab. |
| **Finding 2: Upload Link Token Hash Exposure & Portal Access** | CWE-327: Use of Broken Cryptographic Hash / CWE-284: Improper Access Control | **HIGH** | Exposing `upload_links.token_hash` in the UI case links allowed any party holding the link to open `/upload/[token]` and access Firm B's client upload portal because `getPortalData` accepted raw hashes. |
| **Finding 3: Missing RLS Policies on Tenant-Owned Tables** | CWE-732: Incorrect Permission Assignment for Critical Resource | **HIGH** | `upload_links`, `document_requirements`, and `organizations` had RLS enabled, but lacked explicit tenant-filtering policies in PostgreSQL. |

---

## 2. Root Cause 1: Client-Side Session Storage & Module Memory Bleed

### Location
- [`src/contexts/DashboardDataContext.tsx`](file:///d:/code/File%20Organizor/src/contexts/DashboardDataContext.tsx) (lines 100–123, 169–185, 230–246)
- [`src/app/dashboard/cases/[id]/page.tsx`](file:///d:/code/File%20Organizor/src/app/dashboard/cases/[id]/page.tsx) (lines 45–65)

### Mechanism
1. **Unpartitioned Static SessionStorage Key:**
   The dashboard context stored all fetched dashboard data (clients, cases, requirements, upload links) into browser `sessionStorage` under the static string key:
   ```ts
   const SESSION_CACHE_KEY = "docucollect_dashboard_cache_v2";
   ```
   This key was completely agnostic to `organizationId` or `userId`.
2. **Persistent Module-Level JavaScript Memory:**
   In `DashboardDataContext.tsx`, in-memory variables existed in the module closure:
   ```ts
   let globalDashboardCache: DashboardData | null = null;
   let globalUserCache: any | null = null;
   let globalNotificationsCache: any[] = [];
   let lastFetchTimestamp = 0;
   const CACHE_FRESHNESS_MS = 45000;
   ```
   Similarly, in `src/app/dashboard/cases/[id]/page.tsx`:
   ```ts
   const caseDetailsClientCache = new Map<string, { data: CaseWithDetails; timestamp: number }>();
   ```
3. **Session Termination Omission:**
   When User B logged out (`handleLogoutAction` in `src/app/actions/auth.ts` / `ProfileMenu.tsx`), the backend deleted the session row and expired cookies, then redirected with `window.location.href = "/login"`.
   However, `sessionStorage` in the browser tab is retained across redirects within the same origin, and in Single Page Application transitions, JavaScript module memory is retained.
4. **Immediate Cross-Tenant State Hydration:**
   When User A subsequently signed in:
   - `DashboardDataProvider` mounted.
   - `useState` initialized `data` from `globalDashboardCache || getStoredCache()`.
   - `getStoredCache()` read `sessionStorage.getItem("docucollect_dashboard_cache_v2")`, which still contained Firm B's cases, client names, and upload links.
   - Because `hasCache` evaluated to `true`, and if `Date.now() - lastFetchTimestamp < 45000`, the application didn't even trigger a network refresh, or rendered Firm B's entire case list and links on frame 1 before network synchronization completed.

---

## 3. Root Cause 2: Upload Link Token Hash Exposure & Client Portal Access

### Location
- [`src/app/dashboard/cases/page.tsx`](file:///d:/code/File%20Organizor/src/app/dashboard/cases/page.tsx) (line 62)
- [`src/app/dashboard/page.tsx`](file:///d:/code/File%20Organizor/src/app/dashboard/page.tsx) (line 137)
- [`src/app/dashboard/clients/page.tsx`](file:///d:/code/File%20Organizor/src/app/dashboard/clients/page.tsx) (line 499)
- [`src/app/dashboard/cases/[id]/page.tsx`](file:///d:/code/File%20Organizor/src/app/dashboard/cases/[id]/page.tsx) (line 270)
- [`src/components/dashboard/WhatsAppShareModal.tsx`](file:///d:/code/File%20Organizor/src/components/dashboard/WhatsAppShareModal.tsx) (line 60)
- [`src/app/actions/portal.ts`](file:///d:/code/File%20Organizor/src/app/actions/portal.ts) (line 439)

### Mechanism
1. **Hash as Token Fallback in UI:**
   When rendering case links or copying links for clients, all dashboard UI pages executed:
   ```ts
   const token = c.upload_link?.token_hash || `token-${c.id.slice(0, 8)}`;
   const url = `${window.location.origin}/upload/${token}`;
   ```
2. **Server-Side Permissive Hash Match in `getPortalData`:**
   In `src/app/actions/portal.ts`:
   ```ts
   const tokenHash = hashToken(cleanToken);
   const links = await sql`
     SELECT case_id FROM public.upload_links 
     WHERE (token_hash = ${tokenHash} OR token_hash = ${cleanToken})
       AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1;
   `;
   ```
   Because `token_hash = ${cleanToken}` was included, anyone who obtained the 64-character SHA-256 hash was able to pass it directly as `/upload/${token_hash}`. The database matched `token_hash = ${cleanToken}` and opened the client upload portal for that case.
3. **Combination with Cache Bleed:**
   When Firm A observed Firm B's case link due to Root Cause 1, that link contained Firm B's `upload_link.token_hash`. Clicking or pasting that link into a browser granted access to Firm B's client portal, exposing Firm B's case title, client name, advisor contact info, and required document checklists.

---

## 4. Root Cause 3: Missing RLS Policies on Tenant Tables

### Location
- [`neon/schema.sql`](file:///d:/code/File%20Organizor/neon/schema.sql) (lines 392–452)

### Mechanism
While `ALTER TABLE public.upload_links ENABLE ROW LEVEL SECURITY;` and `ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;` were enabled:
- No `CREATE POLICY` statements existed in `neon/schema.sql` for `upload_links`, `document_requirements`, or `organizations`.
- Furthermore, `upload_links` lacked an `organization_id` column, forcing any tenant-isolation logic to perform dynamic joins to `cases`.
- While backend SQL queries in `portal.ts` manually filtered by `c.organization_id = ${authOrgId}`, any query relying on defense-in-depth PostgreSQL RLS without explicit policies left runtime enforcement dependent entirely on application-level filtering.

---

## 5. Scope of Impact: Did Links Only Leak Identifiers or Private Data?

| Resource / Vector | Exposure Level | Details |
| :--- | :--- | :--- |
| **Case Link Visibility** | **EXPOSED (Pre-remediation)** | Firm A was able to see Firm B's case titles, client names, and link URLs in the dashboard if logged in on the same browser session. |
| **Client Portal Details via Link** | **EXPOSED (Pre-remediation)** | Because links contained `token_hash` and `getPortalData` accepted `token_hash`, opening the link displayed Firm B's client portal (case metadata, checklist requirements). |
| **Direct Backend REST Case Details (`/api/cases/[id]`)** | **BLOCKED** | When Firm A called `/api/cases/[id]` with Firm B's case ID, the server query `WHERE id = ${caseId} AND organization_id = ${authOrgId}` returned `null` (HTTP 404). However, the client-side `caseDetailsClientCache` had previously cached Case B in memory if Firm B viewed it. |
| **Direct Document File Download (`/api/download`)** | **BLOCKED** | `/api/download` strictly checks `session.organizationId !== docRecord.organization_id` and rejects cross-tenant requests with `HTTP 403 Forbidden`. |
| **Cross-Tenant Document Mutation (Review / Delete)** | **BLOCKED** | `reviewDocumentAction`, `deleteCaseAction`, and `advisorDeleteDocumentAction` verify that the target resource belongs to `session.organizationId` and rejected all cross-tenant modification attempts. |
