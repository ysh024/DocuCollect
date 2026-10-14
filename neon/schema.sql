-- =====================================================================
-- NEON SERVERLESS POSTGRESQL SCHEMA FOR DOCUCOLLECT (PRODUCTION SECURE v3)
-- Architecture: Neon Better Auth (Email OTP + Google OAuth) + RLS Tenant Isolation
-- Features: No Passwords, Strict OTP Verification, Activity Isolation, SaaS Plans & Quotas
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. CUSTOM ENUM TYPES
-- =====================================================================
DO $$ BEGIN
    CREATE TYPE case_status AS ENUM (
        'draft',
        'active',
        'waiting_for_client',
        'under_review',
        'completed',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE requirement_status AS ENUM (
        'not_uploaded',
        'uploaded',
        'under_review',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM (
        'under_review',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE actor_type AS ENUM (
        'admin',
        'client',
        'system'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'owner',
        'admin',
        'staff'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'trial',
        'active',
        'past_due',
        'cancelled',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================================
-- 3. NEON BETTER AUTH CORE TABLES
-- Stores logins, sessions, Google OAuth accounts, and email OTP verifications
-- =====================================================================

-- 3.1 Better Auth User Table
CREATE TABLE IF NOT EXISTS public."user" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN DEFAULT false NOT NULL,
    email_verified BOOLEAN DEFAULT false NOT NULL,
    image TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.2 Better Auth Session Table (Session tracking & login logs)
CREATE TABLE IF NOT EXISTS public."session" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public."user"(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    "ipAddress" TEXT,
    ip_address TEXT,
    "userAgent" TEXT,
    user_agent TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.3 Better Auth Account Table (Google OAuth & Social Providers)
CREATE TABLE IF NOT EXISTS public."account" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public."user"(id) ON DELETE CASCADE,
    "accountId" TEXT NOT NULL,
    account_id TEXT,
    "providerId" TEXT NOT NULL,                          -- 'google', etc.
    provider_id TEXT,
    "accessToken" TEXT,
    access_token TEXT,
    "refreshToken" TEXT,
    refresh_token TEXT,
    "idToken" TEXT,
    id_token TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ,
    access_token_expires_at TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    scope TEXT,
    password TEXT,                                       -- Nullable (no password used)
    "createdAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.4 Better Auth Verification Table (Email OTP & Verification Tokens)
CREATE TABLE IF NOT EXISTS public."verification" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    identifier TEXT NOT NULL,                             -- User email address
    value TEXT NOT NULL,                                  -- OTP code / verification token
    "expiresAt" TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- 4. SAAS PLANS & SUBSCRIPTIONS (Strict Quotas for 5GB Neon Tier)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,                            -- 'free_trial', 'starter', 'pro'
    display_name TEXT NOT NULL,                           -- 'Free Trial', 'Starter', 'Professional'
    price_monthly NUMERIC(10,2) DEFAULT 0 NOT NULL,
    price_yearly NUMERIC(10,2) DEFAULT 0 NOT NULL,
    max_clients INTEGER DEFAULT 10 NOT NULL,              -- 10 clients on Free Plan
    max_cases_per_client INTEGER DEFAULT 5 NOT NULL,
    max_storage_mb INTEGER DEFAULT 500 NOT NULL,          -- 500MB on Free Plan
    file_retention_days INTEGER DEFAULT 7 NOT NULL,       -- 7-day auto-purge on Free Plan
    max_upload_size_mb INTEGER DEFAULT 10 NOT NULL,       -- 10MB per file
    features JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Organizations Table (CA Firms, Law Firms, Consultancies)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    branding_color TEXT DEFAULT '#171717',
    settings JSONB DEFAULT '{
        "default_link_expiry_days": 30,
        "max_file_size_mb": 10,
        "allowed_mime_types": ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    }'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Subscriptions Table (Organization Plan Mapping & Billing Status)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status subscription_status DEFAULT 'trial' NOT NULL,
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ,
    payment_method TEXT DEFAULT 'manual',                 -- 'manual', 'upi', 'bank_transfer'
    payment_notes TEXT,
    activated_by TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6b. Single-Use License Keys / Vouchers (Prevents key-sharing, enables one-time plan activation)
CREATE TABLE IF NOT EXISTS public.license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    plan_name VARCHAR(32) NOT NULL,
    period VARCHAR(16) NOT NULL DEFAULT 'monthly',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    redeemed_by_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    redeemed_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    redeemed_by_email VARCHAR(255),
    redeemed_at TIMESTAMPTZ,
    notes TEXT,
    created_by VARCHAR(255) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_license_keys_code ON public.license_keys (UPPER(code));

-- 7. Application Users Profile (Linked to Better Auth & Organizations)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,  -- Matches Better Auth user.id
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT,
    role user_role DEFAULT 'owner' NOT NULL,
    email_verified BOOLEAN DEFAULT false NOT NULL,        -- Only verified users can enter
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Standalone OTP Codes Table (High-Speed Hash Verified Email OTP)
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,                              -- SHA-256 of 6-digit code
    purpose TEXT DEFAULT 'login' NOT NULL,                -- 'login', 'signup'
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Sessions Table (App Session Fallback Tracking)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- 10. CLIENT PORTAL & CASE MANAGEMENT
-- =====================================================================

-- 10.1 Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    company TEXT,
    client_ref_id TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10.2 Cases Table (Document Collection Checklists)
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    service_type TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    status case_status DEFAULT 'waiting_for_client' NOT NULL,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10.3 Document Requirements Table (Itemized Checklists)
CREATE TABLE IF NOT EXISTS public.document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT true NOT NULL,
    allowed_types TEXT[] DEFAULT ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::TEXT[],
    max_size_mb INTEGER DEFAULT 10 NOT NULL,
    status requirement_status DEFAULT 'not_uploaded' NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10.4 Documents Table (File Storage with Automatic Purge)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.document_requirements(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1 NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    status document_status DEFAULT 'under_review' NOT NULL,
    rejection_reason TEXT,
    uploaded_by_type TEXT DEFAULT 'client' CHECK (uploaded_by_type IN ('client', 'admin')),
    file_data TEXT,                                       -- Base64 or cloud storage URL
    auto_delete_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'), -- 7-day auto-purge protects 5GB quota
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

-- 10.5 Upload Links Table (Cryptographic Single-Use Client Access)
CREATE TABLE IF NOT EXISTS public.upload_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    token TEXT,
    token_hash TEXT NOT NULL UNIQUE,
    token_prefix TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10.6 Activity Logs Table (Secure Isolated Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    actor_type actor_type NOT NULL,
    actor_id TEXT,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- 11. HIGH-PERFORMANCE INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_better_user_email ON public."user"(email);
CREATE INDEX IF NOT EXISTS idx_better_session_token ON public."session"(token);
CREATE INDEX IF NOT EXISTS idx_better_session_user ON public."session"("userId");
CREATE INDEX IF NOT EXISTS idx_better_account_user ON public."account"("userId");
CREATE INDEX IF NOT EXISTS idx_better_account_provider ON public."account"("providerId", "accountId");
CREATE INDEX IF NOT EXISTS idx_better_verification_lookup ON public."verification"(identifier, value);

CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_codes(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_cases_client ON public.cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_org_status ON public.cases(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_doc_reqs_case ON public.document_requirements(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_req ON public.documents(requirement_id);
CREATE INDEX IF NOT EXISTS idx_documents_case ON public.documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_auto_delete ON public.documents(auto_delete_at);
CREATE INDEX IF NOT EXISTS idx_upload_links_case ON public.upload_links(case_id);
CREATE INDEX IF NOT EXISTS idx_upload_links_hash ON public.upload_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_activity_case ON public.activity_logs(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_org ON public.activity_logs(organization_id, created_at DESC);

-- =====================================================================
-- 12. ROW-LEVEL SECURITY (RLS) FOR MULTI-TENANT ISOLATION
-- Ensures every firm only accesses their own activity, cases, and documents
-- =====================================================================
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Security helper function to get the current tenant organization ID from session settings
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_org_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policies: Organization users can only view and manage records of their own organization.
-- When app.current_org_id is not set, access is denied by default (no permissive NULL bypass).
DO $$ BEGIN
    DROP POLICY IF EXISTS tenant_activity_logs_policy ON public.activity_logs;
    CREATE POLICY tenant_activity_logs_policy ON public.activity_logs
        FOR ALL USING (
            organization_id = current_org_id()
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
    DROP POLICY IF EXISTS tenant_subscriptions_policy ON public.subscriptions;
    CREATE POLICY tenant_subscriptions_policy ON public.subscriptions
        FOR ALL USING (
            organization_id = current_org_id()
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
    DROP POLICY IF EXISTS tenant_organizations_policy ON public.organizations;
    CREATE POLICY tenant_organizations_policy ON public.organizations
        FOR ALL USING (
            id = current_org_id()
        );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =====================================================================
-- 13. AUTOMATED USER PROVISIONING TRIGGER (BETTER AUTH → APP WORKSPACE)
-- When a user signs in with Google or verifies via OTP, automatically
-- provision their organization and 30-day Free Trial subscription.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_better_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    free_plan_id UUID;
    clean_name TEXT;
BEGIN
    -- Sync dual naming columns
    NEW.email_verified := COALESCE(NEW."emailVerified", NEW.email_verified, false);
    NEW."emailVerified" := NEW.email_verified;
    NEW.created_at := COALESCE(NEW."createdAt", NEW.created_at, now());
    NEW."createdAt" := NEW.created_at;
    NEW.updated_at := COALESCE(NEW."updatedAt", NEW.updated_at, now());
    NEW."updatedAt" := NEW.updated_at;

    clean_name := COALESCE(NULLIF(TRIM(NEW.name), ''), split_part(NEW.email, '@', 1));

    -- Check if user already has an app workspace profile
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
        -- Create default organization for new user
        INSERT INTO public.organizations (name, slug)
        VALUES (
            clean_name || ' Firm',
            lower(regexp_replace(clean_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(gen_random_uuid()::text, 1, 6)
        )
        RETURNING id INTO new_org_id;

        -- Create app users record (marked verified if Better Auth says verified)
        INSERT INTO public.users (
            id, organization_id, full_name, email, role, email_verified, last_login_at
        ) VALUES (
            NEW.id, new_org_id, clean_name, NEW.email, 'owner', NEW.email_verified, now()
        );

        -- Fetch free trial plan id
        SELECT id INTO free_plan_id FROM public.plans WHERE name = 'free_trial' LIMIT 1;
        IF free_plan_id IS NOT NULL THEN
            INSERT INTO public.subscriptions (
                organization_id, plan_id, status, trial_ends_at
            ) VALUES (
                new_org_id, free_plan_id, 'trial', (now() + interval '30 days')
            ) ON CONFLICT (organization_id) DO NOTHING;
        END IF;
    ELSE
        -- Update verification status and login timestamp
        UPDATE public.users
        SET email_verified = NEW.email_verified,
            last_login_at = now(),
            updated_at = now()
        WHERE email = NEW.email;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_better_auth_user_created ON public."user";
    CREATE TRIGGER trg_better_auth_user_created
        BEFORE INSERT OR UPDATE ON public."user"
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_better_auth_user_created();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =====================================================================
-- 14. SEED PLANS (SaaS Pricing & Quotas tailored for Neon 5GB limit)
-- =====================================================================
INSERT INTO public.plans (name, display_name, price_monthly, price_yearly, max_clients, max_cases_per_client, max_storage_mb, file_retention_days, max_upload_size_mb, features, sort_order)
VALUES
  ('free_trial', 'Free Trial', 0, 0, 10, 5, 500, 7, 10,
   '["Up to 10 active clients", "1 firm workspace", "Reusable checklists", "Link-based uploads & review", "Limited storage and retention"]'::jsonb, 0),
  ('starter', 'Starter', 399, 3999, 50, 20, 2048, 30, 25,
   '["Up to 50 active clients", "Checklists & reusable templates", "Secure upload links", "Document review & rejection reasons", "Basic activity history"]'::jsonb, 1),
  ('pro', 'Professional', 799, 7999, 200, 50, 5120, 90, 50,
   '["Up to 200 active clients", "Multiple staff accounts & roles", "More reusable checklist templates", "Expanded activity history & storage", "Firm branding & configurable workflows"]'::jsonb, 2),
  ('firm', 'Firm', 1499, 14999, 500, 200, 20480, 180, 100,
   '["Higher client & staff limits (500+)", "Detailed permissions & audit history", "Custom retention settings", "Priority support", "Tailored onboarding"]'::jsonb, 3)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_clients = EXCLUDED.max_clients,
  max_cases_per_client = EXCLUDED.max_cases_per_client,
  max_storage_mb = EXCLUDED.max_storage_mb,
  file_retention_days = EXCLUDED.file_retention_days,
  max_upload_size_mb = EXCLUDED.max_upload_size_mb,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;
