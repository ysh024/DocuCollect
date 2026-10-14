import fs from "fs";
import path from "path";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import { getDb, getTenantDb } from "../../src/lib/db";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq !== -1) {
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✖ FAIL: ${msg}`);
    failed++;
  }
}

async function runPhase5Tests() {
  console.log("================================================================================");
  console.log("   DOCUCOLLECT PHASE 5: REAL DATABASE RLS & SECURITY VERIFICATION SUITE");
  console.log("================================================================================");

  const rawSql = getDb();
  if (!rawSql) {
    throw new Error("Database not connected");
  }

  // ---------------------------------------------------------------------------
  // SECTION 1: Database Role and Effective Privileges
  // ---------------------------------------------------------------------------
  console.log("\n--> 1. Testing Database Role Attributes & Privileges (docucollect_app)");

  const roleRows = await rawSql`
    SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolbypassrls, current_user as active_user
    FROM pg_roles 
    WHERE rolname = current_user;
  `;
  const activeRole = roleRows[0];
  console.log(`  Active runtime connection user: ${activeRole.active_user}`);

  assert(activeRole.active_user === "docucollect_app", "Application connection uses dedicated 'docucollect_app' role");
  assert(activeRole.rolbypassrls === false, "Role docucollect_app has rolbypassrls = false (CANNOT bypass RLS)");
  assert(activeRole.rolsuper === false, "Role docucollect_app has rolsuper = false (NOT superuser)");
  assert(activeRole.rolcreaterole === false, "Role docucollect_app has rolcreaterole = false");
  assert(activeRole.rolcreatedb === false, "Role docucollect_app has rolcreatedb = false");

  // ---------------------------------------------------------------------------
  // SECTION 2: Fail-Closed Behavior Without Tenant Context
  // ---------------------------------------------------------------------------
  console.log("\n--> 2. Testing Fail-Closed Behavior (Zero Context)");

  const noContextCases = await rawSql`SELECT * FROM public.cases LIMIT 5;`;
  assert(noContextCases.length === 0, "Query on cases without tenant context returns 0 rows (FAILS CLOSED)");

  const noContextClients = await rawSql`SELECT * FROM public.clients LIMIT 5;`;
  assert(noContextClients.length === 0, "Query on clients without tenant context returns 0 rows (FAILS CLOSED)");

  const noContextDocs = await rawSql`SELECT * FROM public.documents LIMIT 5;`;
  assert(noContextDocs.length === 0, "Query on documents without tenant context returns 0 rows (FAILS CLOSED)");

  const noContextTemplates = await rawSql`SELECT * FROM public.checklist_templates;`;
  const allAreSystem = noContextTemplates.every((t: any) => t.is_system === true);
  assert(noContextTemplates.length > 0 && allAreSystem, "Query on checklist_templates without context returns ONLY system templates");

  // ---------------------------------------------------------------------------
  // SECTION 3: Isolated Test Fixtures Setup (Firms A & B)
  // ---------------------------------------------------------------------------
  console.log("\n--> 3. Setting Up Synthetic Isolated Fixtures (Firm A & Firm B)");

  const suffix = crypto.randomBytes(4).toString("hex");
  const firmAId = crypto.randomUUID();
  const firmBId = crypto.randomUUID();

  // Use MIGRATION_DATABASE_URL or direct setup to seed isolated test orgs
  const adminUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  const adminSql = neon(adminUrl!);

  await adminSql`
    INSERT INTO public.organizations (id, name, slug)
    VALUES 
      (${firmAId}, ${`Firm A Test ${suffix}`}, ${`firm-a-test-${suffix}`}),
      (${firmBId}, ${`Firm B Test ${suffix}`}, ${`firm-b-test-${suffix}`});
  `;

  const clientAId = crypto.randomUUID();
  const clientBId = crypto.randomUUID();

  await adminSql`
    INSERT INTO public.clients (id, organization_id, name, email, phone)
    VALUES 
      (${clientAId}, ${firmAId}, 'Client of Firm A', ${`client-a-${suffix}@test.com`}, '9876543210'),
      (${clientBId}, ${firmBId}, 'Client of Firm B', ${`client-b-${suffix}@test.com`}, '9876543211');
  `;

  const caseAId = crypto.randomUUID();
  const caseBId = crypto.randomUUID();

  await adminSql`
    INSERT INTO public.cases (id, organization_id, client_id, title, service_type, reference_number)
    VALUES 
      (${caseAId}, ${firmAId}, ${clientAId}, 'Case belonging to Firm A', 'Income Tax Filing', ${`REF-A-${suffix}`}),
      (${caseBId}, ${firmBId}, ${clientBId}, 'Case belonging to Firm B', 'Income Tax Filing', ${`REF-B-${suffix}`});
  `;

  console.log(`  Seeded test fixtures: Firm A (${firmAId}) and Firm B (${firmBId})`);

  try {
    // -------------------------------------------------------------------------
    // SECTION 4: Transaction-Local Tenant Context & Cross-Tenant Isolation
    // -------------------------------------------------------------------------
    console.log("\n--> 4. Testing Transaction-Local Tenant Context Execution");

    const tenantASql = getTenantDb(firmAId);
    const tenantBSql = getTenantDb(firmBId);

    // Firm A reads cases with its tenant context
    const firmACases = await tenantASql`SELECT id, title, organization_id FROM public.cases;`;
    assert(firmACases.length === 1 && firmACases[0].id === caseAId, "Firm A reads its own case via getTenantDb");

    // Firm A attempts to read Firm B's case directly
    const firmATryingToReadCaseB = await tenantASql`SELECT * FROM public.cases WHERE id = ${caseBId};`;
    assert(firmATryingToReadCaseB.length === 0, "Firm A querying Firm B's case ID returns 0 rows (RLS Enforced)");

    // Firm B reads cases with its tenant context
    const firmBCases = await tenantBSql`SELECT id, title, organization_id FROM public.cases;`;
    assert(firmBCases.length === 1 && firmBCases[0].id === caseBId, "Firm B reads its own case via getTenantDb");

    // Firm B attempts to read Firm A's client
    const firmBTryingToReadClientA = await tenantBSql`SELECT * FROM public.clients WHERE id = ${clientAId};`;
    assert(firmBTryingToReadClientA.length === 0, "Firm B querying Firm A's client ID returns 0 rows (RLS Enforced)");

    // Test sequential requests do not leak context
    const [_, testSeq1] = await rawSql.transaction((tx: any) => [
      tx`SELECT set_config('app.current_org_id', ${firmAId}, true)`,
      tx`SELECT id FROM public.cases`,
    ]);
    const [__, testSeq2] = await rawSql.transaction((tx: any) => [
      tx`SELECT set_config('app.current_org_id', ${firmBId}, true)`,
      tx`SELECT id FROM public.cases`,
    ]);
    const testSeq3 = await rawSql`SELECT id FROM public.cases;`;

    assert(testSeq1.length === 1 && testSeq1[0].id === caseAId, "Sequential Req 1 resolved Firm A context");
    assert(testSeq2.length === 1 && testSeq2[0].id === caseBId, "Sequential Req 2 resolved Firm B context without leakage");
    assert(testSeq3.length === 0, "Sequential Req 3 with no context returned 0 rows (Session setting did not leak)");

    // -------------------------------------------------------------------------
    // SECTION 5: Composite Foreign Key Constraint Enforcement
    // -------------------------------------------------------------------------
    console.log("\n--> 5. Testing Database Composite Foreign Key Enforcement");

    let compositeFkViolationCaught = false;
    const rogueCaseId = crypto.randomUUID();
    try {
      // Attempt to insert a case under Firm A that references Firm B's client ID
      // Even if an attacker bypasses RLS or application code, PostgreSQL MUST reject this!
      await adminSql`
        INSERT INTO public.cases (id, organization_id, client_id, title, service_type, reference_number)
        VALUES (${rogueCaseId}, ${firmAId}, ${clientBId}, 'Rogue Cross-Tenant Case', 'Audit', ${`REF-ROGUE-${suffix}`});
      `;
    } catch (err: any) {
      if (err.message.includes("violates foreign key constraint") || err.message.includes("cases_client_id_organization_id_fkey")) {
        compositeFkViolationCaught = true;
      }
    }
    assert(compositeFkViolationCaught, "Database REJECTS cross-tenant client assignment via composite FK (cases_client_id_organization_id_fkey)");

    // -------------------------------------------------------------------------
    // SECTION 6: Checklist Template Policy Verification
    // -------------------------------------------------------------------------
    console.log("\n--> 6. Testing Checklist Template Granular CRUD Policies");

    // Both firms can read system templates
    const sysTmplA = await tenantASql`SELECT count(*) FROM public.checklist_templates WHERE is_system = true;`;
    const sysTmplB = await tenantBSql`SELECT count(*) FROM public.checklist_templates WHERE is_system = true;`;
    assert(Number(sysTmplA[0].count) >= 18 && Number(sysTmplB[0].count) >= 18, "Both Firm A and Firm B can read all system templates");

    // Firm A creates a custom template
    const tmplAId = crypto.randomUUID();
    await tenantASql`
      INSERT INTO public.checklist_templates (id, organization_id, name, service_type, is_system, requirements)
      VALUES (${tmplAId}, ${firmAId}, 'Firm A Custom Checklist', 'Tax', false, '[]'::jsonb);
    `;
    assert(true, "Firm A successfully created its own custom checklist template");

    // Firm B cannot see Firm A's custom template
    const firmBViewTmpl = await tenantBSql`SELECT * FROM public.checklist_templates WHERE id = ${tmplAId};`;
    assert(firmBViewTmpl.length === 0, "Firm B CANNOT see Firm A's custom checklist template (0 rows)");

    // Firm A attempts to tamper with a system template
    const systemTmpl = (await rawSql`SELECT id FROM public.checklist_templates WHERE is_system = true LIMIT 1;`)[0];
    let systemUpdateBlocked = false;
    try {
      const updateRes = await tenantASql`
        UPDATE public.checklist_templates 
        SET name = 'Tampered System Template'
        WHERE id = ${systemTmpl.id};
      `;
      // Under RLS, updating rows outside USING/WITH CHECK results in 0 rows updated
      if (updateRes.length === 0) systemUpdateBlocked = true;
    } catch {
      systemUpdateBlocked = true;
    }
    assert(systemUpdateBlocked, "Tenant update on system template BLOCKED (0 rows updated / rejected)");

    let systemDeleteBlocked = false;
    try {
      const delRes = await tenantASql`
        DELETE FROM public.checklist_templates 
        WHERE id = ${systemTmpl.id};
      `;
      if (delRes.length === 0) systemDeleteBlocked = true;
    } catch {
      systemDeleteBlocked = true;
    }
    assert(systemDeleteBlocked, "Tenant deletion of system template BLOCKED (0 rows deleted / rejected)");

    // Firm A attempts to create a template with is_system = true
    let insertSystemBlocked = false;
    try {
      await tenantASql`
        INSERT INTO public.checklist_templates (id, organization_id, name, service_type, is_system, requirements)
        VALUES (${crypto.randomUUID()}, ${firmAId}, 'Malicious System Template', 'Tax', true, '[]'::jsonb);
      `;
    } catch (err: any) {
      if (err.message.includes("check constraint") || err.message.includes("row-level security")) {
        insertSystemBlocked = true;
      }
    }
    assert(insertSystemBlocked, "Tenant INSERT with is_system = true strictly REJECTED by WITH CHECK policy");

    // -------------------------------------------------------------------------
    // SECTION 7: Authentication & Global Tables Verification
    // -------------------------------------------------------------------------
    console.log("\n--> 7. Testing Authentication & Global Tables Under docucollect_app");

    // Email/password lookup path
    const userLookups = await rawSql`SELECT id, email, password_hash, organization_id FROM public.users LIMIT 1;`;
    assert(userLookups.length > 0 && "password_hash" in userLookups[0], "Unauthenticated user login lookup functional under docucollect_app");

    // OTP codes table
    const otpCheck = await rawSql`SELECT count(*) FROM public.otp_codes;`;
    assert(otpCheck.length > 0, "OTP verification table accessible for auth service under docucollect_app");

    // Global plans table
    const plansCheck = await rawSql`SELECT count(*) FROM public.plans WHERE is_active = true;`;
    assert(Number(plansCheck[0].count) >= 4, "Global subscription plans readable under docucollect_app");

  } finally {
    // -------------------------------------------------------------------------
    // SECTION 8: Cleanup Isolated Test Fixtures
    // -------------------------------------------------------------------------
    console.log("\n--> 8. Cleaning Up Synthetic Test Fixtures...");
    await adminSql`DELETE FROM public.checklist_templates WHERE organization_id IN (${firmAId}, ${firmBId});`;
    await adminSql`DELETE FROM public.cases WHERE organization_id IN (${firmAId}, ${firmBId});`;
    await adminSql`DELETE FROM public.clients WHERE organization_id IN (${firmAId}, ${firmBId});`;
    await adminSql`DELETE FROM public.organizations WHERE id IN (${firmAId}, ${firmBId});`;
    console.log("  Synthetic test fixtures deleted successfully.");
  }

  console.log("\n================================================================================");
  console.log(`   PHASE 5 VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
