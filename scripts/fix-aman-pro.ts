import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

if (!process.env.ADMIN_DATABASE_URL) {
  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

async function main() {
  const adminSql = neon(process.env.ADMIN_DATABASE_URL!);
  
  // Pro plan ID
  const proPlans = await adminSql`SELECT id FROM public.plans WHERE name = 'pro' LIMIT 1;`;
  const proPlanId = proPlans[0].id;

  const targetOrgs = [
    { email: "amankumarak5933485@gmail.com", orgId: "d4b3bebd-bc97-41f4-b0e7-42ce9d33a136" },
    { email: "amanwriter24@gmail.com", orgId: "cb32f803-5237-4102-9746-967fc30254b9" },
    { email: "yashveer2024@gmail.com", orgId: "62183677-be17-4a24-b14c-c77218e3a7fa" },
  ];

  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  for (const t of targetOrgs) {
    console.log(`Setting Pro Plan for ${t.email} (${t.orgId})...`);
    await adminSql`
      INSERT INTO public.subscriptions (
        organization_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, payment_method, payment_notes, activated_by, updated_at
      ) VALUES (
        ${t.orgId}, ${proPlanId}, 'active', NULL, now(), ${oneYearFromNow}, 'active_subscription', 'Activated Professional Plan (1 Year)', 'system_admin', now()
      )
      ON CONFLICT (organization_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        trial_ends_at = NULL,
        current_period_start = now(),
        current_period_end = EXCLUDED.current_period_end,
        payment_method = 'active_subscription',
        payment_notes = 'Activated Professional Plan (1 Year)',
        activated_by = 'system_admin',
        updated_at = now();
    `;
  }

  console.log("\n=== VERIFYING ALL SUBSCRIPTIONS ===");
  const subs = await adminSql`
    SELECT s.id, u.email, o.name as org_name, p.name as plan_name, p.display_name as plan_display_name, s.status, s.current_period_end
    FROM public.subscriptions s
    JOIN public.organizations o ON s.organization_id = o.id
    JOIN public.users u ON u.organization_id = o.id
    JOIN public.plans p ON s.plan_id = p.id
    ORDER BY s.updated_at DESC;
  `;
  console.log(subs);
}

main().catch(console.error);
