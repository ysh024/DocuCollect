-- =============================================================================
-- Migration 001: Composite Unique and Foreign Key Constraints
-- DocuCollect Phase 5 Database Hardening
-- =============================================================================

BEGIN;

-- 1. Ensure composite unique constraint on clients(id, organization_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_clients_id_organization_id' 
          AND conrelid = 'public.clients'::regclass
    ) THEN
        ALTER TABLE public.clients
            ADD CONSTRAINT uq_clients_id_organization_id UNIQUE (id, organization_id);
    END IF;
END $$;

-- 2. Replace cases_client_id_fkey with composite foreign key (client_id, organization_id)
DO $$
BEGIN
    -- Drop old single-column FK if present
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'cases_client_id_fkey' 
          AND conrelid = 'public.cases'::regclass
    ) THEN
        ALTER TABLE public.cases DROP CONSTRAINT cases_client_id_fkey;
    END IF;

    -- Add composite foreign key referencing clients(id, organization_id)
    -- Preserves existing ON DELETE CASCADE semantics
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
END $$;

-- 3. Create covering index for the composite foreign key
CREATE INDEX IF NOT EXISTS idx_cases_client_org ON public.cases (client_id, organization_id);

COMMIT;
