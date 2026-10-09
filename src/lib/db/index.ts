import { neon, neonConfig } from "@neondatabase/serverless";


let cachedSql: any = null;
let cachedUrl: string | null = null;

/**
 * Returns a Neon SQL tagged template executor.
 * Connects via DATABASE_URL from .env.local / process.env.
 * Uses a singleton instance to eliminate redundant connection setup overhead.
 */
export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("your-neon-database-url")) {
    return null;
  }
  if (!cachedSql || cachedUrl !== connectionString) {
    cachedSql = neon(connectionString);
    cachedUrl = connectionString;
  }
  return cachedSql;
}

/**
 * Helper to check if Neon connection is configured and live.
 */
export async function isNeonConnected(): Promise<boolean> {
  try {
    const sql = getDb();
    if (!sql) return false;
    const result = await sql`SELECT 1 as connected;`;
    return Boolean(result && result.length > 0);
  } catch (err) {
    console.warn("Neon database connection not available, fallback to in-memory store:", err);
    return false;
  }
}
