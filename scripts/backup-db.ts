import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

function getDatabaseUrl(): string {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/DATABASE_URL=(.*)/);
  if (!match) throw new Error("No DATABASE_URL in .env.local");
  let url = match[1].trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  return url;
}

async function createBackup() {
  const dbUrl = getDatabaseUrl();
  const urlObj = new URL(dbUrl);
  console.log("=== TARGET DATABASE IDENTITY ===");
  console.log("Host:", urlObj.hostname);
  console.log("Database:", urlObj.pathname.slice(1));
  console.log("User:", urlObj.username);

  const sql = neon(dbUrl);

  // 1. Get all public tables
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `;
  const tableNames = tables.map((t: any) => t.tablename);
  console.log(`Found ${tableNames.length} tables in public schema.`);

  const backupData: Record<string, any[]> = {};
  const backupStats: Record<string, number> = {};

  for (const t of tableNames) {
    // Escape table name properly for Postgres
    const rows = await sql.query(`SELECT * FROM public."${t}"`);
    backupData[t] = rows;
    backupStats[t] = rows.length;
    console.log(`- Backed up ${t}: ${rows.length} rows`);
  }

  // 2. Backup schema DDL metadata (indexes, constraints, policies)
  const policies = await sql`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
  `;

  const constraints = await sql`
    SELECT conname, conrelid::regclass::text as table_name, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY table_name, conname;
  `;

  const roles = await sql`
    SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls
    FROM pg_roles WHERE rolname NOT LIKE 'pg_%';
  `;

  const backup = {
    timestamp: new Date().toISOString(),
    host: urlObj.hostname,
    database: urlObj.pathname.slice(1),
    tableCounts: backupStats,
    data: backupData,
    policies,
    constraints,
    roles,
  };

  const backupDir = path.join(process.cwd(), "neon", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, "pre-phase5-backup.json");
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`\n[SUCCESS] Backup successfully written to ${backupPath}`);
  console.log("Backup file size:", (fs.statSync(backupPath).size / 1024).toFixed(2), "KB");
}

createBackup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
