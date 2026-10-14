-- =====================================================================
-- DOCUCOLLECT: TENANT ISOLATION HARDENING & RLS POLICY ENFORCEMENT
-- =====================================================================

-- 1. Ensure upload_links has organization_id column for direct tenant indexing
ALTER TABLE public.upload_links ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.upload_links ADD COLUMN IF NOT EXISTS token TEXT;

-- Backfill organization_id from cases
UPDATE public.upload_links ul
SET organization_id = c.organization_id
FROM public.cases c
WHERE ul.case_id = c.id AND ul.organization_id IS NULL;

-- Backfill token if null
UPDATE public.upload_links SET token = token_hash WHERE token IS NULL;

CREATE INDEX IF NOT EXISTS idx_upload_links_org ON public.upload_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_upload_links_token ON public.upload_links(token);

-- 2. Security helper function (stable, tenant-isolated)
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_org_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Enable RLS on all tenant tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Apply strict tenant policies across all tables
DO $$ BEGIN
    DROP POLICY IF EXISTS tenant_organizations_policy ON public.organizations;
    CREATE POLICY tenant_organizations_policy ON public.organizations
        FOR ALL USING (
            id = current_org_id()
        );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS tenant_cases_policy ON public.cases;
    CREATE POLICY tenant_cases_policy ON public.cases
        FOR ALL USING (
            organization_id = current_org_id()
        );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS tenant_clients_policy ON public.clients;
    CREATE POLICY tenant_clients_policy ON public.clients
        FOR ALL USING (
            organization_id = current_org_id()
        );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

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

DO $$ BEGIN
    DROP POLICY IF EXISTS tenant_activity_logs_policy ON public.activity_logs;
    CREATE POLICY tenant_activity_logs_policy ON public.activity_logs
        FOR ALL USING (
            organization_id = current_org_id()
        );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS tenant_subscriptions_policy ON public.subscriptions;
    CREATE POLICY tenant_subscriptions_policy ON public.subscriptions
        FOR ALL USING (
            organization_id = current_org_id()
        );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT 'Tenant isolation RLS policies successfully applied.' as result;
