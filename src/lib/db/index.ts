import { neon } from "@neondatabase/serverless";
import { hashToken } from "@/lib/utils";

// Configure global HTTP keep-alive dispatcher for Node.js runtime without pipelining
if (typeof process !== "undefined" && process.versions?.node) {
  try {
    const { Agent, setGlobalDispatcher } = require("undici");
    setGlobalDispatcher(
      new Agent({
        keepAliveTimeout: 4000,
        keepAliveMaxTimeout: 8000,
        connect: {
          timeout: 10000,
        },
      })
    );
  } catch {
    // Graceful fallback if undici not directly loaded
  }
}

let cachedSql: any = null;
let cachedUrl: string | null = null;

function cleanConnectionString(raw?: string | null): string {
  if (!raw) return "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

/**
 * Returns the restricted Neon SQL tagged template executor (docucollect_app).
 * Employs NOBYPASSRLS for defense-in-depth against data leakage.
 */
export function getDb() {
  const rawConnectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  const connectionString = cleanConnectionString(rawConnectionString);
  if (!connectionString || connectionString.includes("your-neon-database-url")) {
    console.warn("⚠️ [NEON DB CONNECTION] process.env.DATABASE_URL is missing or unconfigured!");
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
            msg.includes("enotfound") ||
            msg.includes("eai_again") ||
            msg.includes("connecttimeout") ||
            msg.includes("timeout") ||
            msg.includes("504") ||
            msg.includes("502") ||
            msg.includes("503");

          if (isTransient && attempt < 2) {
            await new Promise((r) => setTimeout(r, (attempt + 1) * 500));
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

let cachedAdminSql: any = null;
let cachedAdminUrl: string | null = null;

/**
 * Returns the unrestricted Neon SQL tagged template executor for system administration.
 * Utilizes ADMIN_DATABASE_URL or MIGRATION_DATABASE_URL (neondb_owner) which has BYPASSRLS
 * privileges to oversee all tenants, organizations, cases, and metrics platform-wide.
 * ONLY call from verified admin functions after verifyAdminAuthorization.
 */
export function getAdminDb() {
  const rawConnectionString =
    process.env.ADMIN_DATABASE_URL ||
    process.env.MIGRATION_DATABASE_URL ||
    process.env.DATABASE_URL_POOLED ||
    process.env.DATABASE_URL;
  const connectionString = cleanConnectionString(rawConnectionString);

  if (!connectionString || connectionString.includes("your-neon-database-url")) {
    console.warn("⚠️ [NEON DB CONNECTION] process.env.DATABASE_URL / ADMIN_DATABASE_URL is missing or unconfigured!");
    return null;
  }

  const targetConnectionString = connectionString;

  if (!cachedAdminSql || cachedAdminUrl !== targetConnectionString) {
    const baseSql = neon(targetConnectionString);

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
            msg.includes("enotfound") ||
            msg.includes("eai_again") ||
            msg.includes("connecttimeout") ||
            msg.includes("timeout") ||
            msg.includes("504") ||
            msg.includes("502") ||
            msg.includes("503");

          if (isTransient && attempt < 2) {
            await new Promise((r) => setTimeout(r, (attempt + 1) * 500));
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    };

    resilientSql.query = (baseSql as any).query;
    resilientSql.transaction = (baseSql as any).transaction;
    resilientSql._rawSql = baseSql;

    cachedAdminSql = resilientSql;
    cachedAdminUrl = targetConnectionString;
  }

  return cachedAdminSql;
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
    let lastErr: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [_, result] = await rawSql.transaction((tx: any) => [
          tx`SELECT set_config('app.current_org_id', ${validOrgId}, true)`,
          tx(strings, ...values),
        ]);
        return result;
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
          msg.includes("enotfound") ||
          msg.includes("eai_again") ||
          msg.includes("connecttimeout") ||
          msg.includes("timeout") ||
          msg.includes("504") ||
          msg.includes("502") ||
          msg.includes("503");

        if (isTransient && attempt < 2) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 500));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }) as TenantSqlExecutor;

  tenantSql.transaction = async (fn: (tx: any) => any[]) => {
    let lastErr: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [_, ...results] = await rawSql.transaction((tx: any) => [
          tx`SELECT set_config('app.current_org_id', ${validOrgId}, true)`,
          ...fn(tx),
        ]);
        return results;
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
          msg.includes("enotfound") ||
          msg.includes("eai_again") ||
          msg.includes("connecttimeout") ||
          msg.includes("timeout") ||
          msg.includes("504") ||
          msg.includes("502") ||
          msg.includes("503");

        if (isTransient && attempt < 2) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 500));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  };

  return tenantSql;
}

export async function resolvePublicUploadLink(token: string): Promise<{ case_id: string; organization_id: string } | null> {
  const cleanToken = (token || "").trim();
  if (!cleanToken || cleanToken.length < 16) {
    return null;
  }

  const db = getAdminDb() || getDb();
  if (!db) return null;

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
  } catch (err) {
    console.error("resolvePublicUploadLink query error:", err);
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
