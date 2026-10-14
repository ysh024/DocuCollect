import { neon } from "@neondatabase/serverless";
import { hashToken } from "@/lib/tokens";

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
 * Returns the restricted Neon SQL tagged template executor (docucollect_app).
 * Employs NOBYPASSRLS for defense-in-depth against data leakage.
 */
export function getDb() {
  const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("your-neon-database-url")) {
    return null;
  }

  const targetConnectionString = connectionString;

  if (!cachedSql || cachedUrl !== targetConnectionString) {
    const baseSql = neon(targetConnectionString);

    // Create resilient wrapper with exponential backoff retry for transient cold-start / socket wakeups
    const resilientSql: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      let lastErr: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await (baseSql as any)(strings, ...values);
        } catch (err: any) {
          lastErr = err;
          const msg = (
            String(err?.message || "") +
            " " +
            String(err?.cause?.message || "") +
            " " +
            String(err?.cause?.code || "")
          ).toLowerCase();
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
            await new Promise((r) => setTimeout(r, (attempt + 1) * 400));
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    };

    // Attach raw query, transaction, and raw driver references
    resilientSql.query = (baseSql as any).query;
    resilientSql.transaction = (baseSql as any).transaction;
    resilientSql._rawSql = baseSql;

    cachedSql = resilientSql;
    cachedUrl = targetConnectionString;
  }

  return cachedSql;
}

export type TenantSqlExecutor = {
  (strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
  transaction: (fn: (tx: any) => any[]) => Promise<any[]>;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns a tenant-scoped SQL executor that establishes transaction-local tenant context
 * (app.current_org_id) inside the same atomic request/transaction.
 * Fails closed if the organization ID is missing, malformed, or invalid.
 */
export function getTenantDb(orgId: string): TenantSqlExecutor {
  if (!orgId || typeof orgId !== "string" || !UUID_REGEX.test(orgId.trim())) {
    throw new Error("Security Violation: Missing or invalid organization ID for tenant database access");
  }

  const validOrgId = orgId.trim();
  const db = getDb();
  if (!db) {
    throw new Error("Database connection not configured");
  }

  const rawSql = db._rawSql || db;

  const tenantSql = (async (strings: TemplateStringsArray, ...values: any[]) => {
    const [_, result] = await rawSql.transaction((tx: any) => [
      tx`SELECT set_config('app.current_org_id', ${validOrgId}, true)`,
      tx(strings, ...values),
    ]);
    return result;
  }) as TenantSqlExecutor;

  tenantSql.transaction = async (fn: (tx: any) => any[]) => {
    const [_, ...results] = await rawSql.transaction((tx: any) => [
      tx`SELECT set_config('app.current_org_id', ${validOrgId}, true)`,
      ...fn(tx),
    ]);
    return results;
  };

  return tenantSql;
}

export async function resolvePublicUploadLink(token: string): Promise<{ case_id: string; organization_id: string } | null> {
  const cleanToken = (token || "").trim();
  if (!cleanToken || cleanToken.length < 16) {
    return null;
  }

  const db = getDb();
  if (!db) return null;

  try {
    const rows = await db`
      SELECT case_id, organization_id
      FROM public.resolve_upload_link_for_public(${cleanToken})
      LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      return rows[0] as { case_id: string; organization_id: string };
    }
  } catch {
    // Fallback is intentionally narrow: exact token/hash match only with a revoked/expiry check.
  }

  try {
    const tokenHash = hashToken(cleanToken);
    const rows = await db`
      SELECT case_id, organization_id
      FROM public.upload_links
      WHERE (token = ${cleanToken} OR token_hash = ${tokenHash})
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      return rows[0] as { case_id: string; organization_id: string };
    }
  } catch {
    // A missing/invalid public-token function or a blocked unauthenticated lookup must fail closed.
  }

  return null;
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
