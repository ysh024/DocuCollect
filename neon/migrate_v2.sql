-- =====================================================================
-- MIGRATION: Upgrade DocuCollect to Production SaaS v2
-- Run this against your Neon database
-- =====================================================================

-- 1. Add new enum type for subscriptions
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

-- 2. Create Plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    price_monthly NUMERIC(10,2) DEFAULT 0,
    price_yearly NUMERIC(10,2) DEFAULT 0,
    max_clients INTEGER DEFAULT 10,
    max_cases_per_client INTEGER DEFAULT 5,
    max_storage_mb INTEGER DEFAULT 500,
    file_retention_days INTEGER DEFAULT 7,
    max_upload_size_mb INTEGER DEFAULT 10,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Seed Plans
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
ON CONFLICT (name) DO NOTHING;

-- 4. Create Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status subscription_status DEFAULT 'trial' NOT NULL,
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ,
    payment_method TEXT DEFAULT 'manual',
    payment_notes TEXT,
    activated_by TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create OTP Codes table
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    purpose TEXT DEFAULT 'login' NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Migrate users table: drop password_hash, add phone & email_verified
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- 7. Add indexes
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_codes(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_auto_delete ON public.documents(auto_delete_at);
CREATE INDEX IF NOT EXISTS idx_activity_org ON public.activity_logs(organization_id, created_at DESC);

-- 8. Assign free trial plans to existing organizations
INSERT INTO public.subscriptions (organization_id, plan_id, status, trial_ends_at, current_period_start)
SELECT 
    o.id,
    p.id,
    'trial'::subscription_status,
    timezone('utc'::text, now()) + interval '30 days',
    timezone('utc'::text, now())
FROM public.organizations o
CROSS JOIN public.plans p
WHERE p.name = 'free_trial'
AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.organization_id = o.id
);

-- Done!
SELECT 'Migration v2 complete. Plans seeded, subscriptions assigned, OTP table ready.' AS status;
