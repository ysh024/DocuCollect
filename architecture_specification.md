# DocuCollect — Complete Application Architecture Specification

> **System Version:** 3.0 (Production Architecture)  
> **Framework:** Next.js 15 (App Router, React 19, Server Actions)  
> **Database:** Neon Serverless PostgreSQL with Connection Pooling  
> **Storage:** Neon S3 Object Storage (`@aws-sdk/client-s3`)  
> **Auth Engines:** Neon Managed Better Auth (Google OAuth) + Salted Bcrypt & Email OTP + Stateless JWT  
> **Primary Audience:** Chartered Accountants (CAs), Tax Consultants, Advocates, Legal Advisors, Corporate Agencies  

---

## 1. Executive Summary & Problem Space

Professional service firms—particularly Chartered Accountants, tax practitioners, and law firms in India—frequently struggle with unstructured client document collection. Critical KYC, financial filings, and audit records arrive piecemeal across unorganized WhatsApp chats, disparate email chains, and photo dumps.

### Problems Solved by DocuCollect:
1. **WhatsApp & Email Chaos:** Scattered documents lead to missed deadlines, lost attachments, and unverified files.
2. **Client Login Friction:** Requiring clients to create an account, remember passwords, or download an app leads to massive friction and abandoned requests.
3. **Storage & Security Liabilities:** Storing multi-gigabyte client tax files permanently creates legal liabilities and database bloat.
4. **Lack of Structured Review:** Advisors lack clear visibility into which specific documents are missing, approved, or pending revisions.

### DocuCollect Solution:
DocuCollect provides an enterprise-grade, link-based document collection portal:
- **Zero-Friction Client Portal:** Clients click an encrypted WhatsApp link and upload directly from their phone camera or computer with **no account creation, no password, and no app install**.
- **Structured Dynamic Checklists:** Cases define exact required and optional files with instant status tags (*Missing*, *Under Review*, *Approved*, *Rejected*).
- **CA Review & Verification Suite:** Instant in-browser PDF/image preview, 1-click approvals, and customizable rejection templates.
- **In-Grid Client Dossier & Vault:** Embedded responsive client management without disruptive modal popups.
- **Automated Lifecycle & Storage Purge:** S3 object storage keeps databases light, and automated cron jobs permanently purge files after retention periods (7, 30, or 90 days).
- **SaaS Monetization & 30-Day Free Trial:** Zero-risk trial gating with manual UPI payment workflows and single-use voucher unlock keys.

---

## 2. System Architecture & Topology

```mermaid
flowchart TB
    subgraph ClientLayer ["1. Client Interaction Layer"]
        PublicClient["Client Mobile / Web Browser\n/upload/[token]\n(Zero Login Friction)"]
        AdvisorPortal["Advisor / CA Dashboard\n/dashboard/*\n(Secure Session Guarded)"]
        AdminConsole["Super Admin Panel\n/admin\n(Owner / Admin Guarded)"]
    end

    subgraph EdgeLayer ["2. Edge & Routing Layer (Next.js 15 App Router)"]
        EdgeMiddleware["src/middleware.ts\n- Route Protection\n- Session Cookie Verification\n- Public Path Bypasses"]
        ThemeEngine["Theme Engine\n- localStorage Sync\n- SSR Safe Hydration\n- Dual Light / Dark Tokens"]
    end

    subgraph ApplicationBackend ["3. Application & Server Action Layer"]
        AuthActions["src/app/actions/auth.ts\n- Email OTP Sign-in / Sign-up\n- Password Reset Workflows\n- Session Token Minting (JWT)"]
        PortalActions["src/app/actions/portal.ts\n- Token Verification\n- Presigned S3 Upload URLs\n- Doc Review & Auto-State Calc\n- In-Grid Client Dossier Queries"]
        TemplateActions["src/app/actions/templates.ts\n- CA Checklist Templates\n- Preset Requirements"]
        DownloadAPI["src/app/api/download/route.ts\n- Authenticated S3 Streaming\n- Presigned Read URLs (1hr TTL)"]
        CronAPI["src/app/api/cron/cleanup/route.ts\n- 7/30/90 Day Auto-Purge\n- S3 Delete & DB Pruning"]
        AdminAPI["src/app/api/admin/*\n- User Management\n- Plan Voucher Key Generation"]
    end

    subgraph AuthEngines ["4. Identity & Authentication Engine"]
        NeonBetterAuth["Neon Managed Better Auth\n(Google OAuth 2.0 PKCE)"]
        AppBcryptAuth["Application Auth Engine\n(10-Round Salted Bcrypt + JWT)"]
    end

    subgraph DataStorage ["5. Persistence & Cloud Infrastructure"]
        NeonPostgres[("Neon Serverless PostgreSQL\n- Pooled Connections\n- Row-Level Security (RLS)\n- Audit Logs & Cascade Rules")]
        NeonS3[("Neon S3 Object Storage\n- Multi-Tenant Directory Paths\n- Presigned Direct Streaming\n- Zero Server Memory Overhead")]
    end

    PublicClient -->|Token Parameter| EdgeMiddleware
    AdvisorPortal -->|Session Cookie| EdgeMiddleware
    AdminConsole -->|Admin Cookie| EdgeMiddleware

    EdgeMiddleware --> ApplicationBackend
    ApplicationBackend --> AuthActions
    ApplicationBackend --> PortalActions
    ApplicationBackend --> TemplateActions
    ApplicationBackend --> DownloadAPI
    ApplicationBackend --> CronAPI
    ApplicationBackend --> AdminAPI

    AuthActions --> NeonBetterAuth
    AuthActions --> AppBcryptAuth
    AuthActions --> NeonPostgres

    PortalActions --> NeonPostgres
    PortalActions --> NeonS3

    DownloadAPI --> NeonS3
    CronAPI --> NeonS3
    CronAPI --> NeonPostgres
```

---

## 3. Detailed Data Flow & Component Workflows

### 3.1 Client Upload Journey (Zero-Password Link)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (Mobile Browser)
    actor CA as CA / Consultant
    participant Web as Next.js Server Actions
    participant DB as Neon PostgreSQL
    participant S3 as Neon S3 Storage

    CA->>Web: Create Client & Case with Checklist
    Web->>DB: INSERT into clients, cases, document_requirements
    Web->>DB: INSERT into upload_links (SHA-256 token hash)
    Web-->>CA: Return WhatsApp shareable link (e.g. /upload/tok_abc123)
    CA->>Client: Send link via WhatsApp Web Click-to-Chat
    Client->>Web: Access /upload/tok_abc123
    Web->>DB: Verify token hash, active status, and expiry
    DB-->>Web: Return Case requirements, firm logo & colors
    Web-->>Client: Render Mobile Checklist UI (4-color status cards)
    Client->>Web: Upload File for Requirement (e.g. Bank Statement)
    Web->>S3: Generate Presigned PutObjectCommand (10-minute expiry)
    S3-->>Web: Presigned S3 Upload URL
    Web-->>Client: Return Presigned S3 URL
    Client->>S3: Direct binary stream upload (Zero Next.js memory usage)
    Client->>Web: Notify upload complete with metadata
    Web->>DB: INSERT into documents (storage_path, size, mime_type)
    Web->>DB: UPDATE document_requirements SET status = 'under_review'
    Web->>DB: Recalculate Case status -> 'under_review'
    Web->>DB: INSERT into activity_logs
    Web-->>CA: Real-time notification badge on Dashboard
```

---

### 3.2 CA Review, In-Grid Dossier & Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor CA as CA / Consultant
    participant UI as Dashboard Clients Page
    participant Web as Server Actions
    participant DB as Neon PostgreSQL
    participant S3 as Neon S3 Storage

    CA->>UI: Clicks Cases Badge or Vault on Client row
    Note over UI: In-Grid Dossier expands directly inside the table row.<br/>Zero modal popups. Side-by-side or tabbed grid.
    UI->>Web: getClientWithDossierAction(clientId)
    Web->>DB: Fetch Client cases, checklist requirements & uploaded files
    DB-->>UI: Populate In-Grid Case list & Document Vault
    CA->>UI: Clicks "Preview File"
    UI->>Web: Request preview presigned URL
    Web->>S3: Generate GetObjectCommand presigned URL (1hr TTL)
    S3-->>UI: Stream PDF / Image into in-browser preview drawer
    alt Approve Document
        CA->>UI: Clicks "Approve"
        UI->>Web: reviewDocumentAction(docId, 'approved')
        Web->>DB: UPDATE documents SET status = 'approved'
        Web->>DB: UPDATE document_requirements SET status = 'approved'
        Web->>DB: Check if all required docs approved -> Auto-complete Case
    else Reject Document with Reason
        CA->>UI: Selects Rejection Reason (e.g. 'Blurry / Unreadable Scan')
        UI->>Web: reviewDocumentAction(docId, 'rejected', reason)
        Web->>DB: UPDATE documents SET status = 'rejected', rejection_reason = reason
        Web->>DB: UPDATE document_requirements SET status = 'rejected'
        Web->>DB: Set Case status -> 'waiting_for_client'
    end
    Web->>DB: INSERT into activity_logs
    Web-->>UI: Real-time UI refresh with updated status badge
```

---

## 4. Entity Relationship Model & Relational Schema

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : "employs"
    ORGANIZATIONS ||--o{ CLIENTS : "owns"
    ORGANIZATIONS ||--o{ CASES : "manages"
    ORGANIZATIONS ||--o{ CHECKLIST_TEMPLATES : "creates"
    ORGANIZATIONS ||--o{ ACTIVITY_LOGS : "records"
    ORGANIZATIONS ||--o{ VOUCHERS : "redeems"

    CLIENTS ||--o{ CASES : "associated with"
    CLIENTS ||--o{ DOCUMENTS : "owns uploaded"

    CASES ||--o{ DOCUMENT_REQUIREMENTS : "defines"
    CASES ||--o{ UPLOAD_LINKS : "generates"
    CASES ||--o{ ACTIVITY_LOGS : "tracks"

    DOCUMENT_REQUIREMENTS ||--o{ DOCUMENTS : "collects versions"
    DOCUMENTS ||--o{ ACTIVITY_LOGS : "logs events"
```

### 4.1 Schema Tables Reference

| Table | Primary Key | Key Columns | Purpose |
| :--- | :--- | :--- | :--- |
| **`organizations`** | `id` (UUID) | `name`, `slug`, `logo_url`, `branding_color`, `plan`, `trial_expires_at`, `is_locked`, `storage_used_bytes` | Multi-tenant root isolation entity. Controls 30-day trial status and plan tier. |
| **`users`** | `id` (UUID) | `organization_id`, `email`, `full_name`, `password_hash`, `role`, `email_verified` | Consultant and staff profiles with role-based access. |
| **`clients`** | `id` (UUID) | `organization_id`, `name`, `email`, `phone`, `company`, `address`, `notes` | Client dossier records owned by a firm. |
| **`cases`** | `id` (UUID) | `organization_id`, `client_id`, `title`, `service_type`, `reference_number`, `status`, `due_date` | Service engagements (e.g., ITR Filing, GST Audit, Company Setup). |
| **`document_requirements`**| `id` (UUID) | `case_id`, `name`, `description`, `is_required`, `allowed_types`, `max_size_mb`, `status`, `sort_order` | Individual checklist items needed for a case. |
| **`documents`** | `id` (UUID) | `requirement_id`, `case_id`, `client_id`, `version`, `file_name`, `storage_path`, `file_size`, `status`, `expires_at` | Uploaded physical file metadata pointing to Neon S3 storage. |
| **`upload_links`** | `id` (UUID) | `case_id`, `token_hash`, `token_prefix`, `expires_at`, `revoked_at`, `last_used_at` | Cryptographic upload links shared with clients. |
| **`checklist_templates`** | `id` (UUID) | `organization_id`, `name`, `service_type`, `requirements` (JSONB) | Pre-built reusable checklist templates for CAs. |
| **`activity_logs`** | `id` (UUID) | `organization_id`, `case_id`, `document_id`, `actor_type`, `action`, `metadata` | Comprehensive audit trail of every system action. |
| **`vouchers`** | `id` (UUID) | `code`, `plan`, `duration_days`, `is_redeemed`, `redeemed_by_org_id`, `created_at` | Single-use activation vouchers issued by Super Admins. |

---

## 5. Storage Architecture & Directory Partitioning

DocuCollect stores zero binary files in the database. All documents stream directly to **Neon S3 Object Storage** using multi-tenant directory partitioning.

### 5.1 Object Key Convention
```
org-{orgId:0-12}/{clientId:0-12}/{caseId:0-12}/{requirementId:0-12}/v{version}_{sanitized_filename}
```
*Example:*  
`org-e82a19b8cf1a/cl_92f1b80a/cs_119ab48f/rq_4810dc2e/v1_bank_statement_2025_26.pdf`

### 5.2 Storage Security Matrix
- **Bucket Visibility:** Completely private (`public = false`).
- **Direct Streaming:** Direct presigned S3 URLs prevent server memory bottleneck.
- **Short-Lived Presigned URLs:**
  - **Upload URL:** 10 minutes TTL.
  - **Download / Preview URL:** 1 hour TTL.
- **Sanitization:** Special characters and path traversal sequences (`../`) are stripped before generating storage keys.

---

## 6. Security & Multi-Tenancy Architecture

```
[ Request Origin: Client / Advisor ]
               │
               ▼
┌────────────────────────────────────────────────────────┐
│ 1. Edge Route Middleware (src/middleware.ts)           │
│    - Blocks unauthenticated access to /dashboard/*     │
│    - Blocks non-admin access to /admin                 │
│    - Verifies JWT and Better Auth session cookies      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Identity & Trial Guard (src/lib/auth)               │
│    - requireSession(): Extracts authenticated user ID  │
│    - TrialExpiryGuard: Verifies 30-day trial status    │
│    - Locks uploads if plan expired                     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Organization Scoping in Server Actions              │
│    - getAuthenticatedOrgId(): Resolves organization_id │
│    - Enforces WHERE organization_id = $orgId on queries│
│    - Prevents cross-tenant data leakage                │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. Cryptographic Link Verification (Public Uploads)   │
│    - Computes SHA-256 hash of incoming plaintext token │
│    - Compares against stored token_hash in upload_links│
│    - Validates revoked_at IS NULL AND expires_at > now │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 5. Database Row-Level Security (PostgreSQL)            │
│    - current_org_id() session parameter                │
│    - Hard SQL-level tenant isolation                   │
└────────────────────────────────────────────────────────┘
```

---

## 7. Automated Retention & Auto-Purge Lifecycle

To keep storage usage lean and protect sensitive financial records, DocuCollect features an automated retention engine:

### 7.1 Retention Policies by Plan
- **Trial Plan:** **7-day** retention.
- **Starter Plan:** **30-day** retention.
- **Professional Plan:** **90-day** retention.
- **Firm Plan:** **Custom retention settings** (configurable up to 365+ days).

### 7.2 Cron Purge Flow (`/api/cron/cleanup`)
```mermaid
flowchart LR
    CronTrigger["Cron Job Trigger\n(Vercel Cron / External Service)"]
    CronTrigger --> QueryExp["Query documents WHERE\nexpires_at <= NOW()\nAND is_purged = false"]
    QueryExp --> DeleteS3["DeleteObjectCommand\non Neon S3"]
    DeleteS3 --> UpdateDB["UPDATE documents\nSET is_purged = true,\nstorage_path = NULL"]
    UpdateDB --> LogAudit["INSERT into activity_logs\n('document_auto_purged')"]
```

---

## 8. Billing, Monetization & Super Admin Console

1. **Pricing Tiers:**
   - **Trial (30 days, ₹0):** 1 firm workspace, up to 10 active clients, reusable checklists, link-based uploads & review, limited retention.
   - **Starter (Initial offer, ₹399/mo, ₹3,999/yr):** Up to 50 active clients, checklist templates, secure upload links, document review & rejection reasons, basic activity history.
   - **Professional (₹799/mo, ₹7,999/yr):** Up to 200 active clients, multiple staff accounts & roles, expanded templates, storage & audit history, firm branding.
   - **Firm (Proposed, ₹1,499/mo, ₹14,999/yr):** Higher client (500+) & staff limits, detailed permissions & audit history, custom retention, priority support, tailored onboarding.
2. **Trial Expiration Guard (`TrialExpiryGuard`):** When the trial expires:
   - Dashboard views remain readable.
   - Creating new cases and sharing active upload links is paused.
   - User is guided to the **Billing** dashboard.
3. **Manual UPI / Bank Transfer Payment Workflow:**
   - User views the official UPI QR code and bank account details.
   - User completes payment and submits payment proof.
4. **Super Admin Control Center (`/admin`):**
   - **Registered Users Tab:** View all signed-up consultants, organization names, email verification status, trial expiration dates, and one-click account lock/unlock toggles.
   - **Payments & Subscriptions Tab:** View payment submissions and generate single-use voucher codes (e.g. `DOCU-START-30D`, `DOCU-PRO-365D`) to instantly unlock client plans.

---

## 9. Appearance & Theme Architecture (Light & Dark)

DocuCollect implements an interactive dual-theme design system:
- **Theme Provider (`src/contexts/ThemeContext.tsx`):** Coordinates `light`, `dark`, and `system` preferences, synchronized with `localStorage` and OS media queries.
- **1-Click Theme Switcher (`src/components/ui/ThemeToggle.tsx`):** Available in the public Navbar, Pricing, Auth, and Dashboard headers.
- **CSS Token Harmonization (`src/app/globals.css`):**
  - Fallback dark rules use `:not([class*="dark:"])` filters, ensuring explicit Tailwind utility classes take full precedence.
  - Guarantees WCAG 4.5:1+ contrast across all pages, badges, and form elements in both themes.
