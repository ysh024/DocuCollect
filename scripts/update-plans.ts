import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env.local if not already in process.env
if (!process.env.DATABASE_URL) {
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

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL not found");
    process.exit(1);
  }

  const sql = neon(connectionString);

  console.log("Updating plans in database...");

  // Update Free Trial
  await sql`
    UPDATE public.plans
    SET 
      max_storage_mb = 500,
      file_retention_days = 14,
      features = ${JSON.stringify([
        "Up to 10 active clients",
        "500 MB encrypted cloud storage",
        "Zero-Knowledge AES-256-GCM",
        "14-day practice audit trail",
        "Max 5 custom templates",
        "Max 5 cases per client",
        "Reusable document checklists"
      ])}::jsonb
    WHERE name = 'free_trial';
  `;

  // Update Starter
  await sql`
    UPDATE public.plans
    SET 
      max_storage_mb = 2048,
      file_retention_days = 30,
      features = ${JSON.stringify([
        "Up to 50 active clients",
        "2 GB encrypted cloud storage",
        "Zero-Knowledge AES-256-GCM",
        "30-day practice audit trail",
        "Max 5 custom templates",
        "Max 10 cases per client",
        "Client Excel export",
        "Delete clients & cases",
        "WhatsApp & link sharing"
      ])}::jsonb
    WHERE name = 'starter';
  `;

  // Update Professional
  await sql`
    UPDATE public.plans
    SET 
      max_storage_mb = 5120,
      file_retention_days = 45,
      features = ${JSON.stringify([
        "Up to 200 active clients",
        "5 GB encrypted cloud storage",
        "Zero-Knowledge AES-256-GCM",
        "45-day practice audit trail",
        "Max 10 custom templates",
        "Max 25 cases per client",
        "Client Excel export",
        "Delete clients & cases",
        "Multi-staff & firm branding",
        "Priority support"
      ])}::jsonb
    WHERE name = 'pro';
  `;

  // Update Firm (Upcoming / Not Available Right Now Tier)
  await sql`
    UPDATE public.plans
    SET 
      is_active = true,
      max_storage_mb = 20480,
      file_retention_days = 60,
      features = ${JSON.stringify([
        "500+ active clients (Upcoming)",
        "20 GB+ custom storage",
        "Zero-Knowledge AES-256-GCM",
        "60-day audit trail (Max 2 Months)",
        "Max 25 custom templates",
        "Max 50 cases per client",
        "Advanced staff & RBAC",
        "Upcoming Tier (Not Available Right Now)"
      ])}::jsonb
    WHERE name = 'firm';
  `;

  console.log("✅ Plans updated successfully in public.plans!");
  const updated = await sql`SELECT name, display_name, is_active, max_storage_mb, file_retention_days, features FROM public.plans ORDER BY sort_order;`;
  console.log(JSON.stringify(updated, null, 2));
}

run().catch((e) => {
  console.error("Error updating plans:", e);
  process.exit(1);
});
