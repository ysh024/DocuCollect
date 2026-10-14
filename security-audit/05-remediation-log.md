# DocuCollect — Remediation Log (Phase 5)

This log records every code modification, architectural hardening, and security control implemented to resolve confirmed vulnerabilities in DocuCollect.

---

## Remediation Details by Component

### 1. Universal Document Download (`src/app/api/download/route.ts`)
- **Vulnerabilities Addressed:** VULN-01 (Unauthenticated Download), VULN-02 (Cross-Tenant Download)
- **Modifications:**
  - Added session resolution check via `getSession()`.
  - Added immediate 401 Unauthorized rejection if neither a session nor an upload token is provided.
  - Added SQL join (`cases c ON c.id = d.case_id`) to retrieve the owning `organization_id` for every document.
  - Added tenant verification: if `session.organizationId !== docRecord.organization_id`, return HTTP 403 Forbidden.
  - Added token scoping: for client portal users, verified the provided token's `case_id` matches the document's `case_id`; otherwise return HTTP 403.
  - Added defensive security headers to streamed responses: `Cache-Control: private, no-cache, no-store`, `X-Content-Type-Options: nosniff`.
- **Regression Tests:** `AUTH-01`, `IDOR-03`, `TOKEN-05`, `scripts/test-security.ts:Lines 35-60`.

---

### 2. Portal Server Actions (`src/app/actions/portal.ts`)
- **Vulnerabilities Addressed:** VULN-02 (Cross-Tenant Case IDOR), VULN-04 (Token Bypass), VULN-05 (Admin Secret Fallback)
- **Modifications:**
  - Enforced `WHERE cs.organization_id = ${authOrgId}` across `getCaseDetails` SQL queries.
  - Partitioned the server memory cache key using `const cacheKey = `${authOrgId}:${caseId}`;`.
  - Scoped document review (`reviewDocumentAction`) and upload link generation (`generateUploadLinkAction`) to verify ownership against the caller's organization.
  - Completely removed 8-character `token_prefix` and 4-digit `reference_number` fallback queries in `getPortalCaseByToken`.
  - Added minimum token length assertion (`cleanToken.length >= 16`).
  - Added database token expiration filter: `AND (expires_at IS NULL OR expires_at > now())`.
  - In `verifyAdminAuthorization`: removed `"admin123"` fallback, enforced `timingSafeEqual`, and validated `adminEmail`.
- **Regression Tests:** `IDOR-01`, `IDOR-02`, `IDOR-04`, `TOKEN-01`, `TOKEN-02`, `TOKEN-03`, `ADMIN-01`, `ADMIN-02`.

---

### 3. Database Schema & RLS Policies (`neon/schema.sql`)
- **Vulnerabilities Addressed:** VULN-03 (RLS Permissive NULL Bypass)
- **Modifications:**
  - Removed all occurrences of `current_org_id() IS NULL OR` across table policies.
  - Enforced strict fail-closed policies on `cases`, `documents`, and `activity_logs`.
- **Regression Tests:** `RLS-01`, `RLS-02`, `scripts/test-security.ts:Lines 87-102`.

---

### 4. Storage & Document Cryptography (`src/lib/storage/crypto.ts`)
- **Vulnerabilities Addressed:** VULN-09 (Cryptographic Key Fallbacks)
- **Modifications:**
  - Implemented AES-256-GCM envelope encryption with `DOCUENC1` 8-byte magic header.
  - Added authentication tag verification (16-byte GCM tag appended to ciphertext) to guarantee tamper resistance.
  - Added strict production environment guard throwing `FATAL: STORAGE_ENCRYPTION_KEY or AUTH_SECRET must be configured in production environment` when keys are missing.
- **Regression Tests:** `CRYPTO-01`, `CRYPTO-02`, `CRYPTO-03`, `CRYPTO-04`.

---

### 5. Authentication, Sessions & Rate Limiting (`src/lib/auth/index.ts`, `src/lib/rate-limit.ts`, `src/app/actions/auth.ts`)
- **Vulnerabilities Addressed:** VULN-06 (Predictable OTP), VULN-07 (Session Invalidation), VULN-08 (Rate Limiting)
- **Modifications:**
  - Replaced `Math.random()` with `crypto.randomInt(100000, 1000000)` for all OTP generation.
  - Stored OTPs strictly as SHA-256 hashes in `public.otp_codes`.
  - Hardened `logoutUser`: added deletion of Better-Auth sessions, issued expired `maxAge: 0` cookies, and cleared user profile cache.
  - Implemented in-memory sliding window rate limiter in `src/lib/rate-limit.ts`.
  - Wired rate limits into `loginWithPasswordAction` (10 per 5 min), `initiateSignupAction` (5 per 15 min), and `verifyLoginOtpAction` (5 per 10 min).
  - Improved `verifyPasswordSecurely` to seamlessly fall back to bcrypt when verifying historical hashes.
- **Regression Tests:** `AUTH-02`, `AUTH-03`, `RATE-01`, `RATE-02`.

---

### 6. Edge Middleware & Security Headers (`src/middleware.ts`)
- **Vulnerabilities Addressed:** VULN-09 (Production Secret Guard), VULN-11 (Defensive Headers)
- **Modifications:**
  - Added startup guard throwing `FATAL: AUTH_SECRET must be configured in production environment`.
  - Injected modern defensive response headers:
    - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
    - `Content-Security-Policy: default-src 'self' ...`
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: SAMEORIGIN`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Regression Tests:** `INFO-01`, `scripts/test-security.ts:Lines 267-275`.

---

### 7. Next.js Configuration (`next.config.ts`)
- **Vulnerabilities Addressed:** VULN-10 (Remote Image Hostname Wildcard)
- **Modifications:**
  - Removed `hostname: "**"`.
  - Explicitly whitelisted trusted image origins: `**.neon.tech`, `**.amazonaws.com`, and `lh3.googleusercontent.com`.
- **Regression Tests:** `INFO-02`, `scripts/test-security.ts:Lines 293-306`.
