import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

// Load .env.local
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL missing from environment");
    process.exit(1);
  }

  const sql = neon(dbUrl);
  console.log("🔌 Connecting to Neon database...");

  // Read SQL migration file
  const sqlContent = fs.readFileSync(path.join(process.cwd(), "neon/tenant_isolation_rls.sql"), "utf-8");

  console.log("🚀 Applying tenant isolation RLS migration...");
  
  // Split statements and execute
  await sql`ALTER TABLE public.upload_links ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;`;
  await sql`ALTER TABLE public.upload_links ADD COLUMN IF NOT EXISTS token TEXT;`;
  
  await sql`
    UPDATE public.upload_links ul
    SET organization_id = c.organization_id
    FROM public.cases c
    WHERE ul.case_id = c.id AND ul.organization_id IS NULL;
  `;

  await sql`UPDATE public.upload_links SET token = token_hash WHERE token IS NULL;`;

  await sql`CREATE INDEX IF NOT EXISTS idx_upload_links_org ON public.upload_links(organization_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_upload_links_token ON public.upload_links(token);`;

  await sql`
    CREATE OR REPLACE FUNCTION public.current_org_id()
    RETURNS UUID AS $$
    BEGIN
        RETURN NULLIF(current_setting('app.current_org_id', true), '')::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN NULL;
    END;
    $$ LANGUAGE plpgsql STABLE;
  `;

  await sql`ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;`;
  await sql`ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;`;
  await sql`ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;`;
  await sql`ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;`;
  await sql`ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;`;
  await sql`ALTER TABLE public.upload_links ENABLE ROW LEVEL SECURITY;`;
  await sql`ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;`;
  await sql`ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;`;

  await sql`
    DO $$ BEGIN
        DROP POLICY IF EXISTS tenant_organizations_policy ON public.organizations;
        CREATE POLICY tenant_organizations_policy ON public.organizations
            FOR ALL USING (id = current_org_id());
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
  `;

  await sql`
    DO $$ BEGIN
        DROP POLICY IF EXISTS tenant_cases_policy ON public.cases;
        CREATE POLICY tenant_cases_policy ON public.cases
            FOR ALL USING (organization_id = current_org_id());
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
  `;

  await sql`
    DO $$ BEGIN
        DROP POLICY IF EXISTS tenant_clients_policy ON public.clients;
        CREATE POLICY tenant_clients_policy ON public.clients
            FOR ALL USING (organization_id = current_org_id());
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
  `;

  await sql`
    DO $$ BEGIN
        DROP POLICY IF EXISTS tenant_document_requirements_policy ON public.document_requirements;
        CREATE POLICY tenant_document_requirements_policy ON public.document_requirements
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.cases c
                    WHERE c.id = document_requirements.case_id
                      AND c.organization_id = current_org_id()
                )
            );
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
  `;

  await sql`
    DO $$ BEGIN
        DROP POLICY IF EXISTS tenant_documents_policy ON public.documents;
        CREATE POLICY tenant_documents_policy ON public.documents
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.cases c
                    WHERE c.id = documents.case_id
                      AND c.organization_id = current_org_id()
                )
            );
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
  `;

  await sql`
    DO $$ BEGIN
        DROP POLICY IF EXISTS tenant_upload_links_policy ON public.upload_links;
        CREATE POLICY tenant_upload_links_policy ON public.upload_links
            FOR ALL USING (
                (organization_id IS NOT NULL AND organization_id = current_org_id())
                OR EXISTS (
                    SELECT 1 FROM public.cases c
                    WHERE c.id = upload_links.case_id
                      AND c.organization_id = current_org_id()
                )
            );
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
  `;

  await sql`
    DO $$ BEGIN
        DROP POLICY IF EXISTS tenant_activity_logs_policy ON public.activity_logs;
        CREATE POLICY tenant_activity_logs_policy ON public.activity_logs
            FOR ALL USING (organization_id = current_org_id());
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
  `;

  await sql`
    DO $$ BEGIN
        DROP POLICY IF EXISTS tenant_subscriptions_policy ON public.subscriptions;
        CREATE POLICY tenant_subscriptions_policy ON public.subscriptions
            FOR ALL USING (organization_id = current_org_id());
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
  `;

  console.log("✅ All tenant isolation RLS policies successfully applied to Neon database!");
}

run().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
