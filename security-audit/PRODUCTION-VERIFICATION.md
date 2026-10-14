# DOCUCOLLECT — PRODUCTION VERIFICATION & OPERATIONAL PLAYBOOK

## 1. Safe Post-Deployment Verification (Two Test Organizations)

Follow these steps to safely verify tenant isolation on a live staging or production deployment without modifying or endangering real customer data.

### Step 1: Provision Two Independent Test Workspaces
1. Open an Incognito/Private browser window.
2. Sign up or log in as **Organization Alpha** (`alpha-audit@test.com`).
   - Create a case: `Audit Case Alpha`.
   - Add a requirement: `Income Tax Return FY25`.
   - Copy the upload link from the dashboard: note the URL structure (`https://<domain>/upload/<random_token>`).
3. In the profile dropdown, click **Sign Out**.
   - Confirm the session cookie is removed and the browser redirects to `/login`.
4. Sign in as **Organization Beta** (`beta-audit@test.com`).
   - Create a case: `Audit Case Beta`.
   - Verify that **0 cases from Organization Alpha** appear on the dashboard or in the cases table.
   - Verify that no cases or client names from Alpha appear in `sessionStorage` (inspect via Developer Tools: `sessionStorage.getItem('docucollect_dashboard_cache_org_<beta_org_id>')`).

### Step 2: Attempt Cross-Tenant Direct URL Access
1. While authenticated as **Organization Beta**:
   - Manually enter the URL of Organization Alpha's case: `https://<domain>/dashboard/cases/<alpha_case_id>`.
   - **Expected Result:** The page must render an error screen displaying: *"Case not found or access restricted."*
   - Inspect Network tab: `/api/cases/<alpha_case_id>` must respond with **HTTP 404 Not Found**.
2. Attempt direct API download of Alpha's document:
   - Call `https://<domain>/api/download?id=<alpha_doc_id>`.
   - **Expected Result:** **HTTP 403 Forbidden** (*"Forbidden: You do not have access to documents from another organization."*).

### Step 3: Test Upload Token Isolation
1. Open the upload link generated for **Case Alpha** (`https://<domain>/upload/<alpha_token>`) in a clean tab.
2. Upload a test PDF file.
3. Attempt to use that upload token to download or access a document from **Case Beta**:
   - `https://<domain>/api/download?id=<beta_doc_id>&token=<alpha_token>`.
   - **Expected Result:** **HTTP 403 Forbidden** (*"Forbidden: Upload token is invalid, expired, or not authorized for this document."*).

---

## 2. Environment Variables Checklist

Ensure these variables are configured in the deployment environment (e.g. Cloudflare Worker Secrets / Environment Variables) without exposing their values in logs:

| Variable | Required Status | Purpose | Safety Check |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **MANDATORY** | Connection string for Neon Serverless PostgreSQL | Must use pooled endpoint (`-pooler`) with SSL enabled (`sslmode=require`). |
| `AUTH_SECRET` | **MANDATORY** | HMAC-SHA256 secret key for signing session JWTs | Must be >= 32 characters of high cryptographic entropy. Server throws fatal error if missing. |
| `STORAGE_ENCRYPTION_KEY` | **MANDATORY** | AES-256-GCM master key for encrypting document buffers | Must be 64-character hex string (32 bytes). Server throws fatal error in production if missing. |
| `ADMIN_SECRET` | **MANDATORY** | Secret token required for administrative maintenance endpoints | Timing-attack resistant constant-time comparison enforced. |
| `CRON_SECRET` | **MANDATORY** | Token authenticating automatic storage retention cleanup jobs | Required for `/api/cron/cleanup-storage`. |

> [!CAUTION]
> Never print or log the raw values of any secret variables. Verification scripts should only assert that `Boolean(process.env[KEY]) === true` and check minimum length.

---

## 3. Database Role & RLS Verification

Run the following SQL query in the Neon SQL Console to verify that all tenant tables have Row-Level Security actively enabled with explicit policies:

```sql
SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    count(p.policyname) AS active_policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relname IN ('organizations', 'cases', 'clients', 'documents', 'document_requirements', 'upload_links', 'activity_logs', 'subscriptions')
GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
ORDER BY c.relname;
```

**Expected Result:**
Every table in the list must report `rls_enabled = true` and `active_policy_count >= 1`.

---

## 4. Database Backup & Restore Plan

### Neon Point-in-Time Recovery (PITR)
DocuCollect runs on Neon PostgreSQL, which natively supports instant point-in-time restore without downtime to existing branches:
1. In the **Neon Console**, navigate to your project -> **Backups / Branches**.
2. To restore to a safe point prior to any incident:
   - Select **Restore to point in time**.
   - Select the target timestamp (accurate to the second).
   - Create a restore branch (e.g. `main-restore-20261014`).
3. Verify data integrity on the restore branch using the verification script:
   ```bash
   npx tsx scripts/test-security.ts
   ```
4. Point the application connection string to the restored branch endpoint.

---

## 5. Rollback Plan

### Application Code Rollback
If a regression or runtime issue occurs post-deployment:
1. Revert to previous Git commit:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Cloudflare Pages / Workers will automatically rebuild and deploy the prior stable release, or roll back instantly via the Cloudflare dashboard:
   - Go to **Workers & Pages** -> **docucollect** -> **Deployments**.
   - Click on the prior deployment -> **Rollback to this deployment**.

### Database Migration Rollback
The database migration (`neon/tenant_isolation_rls.sql`) added columns (`organization_id`, `token` to `upload_links`) and added RLS policies. It did not drop existing columns or destructive data.
If necessary to revert the migration policies:
```sql
DROP POLICY IF EXISTS tenant_upload_links_policy ON public.upload_links;
DROP POLICY IF EXISTS tenant_document_requirements_policy ON public.document_requirements;
DROP POLICY IF EXISTS tenant_organizations_policy ON public.organizations;
```
Existing data and application queries remain fully backward compatible.
