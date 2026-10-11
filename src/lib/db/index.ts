import { neon } from "@neondatabase/serverless";

// Configure global HTTP keep-alive dispatcher for Node.js runtime
if (typeof process !== "undefined" && process.versions?.node) {
  try {
    const { Agent, setGlobalDispatcher } = require("undici");
    setGlobalDispatcher(
      new Agent({
        keepAliveTimeout: 60000,
        keepAliveMaxTimeout: 60000,
        pipelining: 1,
        connections: 50,
      })
    );
  } catch {
    // Graceful fallback if undici not directly loaded
  }
}

let cachedSql: any = null;
let cachedUrl: string | null = null;

/**
 * Returns a Neon SQL tagged template executor.
 * Direct endpoint without PgBouncer pooler proxy is used for the Neon HTTP driver
 * to eliminate proxy queuing stalls, cold-start timeouts, and network handshake overhead.
 */
export function getDb() {
  let connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("your-neon-database-url")) {
    return null;
  }

  // Neon HTTP driver (@neondatabase/serverless) queries the internal compute proxy.
  // Using direct compute (stripping -pooler) avoids PgBouncer proxy latency and stalls.
  const directConnectionString = connectionString.replace("-pooler.", ".");

  if (!cachedSql || cachedUrl !== directConnectionString) {
    const baseSql = neon(directConnectionString);

    // Create resilient wrapper with 1-shot retry for transient cold-start / socket wakeups
    const resilientSql = async (strings: TemplateStringsArray, ...values: any[]) => {
      try {
        return await (baseSql as any)(strings, ...values);
      } catch (err: any) {
        const msg = String(err?.message || "");
        const isTransient =
          msg.includes("fetch failed") ||
          msg.includes("ETIMEDOUT") ||
          msg.includes("ECONNRESET") ||
          msg.includes("504") ||
          msg.includes("502") ||
          msg.includes("503");

        if (isTransient) {
          // Retry once after 250ms for cold start recovery
          await new Promise((r) => setTimeout(r, 250));
          return await (baseSql as any)(strings, ...values);
        }
        throw err;
      }
    };

    // Attach raw query property
    (resilientSql as any).query = (baseSql as any).query;

    cachedSql = resilientSql;
    cachedUrl = directConnectionString;
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
    console.warn("Neon database connection not available:", err);
    return false;
  }
}
