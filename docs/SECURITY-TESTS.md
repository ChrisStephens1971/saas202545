# Security Test Suite

**Last Updated:** 2025-12-05

---

## Overview

The Elder-First Church Platform includes an automated security test suite that validates critical security controls. These tests cover authentication, role-based access control (RBAC), CSRF protection, SQL injection prevention, Row-Level Security (RLS), bulletin access rules, and tenant isolation.

The suite runs as part of CI on every push and pull request, ensuring security regressions are caught before merge.

---

## How to Run

From the repo root:

```bash
npm run test:security
```

This delegates to the `@elder-first/api` workspace and uses Jest with the pattern `security.test.ts$`.

**Expected output:** 75 passing tests across 3 suites (~8 seconds).

---

## What It Covers

| Suite | Tests | Focus Areas |
|-------|-------|-------------|
| `security.test.ts` | 27 | Auth, RBAC, error handling, CSRF |
| `db.security.test.ts` | 9 | SQL injection prevention, RLS |
| `bulletinGenerator.security.test.ts` | 39 | Role-based access, tenant isolation, locked bulletins |

### Suite Details

- **security.test.ts** — Validates platform role authorization (platform_admin vs tenant roles), error sanitization in production (no stack traces leaked), error ID generation, and CSRF protection via Bearer token authentication model.

- **db.security.test.ts** — Tests SQL injection prevention in tenant context setting, verifies parameterized queries block injection attempts, and confirms RLS behavior with safe queries.

- **bulletinGenerator.security.test.ts** — Comprehensive RBAC tests for bulletin generator endpoints (getGeneratorPayload, saveGeneratorPayload, generateFromService, etc.), tenant isolation enforcement, public endpoint security (requires both `is_public` AND `is_published`), locked bulletin protection, and input validation.

---

## Where Tests Live

```
apps/api/src/__tests__/
├── security.test.ts                    # Auth, RBAC, error handling, CSRF
├── db.security.test.ts                 # SQL injection, RLS
└── bulletinGenerator.security.test.ts  # Bulletin access, tenant isolation
```

There is also a related test for the security logger:

```
apps/api/src/logging/__tests__/
└── securityLogger.test.ts              # Security event logging
```

---

## CI Integration

GitHub Actions runs `npm run test:security` on every push and pull request as part of the main CI pipeline.

**Workflow:** `.github/workflows/ci.yml`
**Job:** `security-tests`
**Runtime:** ~8 seconds
**Gating:** Yes — security test failures block the build.

The security tests job runs after lint/typecheck and before the final build, ensuring security controls are validated on every PR.

---

## Related Documentation

- [SECURITY-STATUS.md](SECURITY-STATUS.md) — Current security posture and remediation status
- [SECURITY-AUDIT-2025-12-04.md](SECURITY-AUDIT-2025-12-04.md) — Full audit findings
- [SECURITY-REVIEW-SUMMARY.md](SECURITY-REVIEW-SUMMARY.md) — Review summary with resolution notes
- [SECURITY-OPERATIONS-RUNBOOK.md](SECURITY-OPERATIONS-RUNBOOK.md) — Incident response procedures
