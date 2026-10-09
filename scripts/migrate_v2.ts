import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  console.log("🔌 Connecting to Neon...");
  const sql = neon(connectionString);

  // Test connection
  const test = await sql`SELECT version() as v`;
  console.log("✅ Connected:", test[0].v.split(" ").slice(0, 2).join(" "));

  console.log("\n📊 Running migration v2...\n");

  // Step 1: Add subscription_status enum
  try {
    await sql`
      DO $$ BEGIN
        CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✅ subscription_status enum created");
  } catch (e: any) { console.log("⚠️  subscription_status:", e.message); }

  // Step 2: Create plans table
  try {
    await sql`
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
    `;
    console.log("✅ plans table created");
  } catch (e: any) { console.log("⚠️  plans:", e.message); }

  // Step 3: Seed plans
  try {
    await sql`
      INSERT INTO public.plans (name, display_name, price_monthly, price_yearly, max_clients, max_cases_per_client, max_storage_mb, file_retention_days, max_upload_size_mb, features, sort_order)
      VALUES
        ('free_trial', 'Free Trial', 0, 0, 10, 5, 500, 7, 10,
         '["Up to 10 clients", "5 cases per client", "7-day file retention", "WhatsApp sharing", "Email OTP login", "30-day free trial"]'::jsonb, 0),
        ('starter', 'Starter', 499, 4999, 25, 20, 2048, 30, 25,
         '["Up to 25 clients", "20 cases per client", "30-day file retention", "WhatsApp sharing", "Priority support", "Custom branding"]'::jsonb, 1),
        ('pro', 'Professional', 999, 9999, 100, 100, 5120, 90, 50,
         '["Unlimited clients", "Unlimited cases", "90-day file retention", "Custom domain", "API access", "Dedicated support", "Team members"]'::jsonb, 2)
      ON CONFLICT (name) DO NOTHING;
    `;
    const plans = await sql`SELECT name, display_name, price_monthly FROM public.plans ORDER BY sort_order;`;
    console.log("✅ plans seeded:", plans.map((p: any) => p.display_name).join(", "));
  } catch (e: any) { console.log("⚠️  seed plans:", e.message); }

  // Step 4: Create subscriptions table
  try {
    await sql`
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
    `;
    console.log("✅ subscriptions table created");
  } catch (e: any) { console.log("⚠️  subscriptions:", e.message); }

  // Step 5: Create OTP codes table
  try {
    await sql`
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
    `;
    console.log("✅ otp_codes table created");
  } catch (e: any) { console.log("⚠️  otp_codes:", e.message); }

  // Step 6: Migrate users table - drop password_hash, add new columns
  try {
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;`;
    console.log("✅ users.phone column added");
  } catch (e: any) { console.log("⚠️  phone:", e.message); }

  try {
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;`;
    console.log("✅ users.email_verified column added");
  } catch (e: any) { console.log("⚠️  email_verified:", e.message); }

  try {
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`;
    console.log("✅ users.last_login_at column added");
  } catch (e: any) { console.log("⚠️  last_login_at:", e.message); }

  try {
    await sql`ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;`;
    console.log("✅ users.password_hash removed");
  } catch (e: any) { console.log("⚠️  drop password_hash:", e.message); }

  // Step 7: Add indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_codes(email, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.otp_codes(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_auto_delete ON public.documents(auto_delete_at)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_org ON public.activity_logs(organization_id, created_at DESC)`,
  ];

  for (const idx of indexes) {
    try {
      await sql.unsafe(idx);
    } catch (e: any) { /* index might exist */ }
  }
  console.log("✅ indexes created");

  // Step 8: Assign free trial to existing orgs
  try {
    const freePlan = await sql`SELECT id FROM public.plans WHERE name = 'free_trial' LIMIT 1;`;
    if (freePlan.length > 0) {
      const planId = freePlan[0].id;
      const orgs = await sql`SELECT id FROM public.organizations;`;
      let assigned = 0;
      for (const org of orgs) {
        const existing = await sql`SELECT id FROM public.subscriptions WHERE organization_id = ${org.id} LIMIT 1;`;
        if (existing.length === 0) {
          await sql`
            INSERT INTO public.subscriptions (organization_id, plan_id, status, trial_ends_at)
            VALUES (${org.id}, ${planId}, 'trial', (now() + interval '30 days'));
          `;
          assigned++;
        }
      }
      console.log(`✅ Free trial assigned to ${assigned} organization(s)`);
    }
  } catch (e: any) { console.log("⚠️  assign trials:", e.message); }

  // Summary
  const tableCheck = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log("\n📋 Current tables:", tableCheck.map((t: any) => t.table_name).join(", "));
  console.log("\n🎉 Migration v2 complete!");
}

runMigration().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
