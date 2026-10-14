# Running DocuCollect Security Test Suites

This document provides exact commands to run all automated adversarial penetration tests and regression verification suites.

---

## 1. Prerequisites

Ensure dependencies are installed and Node.js is present:
```bash
npm install
```

---

## 2. Execute Automated Adversarial Penetration Suite (28 Tests)

Runs the comprehensive adversarial lab covering authentication bypass, cross-tenant IDOR, token brute force, storage encryption, and admin security:

```bash
npx tsx security-audit/tests/adversarial-suite.ts
```

**Expected Output:**
```text
================================================================================
   DocuCollect Adversarial Penetration Testing & Security Verification Lab
================================================================================
...
================================================================================
   Test Results Summary: 28 PASSED | 0 FAILED | 0 BLOCKED
================================================================================
```

---

## 3. Execute Remediation & Regression Suite (44 Tests)

Runs the complete 10-vulnerability regression verification suite:

```bash
npx tsx scripts/test-security.ts
```

**Expected Output:**
```text
=======================================================
   DocuCollect Security Fixes Verification Suite
=======================================================
...
=======================================================
Results: 44 PASSED, 0 FAILED
=======================================================
```

---

## 4. Run TypeScript Compilation Check

Verifies full type safety with zero type errors:

```bash
npx tsc --noEmit
```

---

## 5. Run Full Production Build

Tests full static analysis, routing compilation, and bundle optimization across all 28 application routes:

```bash
npm run build
```

---

## 6. Interpreting Test Results

- **`✔ PASS`**: The security control is active, behavioral assertions passed, and unauthorized access was successfully blocked.
- **`✖ FAIL`**: An assertion failed or unauthorized data was returned. Investigate the reported file and line.
- **`BLOCKED`**: The test could not execute due to environment or network constraints.
