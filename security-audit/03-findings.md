# DocuCollect — Vulnerability Assessment & Findings (Phase 3)

This document details all security findings identified during the adversarial audit of DocuCollect, their severity, root cause, reproduction evidence, and verification status.

---

## Summary of Findings by Severity

| Finding ID | Title | Severity | Category | Status |
|---|---|---|---|---|
| **VULN-01** | Unauthenticated Document Download & Cross-Tenant IDOR | **CRITICAL** | Access Control / IDOR | **REMEDIATED** |
| **VULN-02** | Cross-Tenant Case Access & ZIP Export IDOR | **CRITICAL** | Authorization / IDOR | **REMEDIATED** |
| **VULN-03** | Row-Level Security Permissive `NULL` Bypass | **HIGH** | Database Security | **REMEDIATED** |
| **VULN-04** | Client Upload Portal Token Bypass via Case Ref / Prefix | **HIGH** | Broken Authentication | **REMEDIATED** |
| **VULN-05** | Insecure Hardcoded Admin Secret & Timing Attack Risk | **HIGH** | Cryptography / Auth | **REMEDIATED** |
| **VULN-06** | Predictable OTP Generation via `Math.random()` | **MEDIUM** | Cryptographic Randomness | **REMEDIATED** |
| **VULN-07** | Incomplete Session Invalidation on Logout | **MEDIUM** | Session Management | **REMEDIATED** |
| **VULN-08** | Missing Authentication Rate Limiting | **MEDIUM** | Denial of Service / Abuse | **REMEDIATED** |
| **VULN-09** | Cryptographic Key Fallbacks & Missing Strict Env Enforcement | **MEDIUM** | Key Management | **REMEDIATED** |
| **VULN-10** | Unrestricted Image Hostname Wildcard in Next.js Config | **LOW** | Security Configuration | **REMEDIATED** |
| **VULN-11** | Missing Modern Defensive Security Headers (CSP / HSTS) | **LOW** | Information Disclosure | **REMEDIATED** |

---

## Detailed Findings

### VULN-01: Unauthenticated Document Download & Cross-Tenant IDOR
- **Severity:** **CRITICAL** (CVSS: 9.8)
- **Affected Route:** `src/app/api/download/route.ts`
- **Root Cause:** The download endpoint originally streamed documents directly from storage using only a file path parameter without checking whether the requester was authenticated, whether the document belonged to their firm, or whether a client token matched the document's case.
- **Impact:** Any anonymous user on the internet could download confidential tax documents, ID cards, and bank statements by enumerating or guessing storage paths.
- **Remediation:** Added strict multi-tier authorization:
  1. Unauthenticated requests are immediately denied with HTTP 401.
  2. For authenticated users, `session.organizationId` must match the owning organization in SQL; otherwise HTTP 403 Forbidden is returned.
  3. For client portal visitors, the provided upload token is hashed and verified to match the specific `case_id` of the requested document.

---

### VULN-02: Cross-Tenant Case Access & ZIP Export IDOR
- **Severity:** **CRITICAL** (CVSS: 9.1)
- **Affected Route:** `src/app/actions/portal.ts`, `src/app/api/cases/[id]/download-zip/route.ts`
- **Root Cause:** Case retrieval queries queried cases by ID without filtering by the caller's `organization_id`. Furthermore, the server-side memory cache keyed cases only by `caseId`, allowing Firm B to read Firm A's cached case metadata.
- **Impact:** An authenticated user in Firm B could view or download full ZIP archives of cases belonging to Firm A simply by supplying Firm A's UUID in the URL.
- **Remediation:**
  1. Enforced `WHERE cs.organization_id = ${authOrgId}` in `getCaseDetails`.
  2. Partitioned the server memory cache key to `${authOrgId}:${caseId}`.
  3. Scoped document review and rejection actions strictly to the caller's organization.

---

### VULN-03: Row-Level Security Permissive `NULL` Bypass
- **Severity:** **HIGH** (CVSS: 7.5)
- **Affected File:** `neon/schema.sql`
- **Root Cause:** RLS policies on `cases`, `documents`, and `activity_logs` contained the clause `current_org_id() IS NULL OR organization_id = current_org_id()`. When executed without an explicit tenant context setting, `current_org_id()` evaluated to `NULL`, silently bypassing the policy and returning all records across all tenants.
- **Impact:** Any database query executed without prior tenant context initialization could leak cross-tenant rows.
- **Remediation:** Removed the permissive `IS NULL OR` clause, enforcing fail-closed RLS policies across all tenant-isolated tables.

---

### VULN-04: Client Upload Portal Token Bypass via Case Ref / Prefix
- **Severity:** **HIGH** (CVSS: 8.2)
- **Affected File:** `src/app/actions/portal.ts` (`getPortalCaseByToken`)
- **Root Cause:** The token resolver accepted 8-character token prefixes or 4-digit case reference numbers (e.g. `REF-1001`) as fallbacks if an exact token match failed.
- **Impact:** An attacker could brute-force 4-digit reference numbers to gain unauthorized upload and review access to client cases without possessing the secret cryptographic token.
- **Remediation:**
  1. Removed both prefix and reference number fallbacks completely.
  2. Enforced minimum token length (`cleanToken.length >= 16`).
  3. Added database-level token expiration checks (`expires_at > now()`).

---

### VULN-05: Insecure Hardcoded Admin Secret & Timing Attack Risk
- **Severity:** **HIGH** (CVSS: 7.9)
- **Affected Files:** `src/app/actions/portal.ts`, `src/app/api/admin/action/route.ts`
- **Root Cause:** The admin verification logic permitted a default fallback secret (`"admin123"`) when `ADMIN_SECRET` was unset, and compared secrets using standard string equality (`===`), making it vulnerable to timing attacks.
- **Impact:** Adversaries could gain full administrative access in unconfigured environments or execute timing attacks to extract administrative keys.
- **Remediation:**
  1. Denied admin access if `ADMIN_SECRET` is unset on the server.
  2. Removed legacy fallback `"admin123"`.
  3. Enforced constant-time string comparison via `crypto.timingSafeEqual`.
  4. Added mandatory authorized admin email matching.

---

### VULN-06: Predictable OTP Generation via `Math.random()`
- **Severity:** **MEDIUM** (CVSS: 5.3)
- **Affected File:** `src/lib/auth/index.ts`
- **Root Cause:** One-time verification passwords were generated using JavaScript's pseudorandom `Math.random()`, which is not cryptographically secure and exhibits predictable sequences under PRNG state reconstruction.
- **Impact:** An attacker could potentially predict subsequent OTPs for accounts under registration or login.
- **Remediation:** Switched to `crypto.randomInt(100000, 1000000)` and ensured OTPs are stored exclusively as salted SHA-256 hashes.

---

### VULN-07: Incomplete Session Invalidation on Logout
- **Severity:** **MEDIUM** (CVSS: 6.5)
- **Affected File:** `src/lib/auth/index.ts`
- **Root Cause:** Logout previously only cleared local cookie headers without deleting active Better-Auth database sessions or flushing in-memory user verification caches.
- **Impact:** Replayed session tokens or cached permissions could permit continued access post-logout.
- **Remediation:** Added database-level session deletion (`DELETE FROM public."session"`), set `maxAge: 0` cookies across all domain paths, and flushed user profile memory caches.

---

### VULN-08: Missing Authentication Rate Limiting
- **Severity:** **MEDIUM** (CVSS: 6.5)
- **Affected Files:** `src/lib/rate-limit.ts`, `src/app/actions/auth.ts`
- **Root Cause:** Login, signup, and OTP verification endpoints lacked request throttling, enabling credential stuffing and brute-force attacks against accounts.
- **Impact:** Attackers could attempt hundreds of password or OTP combinations.
- **Remediation:** Implemented an in-memory sliding-window rate limiter with per-email and per-action throttling (10 login attempts per 5 minutes; 5 OTP verification attempts per 10 minutes).

---

### VULN-09: Cryptographic Key Fallbacks & Missing Strict Env Enforcement
- **Severity:** **MEDIUM** (CVSS: 5.8)
- **Affected Files:** `src/lib/auth/index.ts`, `src/lib/storage/crypto.ts`, `src/middleware.ts`
- **Root Cause:** Missing `AUTH_SECRET` or `STORAGE_ENCRYPTION_KEY` silently fell back to insecure default strings in production environments without throwing fatal startup errors.
- **Impact:** An accidentally misconfigured production deployment could encrypt sensitive data or sign JWTs with known public defaults.
- **Remediation:** Added explicit startup guards that throw `FATAL: ... must be configured in production environment` if required secrets are missing.

---

### VULN-10: Unrestricted Image Hostname Wildcard in Next.js Config
- **Severity:** **LOW** (CVSS: 3.7)
- **Affected File:** `next.config.ts`
- **Root Cause:** `remotePatterns` included wildcard `hostname: "**"`, allowing the Next.js image optimizer to proxy and optimize arbitrary third-party URLs.
- **Impact:** Server-side request forgery (SSRF) and image proxy bandwidth amplification abuse.
- **Remediation:** Restricted `remotePatterns` strictly to trusted hosts (`**.neon.tech`, `**.amazonaws.com`, `lh3.googleusercontent.com`).

---

### VULN-11: Missing Modern Defensive Security Headers
- **Severity:** **LOW** (CVSS: 3.1)
- **Affected File:** `src/middleware.ts`
- **Root Cause:** Missing `Strict-Transport-Security` (HSTS) and comprehensive `Content-Security-Policy` (CSP) on responses.
- **Impact:** Increased susceptibility to clickjacking, protocol downgrade attacks, and cross-site content injection.
- **Remediation:** Configured HSTS (`max-age=31536000; includeSubDomains; preload`), CSP with strict resource domains, `X-Frame-Options: SAMEORIGIN`, and `Permissions-Policy`.
