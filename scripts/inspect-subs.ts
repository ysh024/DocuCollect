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
  const keys = await adminSql`SELECT * FROM public.license_keys;`;
  console.log("=== ALL LICENSE KEYS ===");
  console.log(keys);
}

main().catch(console.error);
