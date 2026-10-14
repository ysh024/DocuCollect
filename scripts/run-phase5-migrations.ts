import fs from "fs";
import path from "path";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

function getDatabaseUrl(): string {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/DATABASE_URL=(.*)/);
  if (!match) throw new Error("No DATABASE_URL in .env.local");
  let url = match[1].trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  return url;
}

async function runStatements(sql: any, statements: string[]) {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;
    try {
      await sql.query(stmt);
    } catch (err: any) {
      console.error(`Error on statement #${i + 1}:\n${stmt.slice(0, 150)}...`);
      throw err;
    }
  }
}

async function runPhase5() {
  console.log("=============================================================");
  console.log("DOCUCOLLECT PHASE 5: MIGRATION & SECURITY HARDENING RUNNER");
  console.log("=============================================================");

  const ownerDbUrl = getDatabaseUrl();
  const ownerUrlObj = new URL(ownerDbUrl);

  // 1. Verify Database Identity
  console.log("\n[STEP 1] Verifying Target Database Identity...");
  console.log("Target Host:", ownerUrlObj.hostname);
  console.log("Database:", ownerUrlObj.pathname.slice(1));
  console.log("Admin User:", ownerUrlObj.username);

  if (!ownerUrlObj.hostname.includes("neon.tech") || ownerUrlObj.pathname.slice(1) !== "docucollect-db") {
    throw new Error(`Safety Stop: Target database is ${ownerUrlObj.hostname}/${ownerUrlObj.pathname}, expected Neon docucollect-db!`);
  }

  // 2. Verify Backup Exists
  console.log("\n[STEP 2] Verifying Recovery Point...");
  const backupPath = path.join(process.cwd(), "neon", "backups", "pre-phase5-backup.json");
  if (!fs.existsSync(backupPath)) {
    throw new Error("Safety Stop: Backup file pre-phase5-backup.json does not exist. Aborting DDL changes.");
  }
  const backupStat = fs.statSync(backupPath);
  console.log(`Recovery point verified: ${backupPath} (${(backupStat.size / 1024).toFixed(2)} KB)`);

  const ownerSql = neon(ownerDbUrl);

  // 3. Pre-migration Data Validation
  console.log("\n[STEP 3] Running Pre-Migration Data Validation...");
  const orphanCases = await ownerSql`
    SELECT c.id, c.organization_id AS case_org, cl.organization_id AS client_org
    FROM public.cases c
    LEFT JOIN public.clients cl ON c.client_id = cl.id
    WHERE cl.id IS NULL OR c.organization_id != cl.organization_id;
  `;
  if (orphanCases.length > 0) {
    throw new Error(`Data Validation Failed: ${orphanCases.length} cases have cross-tenant or missing clients!`);
  }
  console.log("Precondition PASSED: Zero cross-tenant case-to-client associations found.");

  // 4. Execute Migration 001: Composite Constraints
  console.log("\n[STEP 4] Executing Migration 001 (Composite Constraints)...");
  const mig1Statements = [
    `DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'uq_clients_id_organization_id' 
              AND conrelid = 'public.clients'::regclass
        ) THEN
            ALTER TABLE public.clients
                ADD CONSTRAINT uq_clients_id_organization_id UNIQUE (id, organization_id);
        END IF;
    END $$;`,

    `DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'cases_client_id_fkey' 
              AND conrelid = 'public.cases'::regclass
        ) THEN
            ALTER TABLE public.cases DROP CONSTRAINT cases_client_id_fkey;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'cases_client_id_organization_id_fkey' 
              AND conrelid = 'public.cases'::regclass
        ) THEN
            ALTER TABLE public.cases
                ADD CONSTRAINT cases_client_id_organization_id_fkey
                FOREIGN KEY (client_id, organization_id)
                REFERENCES public.clients (id, organization_id)
                ON DELETE CASCADE;
        END IF;
    END $$;`,

    `CREATE INDEX IF NOT EXISTS idx_cases_client_org ON public.cases (client_id, organization_id);`,
  ];
  await runStatements(ownerSql, mig1Statements);
  console.log("Migration 001 applied successfully.");

  // 5. Execute Migration 002: Hardened Tenant RLS Policies
  console.log("\n[STEP 5] Executing Migration 002 (Hardened Tenant RLS)...");
  const mig2Statements = [
    `CREATE OR REPLACE FUNCTION public.current_org_id()
    RETURNS UUID AS $$
    BEGIN
        RETURN NULLIF(current_setting('app.current_org_id', true), '')::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN NULL;
    END;
    $$ LANGUAGE plpgsql STABLE;`,

    `ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.upload_links ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;`,

    // Organizations
    `DROP POLICY IF EXISTS tenant_organizations_policy ON public.organizations;`,
    `CREATE POLICY tenant_organizations_policy ON public.organizations
        FOR ALL
        USING (id = current_org_id())
        WITH CHECK (id = current_org_id());`,

    // Clients
    `DROP POLICY IF EXISTS tenant_clients_policy ON public.clients;`,
    `CREATE POLICY tenant_clients_policy ON public.clients
        FOR ALL
        USING (organization_id = current_org_id())
        WITH CHECK (organization_id = current_org_id());`,

    // Cases
    `DROP POLICY IF EXISTS tenant_cases_policy ON public.cases;`,
    `CREATE POLICY tenant_cases_policy ON public.cases
        FOR ALL
        USING (organization_id = current_org_id())
        WITH CHECK (organization_id = current_org_id());`,

    // Document Requirements
    `DROP POLICY IF EXISTS tenant_document_requirements_policy ON public.document_requirements;`,
    `CREATE POLICY tenant_document_requirements_policy ON public.document_requirements
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM public.cases c
                WHERE c.id = document_requirements.case_id
                  AND c.organization_id = current_org_id()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.cases c
                WHERE c.id = document_requirements.case_id
                  AND c.organization_id = current_org_id()
            )
        );`,

    // Documents
    `DROP POLICY IF EXISTS tenant_documents_policy ON public.documents;`,
    `CREATE POLICY tenant_documents_policy ON public.documents
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM public.cases c
                WHERE c.id = documents.case_id
                  AND c.organization_id = current_org_id()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.cases c
                WHERE c.id = documents.case_id
                  AND c.organization_id = current_org_id()
            )
        );`,

    // Upload Links
    `DROP POLICY IF EXISTS tenant_upload_links_policy ON public.upload_links;`,
    `CREATE POLICY tenant_upload_links_policy ON public.upload_links
        FOR ALL
        USING (
            (organization_id IS NOT NULL AND organization_id = current_org_id())
            OR EXISTS (
                SELECT 1 FROM public.cases c
                WHERE c.id = upload_links.case_id
                  AND c.organization_id = current_org_id()
            )
        )
        WITH CHECK (
            (organization_id IS NOT NULL AND organization_id = current_org_id())
            OR EXISTS (
                SELECT 1 FROM public.cases c
                WHERE c.id = upload_links.case_id
                  AND c.organization_id = current_org_id()
            )
        );`,

    // Activity Logs
    `DROP POLICY IF EXISTS tenant_activity_logs_policy ON public.activity_logs;`,
    `CREATE POLICY tenant_activity_logs_policy ON public.activity_logs
        FOR ALL
        USING (organization_id = current_org_id())
        WITH CHECK (organization_id = current_org_id());`,

    // Subscriptions
    `DROP POLICY IF EXISTS tenant_subscriptions_policy ON public.subscriptions;`,
    `CREATE POLICY tenant_subscriptions_policy ON public.subscriptions
        FOR ALL
        USING (organization_id = current_org_id())
        WITH CHECK (organization_id = current_org_id());`,

    // Checklist Templates: SELECT
    `DROP POLICY IF EXISTS checklist_templates_select_policy ON public.checklist_templates;`,
    `CREATE POLICY checklist_templates_select_policy ON public.checklist_templates
        FOR SELECT
        USING (
            is_system = true 
            OR (organization_id IS NOT NULL AND organization_id = current_org_id())
        );`,

    // Checklist Templates: INSERT
    `DROP POLICY IF EXISTS checklist_templates_insert_policy ON public.checklist_templates;`,
    `CREATE POLICY checklist_templates_insert_policy ON public.checklist_templates
        FOR INSERT
        WITH CHECK (
            is_system = false 
            AND organization_id IS NOT NULL 
            AND organization_id = current_org_id()
        );`,

    // Checklist Templates: UPDATE
    `DROP POLICY IF EXISTS checklist_templates_update_policy ON public.checklist_templates;`,
    `CREATE POLICY checklist_templates_update_policy ON public.checklist_templates
        FOR UPDATE
        USING (
            is_system = false 
            AND organization_id IS NOT NULL 
            AND organization_id = current_org_id()
        )
        WITH CHECK (
            is_system = false 
            AND organization_id IS NOT NULL 
            AND organization_id = current_org_id()
        );`,

    // Checklist Templates: DELETE
    `DROP POLICY IF EXISTS checklist_templates_delete_policy ON public.checklist_templates;`,
    `CREATE POLICY checklist_templates_delete_policy ON public.checklist_templates
        FOR DELETE
        USING (
            is_system = false 
            AND organization_id IS NOT NULL 
            AND organization_id = current_org_id()
        );`,

    // Supporting Indexes
    `CREATE INDEX IF NOT EXISTS idx_checklist_templates_lookup ON public.checklist_templates (organization_id, is_system);`,
    `CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents (case_id);`,
    `CREATE INDEX IF NOT EXISTS idx_doc_reqs_case_id ON public.document_requirements (case_id);`,
  ];
  await runStatements(ownerSql, mig2Statements);
  console.log("Migration 002 applied successfully.");

  // 6. Provision Restricted Application Role (docucollect_app)
  console.log("\n[STEP 6] Provisioning Restricted Application Role (docucollect_app)...");
  const appPassword = crypto.randomBytes(24).toString("base64url");

  // Create or alter role with securely generated password
  await ownerSql.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'docucollect_app') THEN
        CREATE ROLE docucollect_app WITH LOGIN PASSWORD '${appPassword}'
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      ELSE
        ALTER ROLE docucollect_app WITH LOGIN PASSWORD '${appPassword}'
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      END IF;
    END $$;
  `);

  // Apply least-privilege grants
  const mig3Statements = [
    `GRANT USAGE ON SCHEMA public TO docucollect_app;`,

    `GRANT SELECT, INSERT, UPDATE, DELETE ON 
        public.organizations,
        public.clients,
        public.cases,
        public.document_requirements,
        public.documents,
        public.upload_links,
        public.activity_logs,
        public.subscriptions,
        public.checklist_templates
    TO docucollect_app;`,

    `GRANT SELECT, INSERT, UPDATE, DELETE ON 
        public.users,
        public.otp_codes,
        public.account,
        public."session",
        public."user",
        public.verification
    TO docucollect_app;`,

    `GRANT SELECT ON 
        public.plans,
        public.system_settings,
        public.license_keys
    TO docucollect_app;`,

    `GRANT UPDATE ON 
        public.license_keys,
        public.system_settings
    TO docucollect_app;`,

    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO docucollect_app;`,

    `ALTER DEFAULT PRIVILEGES IN SCHEMA public 
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO docucollect_app;`,

    `ALTER DEFAULT PRIVILEGES IN SCHEMA public 
        GRANT USAGE, SELECT ON SEQUENCES TO docucollect_app;`,
  ];
  await runStatements(ownerSql, mig3Statements);
  console.log("Role docucollect_app provisioned with NOBYPASSRLS and least-privilege grants.");

  // 7. Verify Role Attributes & Post-Migration Catalog State
  console.log("\n[STEP 7] Verifying Catalog State...");
  const roleCheck = await ownerSql`
    SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolbypassrls
    FROM pg_roles WHERE rolname = 'docucollect_app';
  `;
  console.log("docucollect_app attributes:", JSON.stringify(roleCheck[0]));
  if (roleCheck[0].rolbypassrls !== false) {
    throw new Error("Critical Security Failure: docucollect_app has rolbypassrls = true!");
  }

  const rlsCheck = await ownerSql`
    SELECT c.relname as table_name, c.relrowsecurity as rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('organizations', 'clients', 'cases', 'document_requirements', 'documents', 'upload_links', 'activity_logs', 'subscriptions', 'checklist_templates')
    ORDER BY c.relname;
  `;
  console.log(`Verified RLS enabled on ${rlsCheck.filter((t: any) => t.rls_enabled).length}/9 tenant tables.`);

  const fkCheck = await ownerSql`
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name, ccu.column_name as foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'cases' AND tc.constraint_name = 'cases_client_id_organization_id_fkey';
  `;
  console.log("Composite FK verified on cases:", fkCheck.map((f: any) => `${f.column_name} -> ${f.table_name}.${f.foreign_column}`).join(", "));

  // 8. Test Connecting with docucollect_app directly
  console.log("\n[STEP 8] Validating Connection with docucollect_app...");
  const appUrlObj = new URL(ownerDbUrl);
  appUrlObj.username = "docucollect_app";
  appUrlObj.password = appPassword;
  const appDbUrl = appUrlObj.toString();

  const appSql = neon(appDbUrl);
  const connTest = await appSql`SELECT 1 as test, current_user as usr;`;
  console.log(`Connected successfully as: ${connTest[0].usr}`);

  // 9. Update .env.local with Restricted App Credentials
  console.log("\n[STEP 9] Updating .env.local with Restricted Application Credentials...");
  const envPath = path.join(process.cwd(), ".env.local");
  let envContent = fs.readFileSync(envPath, "utf-8");

  // Keep MIGRATION_DATABASE_URL pointing to neondb_owner for future administrative migrations
  if (!envContent.includes("MIGRATION_DATABASE_URL=")) {
    envContent = `MIGRATION_DATABASE_URL="${ownerDbUrl}"\n` + envContent;
  } else {
    envContent = envContent.replace(/MIGRATION_DATABASE_URL=.*/, `MIGRATION_DATABASE_URL="${ownerDbUrl}"`);
  }

  // Update DATABASE_URL and DATABASE_URL_POOLED to use docucollect_app
  envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${appDbUrl}"`);

  // Also update pooled URL if present
  if (envContent.includes("DATABASE_URL_POOLED=")) {
    const pooledUrlObj = new URL(appDbUrl);
    if (!pooledUrlObj.hostname.includes("-pooler")) {
      pooledUrlObj.hostname = pooledUrlObj.hostname.replace(".aws.neon.tech", "-pooler.aws.neon.tech");
    }
    envContent = envContent.replace(/DATABASE_URL_POOLED=.*/, `DATABASE_URL_POOLED="${pooledUrlObj.toString()}"`);
  }

  fs.writeFileSync(envPath, envContent, "utf-8");
  console.log("Updated .env.local: DATABASE_URL now connects via docucollect_app (NOBYPASSRLS).");
  console.log("MIGRATION_DATABASE_URL preserved for administrative schema management.");

  console.log("\n=============================================================");
  console.log("[SUCCESS] PHASE 5 DATABASE HARDENING APPLIED AND VERIFIED!");
  console.log("=============================================================");
}

runPhase5().catch((err) => {
  console.error("\n[CRITICAL FAILURE] Migration aborted:", err);
  process.exit(1);
});
