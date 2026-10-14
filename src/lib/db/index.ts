import { neon } from "@neondatabase/serverless";

// Configure global HTTP keep-alive dispatcher for Node.js runtime without pipelining
if (typeof process !== "undefined" && process.versions?.node) {
  try {
    const { Agent, setGlobalDispatcher } = require("undici");
    setGlobalDispatcher(
      new Agent({
        keepAliveTimeout: 30000,
        keepAliveMaxTimeout: 30000,
        connect: {
          timeout: 15000,
        },
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

  // Web applications on serverless runtimes use Neon connection pooling (-pooler)
  // to support up to 10,000 concurrent queries without connection exhaustion
  const targetConnectionString = connectionString;

  if (!cachedSql || cachedUrl !== targetConnectionString) {
    const baseSql = neon(targetConnectionString);

    // Create resilient wrapper with exponential backoff retry for transient cold-start / socket wakeups
    const resilientSql = async (strings: TemplateStringsArray, ...values: any[]) => {
      let lastErr: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await (baseSql as any)(strings, ...values);
        } catch (err: any) {
          lastErr = err;
          const msg = (String(err?.message || "") + " " + String(err?.cause?.message || "") + " " + String(err?.cause?.code || "")).toLowerCase();
          const isTransient =
            msg.includes("fetch failed") ||
            msg.includes("etimedout") ||
            msg.includes("econnreset") ||
            msg.includes("connecttimeout") ||
            msg.includes("timeout") ||
            msg.includes("504") ||
            msg.includes("502") ||
            msg.includes("503");

          if (isTransient && attempt < 2) {
            // Neon compute cold-start wake up backoff (400ms, 800ms)
            await new Promise((r) => setTimeout(r, (attempt + 1) * 400));
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    };

    // Attach raw query property
    (resilientSql as any).query = (baseSql as any).query;

    cachedSql = resilientSql;
    cachedUrl = targetConnectionString;
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
