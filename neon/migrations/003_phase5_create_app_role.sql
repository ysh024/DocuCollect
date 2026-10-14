-- =============================================================================
-- Migration 003: Restricted Application Role (docucollect_app)
-- DocuCollect Phase 5 Database Hardening
-- =============================================================================

-- Note: The role is created/altered with a cryptographically generated password
-- by scripts/run-phase5-migrations.ts. This SQL script contains the permission grants.

BEGIN;

-- 1. Schema-level grants
GRANT USAGE ON SCHEMA public TO docucollect_app;

-- 2. Tenant Tables (Subject to RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON 
    public.organizations,
    public.clients,
    public.cases,
    public.document_requirements,
    public.documents,
    public.upload_links,
    public.activity_logs,
    public.subscriptions,
    public.checklist_templates
TO docucollect_app;

-- 3. Authentication & User Management Tables
GRANT SELECT, INSERT, UPDATE, DELETE ON 
    public.users,
    public.otp_codes,
    public.account,
    public."session",
    public."user",
    public.verification
TO docucollect_app;

-- 4. Global Lookup & Configuration Tables
GRANT SELECT ON 
    public.plans,
    public.system_settings,
    public.license_keys
TO docucollect_app;

GRANT UPDATE ON 
    public.license_keys,
    public.system_settings
TO docucollect_app;

-- 5. Sequence Grants (for auto-increment IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO docucollect_app;

-- 6. Future Default Privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO docucollect_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT USAGE, SELECT ON SEQUENCES TO docucollect_app;

COMMIT;
