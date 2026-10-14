-- =============================================================================
-- Migration 002: Tenant Row Level Security (RLS) Hardening
-- DocuCollect Phase 5 Database Hardening
-- =============================================================================

BEGIN;

-- 1. Helper function to extract tenant organization ID from transaction-local context
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_org_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Enable RLS on all 9 tenant tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. Organizations Table Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_organizations_policy ON public.organizations;
CREATE POLICY tenant_organizations_policy ON public.organizations
    FOR ALL
    USING (id = current_org_id())
    WITH CHECK (id = current_org_id());

-- -----------------------------------------------------------------------------
-- 4. Clients Table Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_clients_policy ON public.clients;
CREATE POLICY tenant_clients_policy ON public.clients
    FOR ALL
    USING (organization_id = current_org_id())
    WITH CHECK (organization_id = current_org_id());

-- -----------------------------------------------------------------------------
-- 5. Cases Table Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_cases_policy ON public.cases;
CREATE POLICY tenant_cases_policy ON public.cases
    FOR ALL
    USING (organization_id = current_org_id())
    WITH CHECK (organization_id = current_org_id());

-- -----------------------------------------------------------------------------
-- 6. Document Requirements Table Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_document_requirements_policy ON public.document_requirements;
CREATE POLICY tenant_document_requirements_policy ON public.document_requirements
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
    );

-- -----------------------------------------------------------------------------
-- 7. Documents Table Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_documents_policy ON public.documents;
CREATE POLICY tenant_documents_policy ON public.documents
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
    );

-- -----------------------------------------------------------------------------
-- 8. Upload Links Table Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_upload_links_policy ON public.upload_links;
CREATE POLICY tenant_upload_links_policy ON public.upload_links
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
    );

-- -----------------------------------------------------------------------------
-- 9. Activity Logs Table Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_activity_logs_policy ON public.activity_logs;
CREATE POLICY tenant_activity_logs_policy ON public.activity_logs
    FOR ALL
    USING (organization_id = current_org_id())
    WITH CHECK (organization_id = current_org_id());

-- -----------------------------------------------------------------------------
-- 10. Subscriptions Table Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_subscriptions_policy ON public.subscriptions;
CREATE POLICY tenant_subscriptions_policy ON public.subscriptions
    FOR ALL
    USING (organization_id = current_org_id())
    WITH CHECK (organization_id = current_org_id());

-- -----------------------------------------------------------------------------
-- 11. Checklist Templates Table Policies (Granular CRUD)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS checklist_templates_select_policy ON public.checklist_templates;
CREATE POLICY checklist_templates_select_policy ON public.checklist_templates
    FOR SELECT
    USING (
        is_system = true 
        OR (organization_id IS NOT NULL AND organization_id = current_org_id())
    );

DROP POLICY IF EXISTS checklist_templates_insert_policy ON public.checklist_templates;
CREATE POLICY checklist_templates_insert_policy ON public.checklist_templates
    FOR INSERT
    WITH CHECK (
        is_system = false 
        AND organization_id IS NOT NULL 
        AND organization_id = current_org_id()
    );

DROP POLICY IF EXISTS checklist_templates_update_policy ON public.checklist_templates;
CREATE POLICY checklist_templates_update_policy ON public.checklist_templates
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
    );

DROP POLICY IF EXISTS checklist_templates_delete_policy ON public.checklist_templates;
CREATE POLICY checklist_templates_delete_policy ON public.checklist_templates
    FOR DELETE
    USING (
        is_system = false 
        AND organization_id IS NOT NULL 
        AND organization_id = current_org_id()
    );

-- -----------------------------------------------------------------------------
-- 12. Supporting Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_checklist_templates_lookup ON public.checklist_templates (organization_id, is_system);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents (case_id);
CREATE INDEX IF NOT EXISTS idx_doc_reqs_case_id ON public.document_requirements (case_id);

COMMIT;
