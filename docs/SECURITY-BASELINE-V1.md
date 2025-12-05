# Security Baseline – V1

This document defines the minimum security bar for all saas20xxxxx projects, including this church platform codebase. Any new feature, refactor, or repo should either meet this baseline or explicitly document why it does not.

This is not a one-time “audit result”; it is the standard going forward.

---

## 1. Scope & Threat Model

**Scope**

- Backend APIs (tRPC/REST/Express) under `apps/api`.
- Web frontend(s) under `apps/web`.
- Database (PostgreSQL with Row-Level Security).
- CI/CD pipelines (GitHub Actions).
- Supporting infra: Docker, environment configuration, encryption.

**Threat Model (simplified)**

- Multi-tenant B2B SaaS for churches and similar orgs.
- Data includes:
  - Personal info (names, emails, attendance, giving).
  - Financial data (donations, payment metadata).
  - Internal church operations (sermons, notes, groups).
- We assume:
  - Attackers are external internet users.
  - Some attackers may be authenticated users from other tenants.
  - Misconfiguration and developer mistakes are realistic risks.

Goal: prevent cross-tenant data access, theft of sensitive data, account takeover, and trivial infra compromise.

---

## 2. Core Security Principles

1. **Tenant isolation first**
   - Every data access is scoped by tenant; RLS is the last line of defense, not the only one.
2. **Least privilege**
   - Roles and tokens grant only what is necessary.
3. **No trust in client input**
   - IDs, headers, bodies, query strings are untrusted.
4. **Secrets never live in the repo**
   - Only in environment variables or secret stores.
5. **Secure-by-default configs**
   - Production builds must be safe even if developers forget a flag.
6. **Plain, boring error responses in production**
   - Users never see stack traces or internals.

---

## 3. Authentication Baseline

**Auth Mechanism**

- Central auth system (e.g., NextAuth, AAD, or similar) issues session cookies and/or JWTs.
- Tokens are only minted by our trusted backend / identity provider.

**Requirements**

- JWT / session secrets:
  - Must come from environment variables (`NEXTAUTH_SECRET`, `JWT_SECRET`, etc.).
  - No weak fallbacks in production. If missing → fail fast on startup.
- Cookies (production):
  - `httpOnly: true`
  - `secure: true`
  - `sameSite: 'strict'` (or `'lax'` with a documented reason).
- Session lifetime:
  - Reasonable default (e.g., 7–30 days), configurable via env (`SESSION_MAX_AGE_DAYS` or equivalent).
  - Long-lived or “remember me” behavior must be intentional and documented.

---

## 4. Authorization & Multi-Tenancy Baseline

**Tenant context**

- Tenant/org context is derived from a **trusted** source:
  - Session/JWT claims; or
  - Subdomain/domain routing resolved on the server.
- Client-controlled headers (e.g., `X-Org-Id`) are never trusted for authorization decisions.

**Database isolation**

- PostgreSQL:
  - RLS enabled for all tenant-scoped tables.
  - Queries rely on a server-side tenant context, e.g.:

    ```sql
    SELECT set_config($1, $2, true); -- e.g. 'app.tenant_id', tenantId
    ```

  - No string interpolation:

    ```ts
    // NEVER:
    await db.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    ```

- All queries that access tenant data:
  - Must run under the correct tenant context.
  - Must not bypass RLS by directly querying cross-tenant data.

**Platform & tenant roles**

At minimum, the following roles exist or are planned:

- `platform_admin`
  - Full platform access.
  - Can create/manage tenants.
- `platform_support` (planned)
  - Cross-tenant read-only access for support.
- Tenant-level roles (example model; names may differ per repo):
  - `tenant_admin` – full control within a tenant.
  - `tenant_editor` – can manage content but not billing/users.
  - `tenant_viewer` – read-only within tenant.

**Baseline rules**

- `platform_admin` and `platform_support` are **only** assigned by the backend or a dedicated admin tool. Users cannot influence their own platform role.
- Tenant creation endpoints:
  - Are **not** public by default.
  - Require `platform_admin` (or equivalent) unless a specifically designed public signup flow exists.
- All sensitive operations (billing, user/role changes, cross-tenant access, export, deletion) must:
  - Use server-side role checks.
  - Never rely solely on frontend guarding.

---

## 5. Input Validation & Output Encoding

**Validation**

- All API inputs (tRPC, REST) must be validated:
  - Prefer schema-based validation (e.g., Zod).
  - No “raw” handlers with untyped `any`/`unknown` that go straight to DB or business logic.
- No manual string concatenation into SQL or shell commands.
  - Always use query parameterization or ORM/Query builder.

**XSS & HTML**

- No `dangerouslySetInnerHTML` without a vetted sanitizer.
- Rich text / user-generated HTML must be sanitized before rendering.
- User-supplied URLs must be validated:
  - Reject/block dangerous schemes: `javascript:`, `data:`, `vbscript:`, `file:`, `about:`.
  - Enforce `https://` or an approved set of schemes and domains for images and embeds.

---

## 6. Session & CSRF

**Sessions**

- Cookie-based sessions must follow the auth baseline above.
- Session renewal (“sliding sessions”) is allowed if:
  - Implemented intentionally.
  - Doesn’t silently extend sessions indefinitely in production.

**CSRF**

- Any browser-accessible endpoint that:
  - Uses cookie-based auth AND
  - Mutates state (POST/PUT/PATCH/DELETE)
  must be protected against CSRF by one of:
  - Framework-provided CSRF tokens (e.g., NextAuth’s CSRF).
  - Custom CSRF token mechanism.
  - Or use of bearer tokens (Authorization header) where cookies are not used and CSRF is not applicable.

- CSRF assumptions MUST be explicitly verified whenever new mutation routes are added.

---

## 7. Secrets, Encryption & Configuration

**Secrets & env**

- Secrets, keys, passwords, tokens:
  - Only in environment variables or secret stores.
  - Never in the repo, even in `.env.example` (use placeholders).
- Config validation:
  - Use a central env validation module (e.g., Zod schema).
  - Fail fast on missing critical env vars in production.

**Application encryption**

- Symmetric encryption for stored secrets/API keys must:
  - Use a strong algorithm (e.g., AES-256-GCM).
  - Use a key stored in env (e.g., `APP_ENCRYPTION_KEY`).
- If an example key was ever committed and used in any environment:
  - That environment’s key must be rotated.
  - Any data encrypted with that key must be re-encrypted.

- Key rotation:
  - A documented runbook must exist (how to rotate `APP_ENCRYPTION_KEY`, etc.).
  - Rotation must be tested in staging before production.

---

## 8. Error Handling & Logging

**Error responses**

- Production:
  - No stack traces, no internal error objects, no SQL error text.
  - Generic responses with optional correlation IDs, e.g.:

    ```json
    {
      "error": "Internal server error",
      "code": "INTERNAL_ERROR",
      "errorId": "ERR-XXXXXX"
    }
    ```

- Development:
  - Detailed errors allowed for debugging, but avoid printing secrets.

**Logging**

- Server logs:
  - Log full details and correlation IDs for internal errors.
  - Log security-relevant events:
    - Login failures.
    - Role changes.
    - Tenant creation.
    - Any use of `platform_admin` / `platform_support`.
- Logs must not:
  - Print secrets.
  - Dump entire JWTs, passwords, or full request bodies with sensitive content.

---

## 9. File Uploads & External Services

**File uploads**

- Validate:
  - Content type.
  - File extension.
  - Size limits.
- Storage:
  - Use safe storage (e.g., blob storage).
  - Do not allow user input to control paths directly (no directory traversal).

**External APIs & webhooks**

- All external calls (Stripe, email, etc.):
  - Use env-based secrets.
  - Handle timeouts and errors gracefully.
- Webhooks:
  - Verify signatures or shared secrets.
  - Reject unsigned/invalid requests.
  - Never trust webhook payloads without validation.

---

## 10. CI/CD & Infrastructure

**GitHub Actions**

- Use OIDC/federated credentials for cloud access where possible.
- Secrets:
  - Only pulled from GitHub Actions secrets store.
  - Never echoed to logs.

**Security tooling in CI**

- At minimum:
  - `npm audit` (or similar) with a reasonable audit level (e.g., `--audit-level=high`).
  - Secret scanning (GitHub built-in).
  - CodeQL or equivalent SAST for supported languages.
  - Security test suite (e.g., tests under `__tests__` that cover:
    - Tenant isolation.
    - Auth/role enforcement.
    - SQL injection protection).

**Docker**

- No default `postgres/postgres` creds for anything beyond local dev.
- Bind dev DB to localhost only.
- Clear separation between dev and prod docker settings.

---

## 11. Local Development Exceptions

Local dev can relax some constraints (with explicit documentation):

- Dev-only credentials and default keys are allowed **only** if:
  - Guarded by `NODE_ENV !== 'production'`.
  - Clearly marked as dev-only.
- Verbose errors and extra logging are allowed in dev.

No exception ever allows:

- Secrets in the repo.
- SQL injection or bypassing tenant isolation.
- “Temporary” backdoors (hardcoded admin users, etc.) shipping to staging/production.

---

## 12. Required Checks Before Merging / Releasing

**Per feature / PR**

- [ ] All new endpoints:
  - [ ] Enforce tenant context correctly.
  - [ ] Use proper auth/role checks.
  - [ ] Validate inputs.
- [ ] No new secrets added to the repo.
- [ ] No new `dangerouslySetInnerHTML` usage without sanitization.
- [ ] No new direct SQL string interpolation from user input.

**Before staging/production releases**

- [ ] `npm test` passes (including security tests).
- [ ] `npm audit --audit-level=high` reviewed and acceptable.
- [ ] CI CodeQL/secret scanning jobs passing.
- [ ] Critical security env vars set:
  - [ ] Auth secrets.
  - [ ] Encryption keys.
  - [ ] DB credentials.
- [ ] Security docs (this baseline + review summary) updated if any assumptions changed.

---

This baseline is V1. It should be updated as we add more services, more customers, and encounter more real-world threats. Any deviation from this baseline must be explicitly documented and time-bounded.
