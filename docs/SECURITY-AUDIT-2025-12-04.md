# Security Audit Report — Elder-First Church Platform

**Date:** 2025-12-04
**Scope:** Monorepo (API, Web, Database, Infrastructure, CI/CD)
**Type:** Static security review (code + configuration)
**Prepared for:** Elder-First Church Platform owners and maintainers

---

## 1. Executive Summary

A comprehensive security review of the Elder-First Church Platform identified **40+ security issues** across:

- Authentication and session management
- Authorization and tenant isolation
- API design and input validation
- Database access and multi-tenant enforcement
- Infrastructure and configuration (Docker, environment, SSL)
- CI/CD pipelines and operational practices

Findings were categorized as:

- **Critical:** 8 issues — immediate risk to tenant isolation, financial data, or system compromise.
- **High:** 12 issues — significant weaknesses in authentication, authorization, and infrastructure.
- **Medium:** 15 issues — misconfigurations and missing hardening controls that increase attack surface.
- **Low:** 5+ issues — weaker practices and missing documentation that undermine security posture over time.

The most severe risks center around:

- **SQL injection in tenant context setting** and dynamic SQL paths.
- **Hard-coded development credentials and weak JWT secrets.**
- **Missing rate limiting and insufficient authorization checks** (especially for donations and admin AI usage).
- **Cross-tenant access risks** for platform-level admin functions.

The platform also has **meaningful strengths**:

- Use of **row-level security (RLS)** for multi-tenancy.
- Broad use of **parameterized queries** in the API layer.
- Widespread use of **Zod validation** for request payloads.

If the critical and high-severity issues are addressed according to the remediation roadmap, the platform can reach a strong baseline suitable for production use in a multi-tenant church context.

---

## 2. Methodology

### 2.1 Scope

The review focused on the following areas:

- **Authentication & Session Management**
  - apps/api/src/auth/**
  - apps/web/src/auth.ts
  - apps/web/src/app/api/auth/**
- **Authorization & Tenant Isolation**
  - apps/api/src/context.ts
  - apps/api/src/trpc.ts
  - apps/api/src/routers/** (donations, admin, tenants, communications, people, bulletins)
- **Database Access & Multi-Tenancy**
  - packages/database/src/**
  - apps/api/src/db.ts
  - docker-compose and DB configuration files
- **API & Input Validation**
  - apps/api/src/index.ts
  - apps/api/src/routers/**
  - Zod schemas and TRPC procedures
- **Infrastructure & Configuration**
  - docker-compose.yml
  - apps/api/.env.example
  - apps/web/.env.example
  - packages/database/.env.example
- **CI/CD & Operational Security**
  - .github/workflows/ci.yml
  - .github/workflows/test.yml

### 2.2 Techniques

- **Static code review** with a focus on:
  - Raw SQL usage and query construction patterns.
  - Authentication, token handling, and credential storage.
  - Access control checks and role/tenant enforcement.
  - Error handling and information leakage.
- **Configuration analysis**:
  - Docker networking, DB config, SSL flags, and exposed ports.
  - Example environment files and default values.
- **CI/CD pipeline review**:
  - Test and audit enforcement.
  - Security tooling and gates (or lack thereof).
- **OWASP Top 10 mapping**:
  - Each major finding mapped to one or more applicable OWASP 2021 categories.

Dynamic testing, penetration testing, and dependency-level SCA were **explicitly out of scope** for this audit.

---

## 3. Critical Findings (8) — Immediate Action Required

### C1. SQL Injection in Tenant Context Setting

- **Severity:** Critical
- **Files:**
  - `packages/database/src/seed.ts:37`
  - `packages/database/src/index.ts:26`
- **Issue:**
  `SET app.tenant_id = '${tenantId}'` is built via string interpolation, allowing a maliciously crafted tenantId to break out of the query and execute arbitrary SQL.
- **Impact:**
  - Direct **SQL Injection (OWASP A03)** at the core of multi-tenant context setup.
  - Potential compromise of **all tenant data**, including ability to bypass RLS, modify schemas, or exfiltrate entire tables.
- **Evidence (pattern):**
  ```ts
  await client.query(`SET app.tenant_id = '${tenantId}'`);
  ```
- **Recommendation:**
  Replace with parameterized queries:
  ```ts
  await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
  ```
  Align with secure pattern already used in `apps/api/src/db.ts:30`.
  Add tests that attempt to inject via tenantId to prove mitigation.
- **Status:** ✅ FIXED in Phase 1 (2025-12-04) — See `SECURITY-REMEDIATION-PHASE-1-2025-12-04.md`

---

### C2. Hard-Coded Development Credentials

- **Severity:** Critical
- **File:** `apps/web/src/auth.ts:51–102`
- **Issue:**
  Six dev users are defined with plaintext passwords (e.g., admin/admin, editor/editor).
- **Impact:**
  - Credentials are now part of Git history.
  - If DEV_MODE is ever misconfigured (e.g., accidentally enabled in staging/production), attackers can log in with known credentials.
  - Sets a bad precedent for handling secrets.
- **Recommendation:**
  - Remove hard-coded users entirely or ensure they are only constructed from environment variables for local only.
  - Implement a runtime guard so dev mode cannot enable in non-local environments (e.g., require `NODE_ENV === 'development'` + `ALLOW_DEV_USERS=true`).
  - Add CI check to prevent DEV_MODE from being enabled on main or production branches.
- **Status:** ✅ FIXED in Phase 1 (2025-12-04) — See `SECURITY-REMEDIATION-PHASE-1-2025-12-04.md`

---

### C3. Weak JWT Secret Fallbacks

- **Severity:** Critical
- **Files:**
  - `apps/api/src/auth/jwt.ts:27` — `'dev-secret-DO-NOT-USE-IN-PRODUCTION'`
  - `apps/web/src/app/api/auth/token/route.ts:11` — `'dev-secret-change-in-production'`
- **Issue:**
  Hard-coded fallback secrets for JWT signing are short and predictable.
  In any environment where JWT_SECRET is missing or misconfigured, tokens are signed with a secret that an attacker can guess.
- **Impact:**
  - Token forgery: attackers can generate valid JWTs with arbitrary claims.
  - Total compromise of authentication and authorization model.
- **Recommendation:**
  - Remove all hard-coded default secrets for JWT.
  - On startup, if JWT_SECRET is missing:
    - Fail fast in non-test environments.
    - For local dev, generate a cryptographically secure random secret at boot and log that dev tokens will be invalid after restart.
  - Add CI checks to ensure JWT_SECRET is set for staging/prod deployments.
- **Status:** ✅ FIXED in Phase 1 (2025-12-04) — See `SECURITY-REMEDIATION-PHASE-1-2025-12-04.md`

---

### C4. Missing Rate Limiting for API

- **Severity:** Critical
- **File:** `apps/api/src/index.ts`
- **Issue:**
  No rate limiting middleware is applied at the API gateway level.
- **Impact:**
  - Allows brute-force attacks (/auth endpoints, password reset flows).
  - Enables enumeration of user data and tenant data.
  - Increases susceptibility to low-effort DoS attempts.
- **Recommendation:**
  - Introduce a rate limiting middleware (e.g., based on IP and tenant ID).
  - Apply stricter limits to:
    - Auth routes (login, password reset, token issuance).
    - Public token endpoints (e.g., public bulletins).
  - Ensure configuration is environment-specific with conservative defaults.
- **Status:** ✅ FIXED in Phase 1 (2025-12-04) — See `SECURITY-REMEDIATION-PHASE-1-2025-12-04.md`

---

### C5. Unprotected Pages Rendering Before Auth Check

- **Severity:** Critical
- **Files:**
  - `apps/web/src/app/donations/page.tsx`
  - `apps/web/src/app/directory/page.tsx`
  - `apps/web/src/app/events/page.tsx`
- **Issue:**
  These pages can render content before an auth check completes, relying on client-side redirect behavior.
- **Impact:**
  - Sensitive content (donations, directory, events) can briefly flash or be accessible via disabled JS or slow connections.
  - Violates defense-in-depth and leaks the assumption that auth is "mostly client-side".
- **Recommendation:**
  - Ensure these pages are fully wrapped in a `ProtectedPage` pattern that:
    - Checks authentication on the server side (RSC or getServerSession-equivalent).
    - Returns redirect/401 before rendering any sensitive JSX.
  - Add regression tests confirming unauthenticated users cannot see content during hydration.
- **Status:** Open.

---

### C6. SQL Injection Risk in Dynamic Column Construction

- **Severity:** Critical
- **Files:**
  - `apps/api/src/routers/donations.ts:192–199`
  - `apps/api/src/routers/communications.ts:444–459`
- **Issue:**
  Column names are constructed dynamically from object keys without a strict whitelist, then used in SQL.
- **Impact:**
  - Even if values are parameterized, unvalidated identifiers can allow injection in the query structure (ORDER BY, GROUP BY, etc.).
  - Risk of arbitrary column access, bypassing intended access constraints.
- **Recommendation:**
  Introduce a fixed whitelist of allowed columns and map untrusted input to safe identifiers:
  ```ts
  const DONATION_SORT_COLUMNS = {
    date: 'd.date',
    amount: 'd.amount',
    // ...
  } as const;
  const sortColumn = DONATION_SORT_COLUMNS[userSortKey] ?? DONATION_SORT_COLUMNS.date;
  ```
  Reject any request where a column or sort key is not in the whitelist.
  Add unit tests and security tests for invalid and malicious keys.
- **Status:** Open.

---

### C7. Missing Role Check on Financial Data

- **Severity:** Critical
- **File:** `apps/api/src/routers/donations.ts:247`
- **Issue:**
  The `list` procedure for donations allows any authenticated user to view all donation records without checking a finance-related role.
- **Impact:**
  - Direct privacy breach: giving/donation information is highly sensitive.
  - Violates least privilege and expected separation of duties.
- **Recommendation:**
  - Enforce a role-based check, e.g., `role === 'Finance' | 'Admin'` prior to returning donation data.
  - Implement fine-grained authorization:
    - Read access: finance/admin only.
    - Export/CSV: potentially restricted further (e.g., finance lead only).
  - Add tests to ensure non-finance roles receive 403/UNAUTHORIZED.
- **Status:** ✅ FIXED in Phase 1 (2025-12-04) — See `SECURITY-REMEDIATION-PHASE-1-2025-12-04.md`

---

### C8. Admin Endpoint Cross-Tenant Data Access

- **Severity:** Critical
- **File:** `apps/api/src/routers/adminAiUsage.ts:34–46`
- **Issue:**
  This admin endpoint allows querying AI usage for any tenant by passing a `tenantId`, with no enforced link to the caller's tenant or a safe global-admin model.
- **Impact:**
  - Cross-tenant data disclosure of AI usage and possibly billing-related metrics.
  - Violates tenant isolation guarantees and could be used to map other tenants.
- **Recommendation:**
  - Decide on a clear model for platform admin:
    - Either: true global admin with strong controls and explicit role.
    - Or: scoped admin where tenantId must equal the caller's tenant.
  - Enforce this model in the router:
    - If global admin: validate `platformRole === 'platform_admin'` and log access in an audit log.
    - If tenant admin: ignore provided tenantId and always use `context.tenantId`.
  - Add tests for:
    - Cross-tenant access attempt from regular admin → denied.
    - Proper behavior for platform admin (if supported).
- **Status:** ✅ FIXED in Phase 1 (2025-12-04) — See `SECURITY-REMEDIATION-PHASE-1-2025-12-04.md`

---

## 4. High Severity Findings (12)

### 4.1 Authentication & Authorization

| ID | Issue | File | Risk / Impact | Recommendation |
|----|-------|------|---------------|----------------|
| H1 | Silent JWT verification failure (no logging) | `apps/api/src/auth/jwt.ts:48–56` | Verification failures disappear silently, obscuring attack attempts and auth misconfigurations | Log failures with context (tenantId, subject) and consider metrics/alerts for repeated failures |
| H2 | Tenant ID header spoofing possible | `apps/api/src/context.ts:38–67` | If tenantId can be influenced by headers, an attacker may try tenant impersonation | Only trust tenantId derived from server-side session; ignore or strictly validate headers |
| H3 | Platform admin no tenant isolation | `apps/api/src/trpc.ts:253–255` | Platform admin role may bypass tenant checks globally | Explicitly define platform admin capabilities; log and constrain cross-tenant operations |
| H4 | Non-constant-time password comparison | `apps/web/src/auth.ts:105–107` | Timing differences can leak information in high-precision environments | Use a constant-time comparison function (e.g., `crypto.timingSafeEqual`) |
| H5 | Missing role check on CSV export | `apps/api/src/routers/donations.ts:838` | CSV exports can be pulled by any authenticated user, amplifying data leakage | Require finance/admin-only role for exports; log all exports |
| H6 | Dev mode can leak to staging | `apps/web/src/auth.ts:27` | DEV_MODE flag can affect environments beyond local, re-enabling dev users or relaxed checks | Strong environment guard: dev mode only when `NODE_ENV === 'development'` and local URL |

### 4.2 Infrastructure & Configuration

| ID | Issue | File | Risk / Impact | Recommendation |
|----|-------|------|---------------|----------------|
| H7 | Weak default DB password | `docker-compose.yml:20` | Default DB password is guessable; if used beyond local dev, DB can be trivially compromised | Use strong random password even for local dev; for other envs use secrets and never check them into git |
| H8 | Database SSL disabled by default | `apps/api/.env.example:15` | Encourages non-encrypted connections, risking data in transit | Default to `DB_SSL=true` with documented override only for localhost |
| H9 | SSL rejectUnauthorized: false | `apps/api/src/db.ts:14` | Disables certificate validation, enabling MITM in non-local deployments | For non-local envs require proper CA or pinned certs; only allow `rejectUnauthorized: false` locally |
| H10 | Missing encryption key enforcement | `apps/api/src/utils/encryption.ts:28–47` | If encryption key is missing or weak, stored secrets/PII can be compromised | Require strong, random encryption keys; fail fast if key is missing or too short |
| H11 | CI ignores npm audit failures | `.github/workflows/ci.yml:36` | Known vulnerable dependencies may be deployed without review | Make npm audit (or equivalent) a failing step; allow controlled overrides via documented ignore list |
| H12 | CI ignores test failures | `.github/workflows/test.yml:33` | Test failures (including security tests) do not block deployment | Make test failure a hard stop; fail pipeline on non-zero exit code |

---

## 5. Medium Severity Findings (15)

### 5.1 API Security

**M1 – CORS whitespace parsing issue**
- **File:** `apps/api/src/index.ts:20–24`
- **Issue:** CORS origin parsing is fragile and could mishandle origins with whitespace or similar edge cases.
- **Impact:** Risk of accidentally allowing untrusted origins.
- **Recommendation:** Normalize and strictly validate allowed origins, preferably from a whitelist array.

**M2 – No max length on search parameters**
- **File:** `apps/api/src/routers/people.ts:63–69`
- **Issue:** Search strings are not bounded in length.
- **Impact:** Allows very large payloads that could degrade performance or contribute to DoS.
- **Recommendation:** Add Zod validators with reasonable max length (e.g., 128–256 characters).

**M3 – Public tenant enumeration**
- **File:** `apps/api/src/routers/tenants.ts:129–173`
- **Issue:** Public endpoint(s) allow probing tenant existence or metadata.
- **Impact:** Enables attackers to enumerate valid tenants and target them specifically.
- **Recommendation:** Avoid returning detailed error messages; rate limit and consider captcha or email-based discovery only.

**M4 – No rate limiting on public bulletin tokens**
- **File:** `apps/api/src/routers/bulletins.ts:302`
- **Issue:** Public token endpoints lack rate limiting.
- **Impact:** Brute force of public tokens to access bulletins not intended for them.
- **Recommendation:** Add token-specific rate limiting and/or long, non-guessable tokens.

### 5.2 Session & Token

**M5 – JWT expiry set to 12 hours**
- **File:** `apps/api/src/auth/jwt.ts:33`
- **Issue:** Long-lived tokens increase the risk window for stolen tokens.
- **Recommendation:** Reduce to 1–2 hours and pair with refresh tokens if necessary.

**M6 – No token rotation on session refresh**
- **File:** `apps/web/src/auth.ts:170`
- **Issue:** Tokens can be reused for extended periods without rotation.
- **Recommendation:** Implement token rotation on refresh; invalidate old tokens server-side.

**M7 – Session duration not bounded**
- **File:** `apps/web/src/auth.ts:35–36`
- **Issue:** Session lifetimes may be effectively unbounded.
- **Recommendation:** Set reasonable upper bounds (e.g., 7–30 days) with user-visible re-auth flows.

**M8 – Missing field validation in session callbacks**
- **File:** `apps/web/src/auth.ts:131–159`
- **Issue:** Session/user object shaping is not fully validated.
- **Impact:** Inconsistent or malicious values can leak into client or auth context.
- **Recommendation:** Use Zod or TypeScript refinement to validate session fields before exposing them.

### 5.3 Infrastructure & Operational

**M9 – Missing security headers (no helmet.js)**
- **File:** `apps/api/src/index.ts`
- **Issue:** Common headers like HSTS, X-Frame-Options, X-Content-Type-Options, etc., are absent.
- **Recommendation:** Add security headers middleware (e.g., Helmet) and tune for React/Next.js environment.

**M10 – Dev stack traces in errors**
- **File:** `apps/api/src/trpc.ts:88–101`
- **Issue:** Stack traces may be returned to clients in non-dev environments.
- **Impact:** Information leakage aiding attackers.
- **Recommendation:** Only include stack traces when `NODE_ENV === 'development'`; log full details server-side only.

**M11 – Docker containers lack security options**
- **File:** `docker-compose.yml:13–34`
- **Issue:** No `read_only`, `no-new-privileges`, or capability drops configured.
- **Recommendation:** Tighten Docker settings; consider rootless mode and least-privilege profiles for DB and API.

**M12 – Missing CSRF protection validation**
- **Area:** Forms / authenticated POSTs
- **Issue:** No clear CSRF mitigation is visible for state-changing endpoints used from browsers.
- **Recommendation:** Implement CSRF tokens or enforce same-site cookies and strict CORS for sensitive endpoints.

**M13 – Tenant mismatch only logged, not alerted**
- **File:** `apps/api/src/context.ts:54–63`
- **Issue:** Tenant mismatches are logged but do not trigger any alerting.
- **Impact:** Potential active attacks may go unnoticed.
- **Recommendation:** Integrate with alerting/metrics (e.g., log aggregation, alert on anomaly rates).

**M14 – No security event logging**
- **File:** `apps/api/src/trpc.ts` and surrounding infra
- **Issue:** No structured logging for security-relevant events (logins, admin actions, permission denials).
- **Recommendation:** Introduce audit logging with trace IDs and actor/tenant context.

**M15 – No secrets scanning in CI/CD**
- **Files:** `.github/workflows/ci.yml`, `.github/workflows/test.yml`
- **Issue:** No automated checks for committed secrets.
- **Recommendation:** Add a secrets scanning step (e.g., gitleaks, trufflehog) and make it fail the pipeline on detection.

---

## 6. Low Severity Findings (5+)

**L1 – Weak dev passwords normalize bad practices**
- Even if only local, patterns like admin/admin encourage poor habits.
- **Recommendation:** Use stronger dev passwords and/or environment-driven auth locally.

**L2 – No SECURITY.md file for disclosure**
- There is no documented process for responsible vulnerability disclosure.
- **Recommendation:** Add `SECURITY.md` with contact, scope, and expectations.

**L3 – Optional platform role type safety**
- **File:** `apps/api/src/auth/types.ts:28–37`
- Platform role usage could be stricter at the type level to prevent accidental misuse.
- **Recommendation:** Use discriminated unions or branded types for platform roles.

**L4 – Input validation gaps on admin routers**
- Admin endpoints are less strictly validated than public ones.
- **Recommendation:** Ensure all admin procedures use Zod schemas and explicit constraints.

**L5 – Database port exposed to host in docker-compose**
- DB port is mapped to the host by default.
- **Recommendation:** For shared or cloud hosts, restrict DB exposure or bind to localhost only.

---

## 7. Positive Security Findings

Despite the issues above, the platform demonstrates several strong security patterns:

**Row-Level Security (RLS) for Tenants**
- Database design leverages RLS to enforce tenant isolation at the data layer, reducing the blast radius of logic errors in the API.

**Broad Use of Parameterized Queries**
- Most SQL access, particularly in the API layer, uses parameterized queries rather than string concatenation.
- The main exception is the tenant context SET statements identified in Critical Finding C1.

**Zod-Based Input Validation**
- TRPC routers consistently use Zod schemas to validate input payloads.
- This reduces the risk of injection attacks and improves overall robustness.

**Separation of Concerns**
- Clear separation between Web, API, and Database layers, which simplifies security enforcement and auditing.

These strengths provide a solid foundation; once the identified issues are remediated, the platform can achieve a strong security posture for a multi-tenant church SaaS.

---

## 8. Remediation Roadmap

### Phase 1 — Critical Fixes (Immediate)

**Target:** Complete before next production deployment.

1. **Eliminate SQL Injection**
   - Fix `packages/database/src/seed.ts` and `packages/database/src/index.ts` to use parameterized `SET app.tenant_id` queries.

2. **Remove/Lock Down Dev Credentials**
   - Move dev users out of code in `apps/web/src/auth.ts`.
   - Enforce environment guards to ensure dev features cannot enable in staging/production.

3. **Enforce Strong JWT Secrets**
   - Remove hard-coded JWT fallbacks in `apps/api/src/auth/jwt.ts` and `apps/web/src/app/api/auth/token/route.ts`.
   - Fail fast when secrets are missing in non-test environments.

4. **Add Rate Limiting**
   - Implement rate limiting middleware in `apps/api/src/index.ts`.
   - Apply strict limits to auth and public token endpoints.

5. **Enforce Authorization on Donations**
   - Add role checks to `apps/api/src/routers/donations.ts` for list and CSV export.

6. **Fix Admin AI Usage Tenant Isolation**
   - Update `apps/api/src/routers/adminAiUsage.ts` to enforce correct tenant scope and/or platform-admin semantics.

### Phase 2 — High Priority (This Sprint)

1. **Secure Database Connectivity**
   - Enable DB SSL by default; remove `rejectUnauthorized: false` outside of local dev.
   - Update `.env.example` to show secure defaults.

2. **Add Security Headers**
   - Introduce Helmet (or equivalent) in `apps/api/src/index.ts` and configure HSTS, frame, and content type protections.

3. **Harden Protected Pages**
   - Wrap donations, directory, events pages with server-side auth checks; ensure no sensitive data renders unauthenticated.

4. **Enforce CI/CD Gates**
   - Update `.github/workflows/ci.yml` and `.github/workflows/test.yml` so audit and test failures fail the pipeline.

5. **Improve Auth Failure Observability**
   - Add logging and metrics for JWT verification failures and auth errors.

### Phase 2.5 — NODE_ENV Typing Cleanup (Completed)

**Status:** ✅ Completed 2025-12-04
**Documentation:** `SECURITY-REMEDIATION-PHASE-2-5-2025-12-04.md`

This phase addressed TypeScript type errors when comparing `process.env.NODE_ENV` to `'staging'`:

1. **Created Centralized Env Helpers**
   - `apps/api/src/config/env.ts` and `apps/web/src/config/env.ts`
   - Exports: `NODE_ENV`, `IS_DEV`, `IS_TEST`, `IS_STAGING`, `IS_PROD`, `IS_PROD_LIKE`, `IS_NON_PROD`

2. **Refactored All NODE_ENV Comparisons**
   - Security-critical files: `auth/jwt.ts`, `db.ts`, `trpc.ts`, `auth.ts`, `token/route.ts`
   - Development-only files: Canvas editor components

3. **Added Unit Tests**
   - 26 tests across API and Web apps

**Key Points:**
- No runtime security behavior changes
- TypeScript-only cleanup
- `IS_PROD_LIKE` (production OR staging) used for security checks

### Phase 3 — Medium Priority (Next Sprint) ✅ COMPLETED (2025-12-04)

**Branch:** `feature/security-phase-3-hardening`
**Documentation:** `docs/SECURITY-REMEDIATION-PHASE-3-2025-12-04.md`

1. ~~**Token & Session Hardening**~~ (Deferred to Phase 4)
   - Shorten JWT lifetime to 1–2 hours; implement token rotation on refresh; bound session duration.

2. **CORS Hardening** ✅
   - Created centralized CORS config (`apps/api/src/config/cors.ts`)
   - Strict origin validation (exact match only)
   - No wildcards in production environments
   - Security logging for rejected origins

3. **CSRF Protection** ✅
   - Implemented double-submit cookie pattern (`apps/api/src/security/csrf.ts`)
   - Cryptographically secure token generation
   - Constant-time token comparison
   - Added cookie-parser dependency

4. **Security Tooling in CI** ✅
   - Added Gitleaks secrets scanning (`.github/workflows/ci.yml`)
   - Custom gitleaks rules (`.gitleaks.toml`)
   - Blocks builds on secrets detection

5. **Security Logging** ✅
   - Created structured security event logger (`apps/api/src/logging/securityLogger.ts`)
   - Event categories: AUTH, ACCESS, THREAT, AUDIT, CONFIG
   - Sensitive data masking
   - Pre-defined loggers for common events

6. **Docker Security Hardening** ✅
   - Added `no-new-privileges` flag
   - Dropped unnecessary Linux capabilities
   - Redis runs as non-root with read-only filesystem

### Phase 4 — Hardening & Continuous Improvement (Ongoing)

1. **Comprehensive Audit Logging**
   - Implement structured audit logs for admin actions, cross-tenant operations, and permission denials.

2. **Public Endpoint Rate Limiting**
   - Expand rate limiting to all public and semi-public endpoints.

3. **Documentation & Policy**
   - Create and maintain `SECURITY.md`, incident response runbooks, and key rotation runbooks.

4. **Regular Security Reviews**
   - Schedule recurring security reviews aligned with major releases and dependency updates.

---

## 9. OWASP Top 10 Mapping

| OWASP 2021 Category | Relevant Findings |
|---------------------|-------------------|
| A01 – Broken Access Control | C5 (unprotected pages), C7 (donations role checks), C8 (admin AI usage cross-tenant), H3 (platform admin isolation) |
| A02 – Cryptographic Failures | C3 (weak JWT secrets), H8–H10 (DB SSL disabled, encryption key enforcement) |
| A03 – Injection | C1 (tenant SET SQL injection), C6 (dynamic column construction) |
| A04 – Insecure Design | C2 (dev creds in code), M3 (tenant enumeration), M4 (public token brute forcing), L1 (weak dev password patterns) |
| A05 – Security Misconfiguration | C4 (no rate limiting), H7 (weak DB password), M9–M11 (missing headers, Docker options) |
| A07 – Identification and Authentication Failures | H1 (silent JWT failures), H4 (non-constant-time comparisons), M5–M8 (token lifetime, rotation, session bounds) |
| A08 – Software & Data Integrity Failures | H11–H12 (CI ignoring audits and tests), M15 (no secrets scanning) |
| A09 – Security Logging and Monitoring Failures | H1 (no logging on JWT failures), M13–M14 (no security event logging, no alerts) |

Other categories (A06, A10) are less directly implicated but would be covered by ongoing dependency management and future dynamic testing.

---

## 10. Appendix — Files Reviewed (With Findings)

The following files and directories contain one or more findings from this audit:

### 10.1 Application Code

- `apps/api/src/index.ts`
- `apps/api/src/auth/jwt.ts`
- `apps/api/src/context.ts`
- `apps/api/src/trpc.ts`
- `apps/api/src/db.ts`
- `apps/api/src/utils/encryption.ts`
- `apps/api/src/routers/donations.ts`
- `apps/api/src/routers/adminAiUsage.ts`
- `apps/api/src/routers/people.ts`
- `apps/api/src/routers/tenants.ts`
- `apps/api/src/routers/communications.ts`
- `apps/api/src/routers/bulletins.ts`

### 10.2 Web Application

- `apps/web/src/auth.ts`
- `apps/web/src/app/api/auth/token/route.ts`
- `apps/web/src/app/donations/page.tsx`
- `apps/web/src/app/directory/page.tsx`
- `apps/web/src/app/events/page.tsx`

### 10.3 Database & Infrastructure

- `packages/database/src/seed.ts`
- `packages/database/src/index.ts`
- `docker-compose.yml`

### 10.4 Configuration & CI/CD

- `apps/api/.env.example`
- `apps/web/.env.example`
- `packages/database/.env.example`
- `.github/workflows/ci.yml`
- `.github/workflows/test.yml`

---

*This appendix lists all files where specific security findings were identified during this review. Other files may have been inspected but are omitted here because no notable security issues were observed at this time.*
