/**
 * DocuCollect Controlled Attack Lab & Synthetic Multi-Tenant Fixtures
 * 
 * Defines synthetic, non-destructive test fixtures for adversarial testing:
 * - Organization A & Organization B
 * - User A & User B
 * - Administrator Account
 * - Case A & Case B with dummy documents
 * - Valid, expired, revoked, and cross-case upload tokens
 * - Automated assertion helpers for tenant boundary validation
 */

import crypto from "crypto";

export interface SyntheticOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface SyntheticUser {
  id: string;
  organizationId: string;
  email: string;
  role: "owner" | "admin" | "staff";
}

export interface SyntheticCase {
  id: string;
  organizationId: string;
  clientId: string;
  title: string;
  referenceNumber: string;
}

export interface SyntheticDocument {
  id: string;
  caseId: string;
  organizationId: string;
  fileName: string;
  storagePath: string;
  isEncrypted: boolean;
  contentMarker: string;
}

export interface SyntheticUploadToken {
  token: string;
  tokenHash: string;
  caseId: string;
  expiresAt: Date;
  isRevoked: boolean;
}

export class ControlledAttackLab {
  // Test Fixtures
  public readonly orgA: SyntheticOrganization = {
    id: "org-synthetic-alpha-001",
    name: "Alpha Legal Advisory Firm [TEST]",
    slug: "alpha-legal-test-001",
  };

  public readonly orgB: SyntheticOrganization = {
    id: "org-synthetic-beta-002",
    name: "Beta Chartered Accountants [TEST]",
    slug: "beta-ca-test-002",
  };

  public readonly userA: SyntheticUser = {
    id: "user-synthetic-alpha-101",
    organizationId: "org-synthetic-alpha-001",
    email: "advisor.alpha@synthetic-test.local",
    role: "owner",
  };

  public readonly userB: SyntheticUser = {
    id: "user-synthetic-beta-202",
    organizationId: "org-synthetic-beta-002",
    email: "advisor.beta@synthetic-test.local",
    role: "owner",
  };

  public readonly adminUser: SyntheticUser = {
    id: "user-synthetic-admin-999",
    organizationId: "org-synthetic-alpha-001",
    email: "super.admin@synthetic-test.local",
    role: "admin",
  };

  public readonly caseA: SyntheticCase = {
    id: "case-synthetic-aaa-111",
    organizationId: "org-synthetic-alpha-001",
    clientId: "client-synthetic-c1",
    title: "FY25 Tax Filing - Alpha Client [TEST]",
    referenceNumber: "REF-ALPHA-9090",
  };

  public readonly caseB: SyntheticCase = {
    id: "case-synthetic-bbb-222",
    organizationId: "org-synthetic-beta-002",
    clientId: "client-synthetic-c2",
    title: "GST Audit - Beta Client [TEST]",
    referenceNumber: "REF-BETA-8080",
  };

  public readonly docA1: SyntheticDocument = {
    id: "doc-synthetic-aaa-d1",
    caseId: "case-synthetic-aaa-111",
    organizationId: "org-synthetic-alpha-001",
    fileName: "alpha_audit_report.pdf",
    storagePath: "synthetic/org-alpha/alpha_audit_report.pdf",
    isEncrypted: true,
    contentMarker: "SYNTHETIC_MARKER_ALPHA_TOP_SECRET",
  };

  public readonly docB1: SyntheticDocument = {
    id: "doc-synthetic-bbb-d2",
    caseId: "case-synthetic-bbb-222",
    organizationId: "org-synthetic-beta-002",
    fileName: "beta_balance_sheet.pdf",
    storagePath: "synthetic/org-beta/beta_balance_sheet.pdf",
    isEncrypted: true,
    contentMarker: "SYNTHETIC_MARKER_BETA_CONFIDENTIAL",
  };

  // Upload Tokens
  public generateTokenFixture(caseId: string, options?: { expired?: boolean; revoked?: boolean }): SyntheticUploadToken {
    const rawToken = "dcollect_" + crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = options?.expired
      ? new Date(Date.now() - 3600 * 1000) // 1 hour ago
      : new Date(Date.now() + 86400 * 1000 * 7); // 7 days future

    return {
      token: rawToken,
      tokenHash,
      caseId,
      expiresAt,
      isRevoked: Boolean(options?.revoked),
    };
  }

  // Multi-Tenant Isolation Assertion Helper
  public assertTenantAccess(
    callerOrgId: string,
    resourceOrgId: string,
    operationName: string
  ): { allowed: boolean; reason: string } {
    if (callerOrgId !== resourceOrgId) {
      return {
        allowed: false,
        reason: `DENIED: Tenant '${callerOrgId}' attempted unauthorized ${operationName} on resource owned by '${resourceOrgId}'.`,
      };
    }
    return {
      allowed: true,
      reason: `GRANTED: Tenant '${callerOrgId}' is authorized for intra-tenant operation ${operationName}.`,
    };
  }

  // Token Scope Assertion Helper
  public assertTokenScope(
    token: SyntheticUploadToken,
    targetCaseId: string
  ): { valid: boolean; reason: string } {
    if (token.isRevoked) {
      return { valid: false, reason: "DENIED: Upload token has been revoked." };
    }
    if (token.expiresAt.getTime() < Date.now()) {
      return { valid: false, reason: "DENIED: Upload token is expired." };
    }
    if (token.caseId !== targetCaseId) {
      return { valid: false, reason: "DENIED: Token case scope mismatch (Cross-case token access blocked)." };
    }
    return { valid: true, reason: "GRANTED: Token is valid and scoped to target case." };
  }
}
