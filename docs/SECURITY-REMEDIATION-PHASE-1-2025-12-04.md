# Security Remediation Phase 1 — Summary

**Date:** 2025-12-04
**Branch:** `feature/security-phase-1-critical-fixes`
**Related:** `SECURITY-AUDIT-2025-12-04.md`

---

## Overview

This document summarizes the security fixes implemented in Phase 1 to address critical issues identified in the security audit dated 2025-12-04.

**Issues Addressed:** C1, C2, C3, C4, C7, C8

---

## C1: SQL Injection in Tenant Context Setting

### Files Changed
- `packages/database/src/index.ts`
- `packages/database/src/seed.ts`

### Problem
String interpolation was used in `SET app.tenant_id = '${tenantId}'`, allowing SQL injection.

### Fix
Replaced with parameterized queries using PostgreSQL's `set_config()` function:

```typescript
// Before (VULNERABLE)
await client.query(`SET app.tenant_id = '${tenantId}'`);

// After (SECURE)
await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
```

This matches the secure pattern already used in `apps/api/src/db.ts`.

---

## C2: Hard-Coded Development Credentials

### Files Changed
- `apps/web/src/auth.ts`
- `apps/web/.env.example`

### Problem
Six dev users were defined with plaintext passwords (admin/admin, editor/editor, etc.) directly in code.

### Fix
1. **Dual environment guard**: Dev users now require BOTH `NODE_ENV === 'development'` AND `ALLOW_DEV_USERS === 'true'`
2. **Passwords moved to environment variables**: Each dev user password is read from `DEV_<ROLE>_PASSWORD` environment variables
3. **Random fallback**: If env var not set, a random password is generated at runtime (logged to console in dev)
4. **Minimum length enforcement**: Passwords must be at least 8 characters

```typescript
// New environment guard
const isStrictDevelopment = process.env.NODE_ENV === 'development';
const allowDevUsers = process.env.ALLOW_DEV_USERS === 'true';
const isDev = isStrictDevelopment && allowDevUsers;

// Passwords from environment
const adminPassword = getDevPassword('DEV_ADMIN_PASSWORD', 'admin');
```

### Environment Variables Added
```
ALLOW_DEV_USERS=true          # Must be explicitly enabled
DEV_ADMIN_PASSWORD=changeme123
DEV_EDITOR_PASSWORD=changeme123
DEV_SUBMITTER_PASSWORD=changeme123
DEV_VIEWER_PASSWORD=changeme123
DEV_KIOSK_PASSWORD=changeme123
DEV_PASTOR_PASSWORD=changeme123
```

---

## C3: Weak JWT Secret Fallbacks

### Files Changed
- `apps/api/src/auth/jwt.ts`
- `apps/web/src/app/api/auth/token/route.ts`
- `apps/api/.env.example`
- `apps/web/.env.example`

### Problem
Hard-coded fallback secrets like `'dev-secret-DO-NOT-USE-IN-PRODUCTION'` were used when JWT_SECRET was missing.

### Fix
1. **Fail-fast in production/staging**: Server throws fatal error if secret is missing or too short
2. **Random secret in development**: Cryptographically secure random secret generated at runtime
3. **Minimum length enforcement**: Secret must be at least 32 characters
4. **Test environment support**: TEST_JWT_SECRET can be used for deterministic test behavior

```typescript
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  // Fail fast in production/staging
  if (nodeEnv === 'production' || nodeEnv === 'staging') {
    throw new Error('FATAL: JWT_SECRET or NEXTAUTH_SECRET environment variable must be set...');
  }

  // Generate random secret for development
  const randomSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[SECURITY] JWT_SECRET not set. Generated random secret for this session...');
  return randomSecret;
})();
```

---

## C4: Missing Rate Limiting

### Files Changed
- `apps/api/src/index.ts`
- `apps/api/package.json` (added `express-rate-limit` dependency)
- `apps/api/.env.example`

### Problem
No rate limiting middleware was applied, enabling brute-force and enumeration attacks.

### Fix
Added `express-rate-limit` middleware with two tiers:

1. **General limiter**: 100 requests per 15 minutes for all endpoints
2. **Auth limiter**: 10 requests per 15 minutes for authentication-related endpoints

```typescript
// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 900000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
});

// Stricter auth limiter
const authLimiter = rateLimit({
  windowMs: 900000,
  max: 10,
  message: { error: 'Too many authentication attempts...', code: 'AUTH_RATE_LIMIT_EXCEEDED' },
});

// Applied to routes
app.use(generalLimiter);
app.use('/trpc/auth', authLimiter);
app.use('/trpc/tenants.checkSlugAvailability', authLimiter);
```

### Environment Variables Added
```
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes default
RATE_LIMIT_MAX_REQUESTS=100       # General endpoints
AUTH_RATE_LIMIT_MAX_REQUESTS=10   # Auth endpoints
```

---

## C7: Missing Role Check on Financial Data

### Files Changed
- `apps/api/src/routers/donations.ts`

### Problem
The `donations.list` procedure allowed any authenticated user to view all donations. The CSV export also lacked role checks.

### Fix
Added role-based access control to financial data endpoints:

1. **donations.list**: Non-admin/editor users can only view their own donation records
2. **exportTaxSummariesCsv**: Requires admin or editor role
3. **getTaxStatementForPerson**: Admin/editor can view all; others only their own data

```typescript
const FINANCE_ACCESS_ROLES: AppRole[] = ['admin', 'editor'];

// In donations.list
const hasFinanceAccess = ctx.userRole && FINANCE_ACCESS_ROLES.includes(ctx.userRole);
if (!hasFinanceAccess) {
  if (!personId || personId !== ctx.userId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You can only view your own donation records...',
    });
  }
}

// In exportTaxSummariesCsv
if (!ctx.userRole || !FINANCE_ACCESS_ROLES.includes(ctx.userRole)) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Admin or editor role required to export tax summaries',
  });
}
```

---

## C8: Admin Endpoint Cross-Tenant Data Access

### Files Changed
- `apps/api/src/routers/adminAiUsage.ts`

### Problem
The admin AI usage endpoint accepted a `tenantId` parameter, allowing admins to query any tenant's AI usage data.

### Fix
Removed the `tenantId` parameter and always use `ctx.tenantId` from the authenticated session:

```typescript
// Before (VULNERABLE)
.input(z.object({
  from: z.string(),
  to: z.string(),
  tenantId: z.string().uuid().optional().nullable(), // Could query any tenant
}))
.query(async ({ input }) => {
  const summary = await aggregateAiUsage(db, {
    tenantId: input.tenantId ?? undefined, // Used user-supplied tenantId
  });
});

// After (SECURE)
.input(z.object({
  from: z.string(),
  to: z.string(),
  // tenantId parameter removed
}))
.query(async ({ input, ctx }) => {
  const tenantId = ctx.tenantId!; // Always use authenticated tenant
  const summary = await aggregateAiUsage(db, {
    tenantId, // Enforced tenant isolation
  });
});
```

Both `summary` and `currentMonth` endpoints now enforce tenant isolation.

---

## Verification Checklist

- [ ] Run `npm install` in `apps/api` to install `express-rate-limit`
- [ ] Set required environment variables in `.env.local` files
- [ ] Run database migrations (if any)
- [ ] Run test suite to verify no regressions
- [ ] Manual testing of:
  - [ ] Dev user login with new password system
  - [ ] Rate limiting triggers on rapid requests
  - [ ] Donations list access for different roles
  - [ ] Admin AI usage returns only current tenant data

---

## Files Modified Summary

| File | Change Type |
|------|-------------|
| `packages/database/src/index.ts` | SQL injection fix |
| `packages/database/src/seed.ts` | SQL injection fix |
| `apps/web/src/auth.ts` | Dev credentials security |
| `apps/web/.env.example` | New dev password env vars |
| `apps/api/src/auth/jwt.ts` | JWT secret enforcement |
| `apps/web/src/app/api/auth/token/route.ts` | JWT secret enforcement |
| `apps/api/.env.example` | JWT secret and rate limit docs |
| `apps/api/src/index.ts` | Rate limiting middleware |
| `apps/api/package.json` | Added express-rate-limit |
| `apps/api/src/routers/donations.ts` | Role-based access control |
| `apps/api/src/routers/adminAiUsage.ts` | Tenant isolation fix |
| `docs/SECURITY-AUDIT-2025-12-04.md` | Updated status of fixed issues |

---

## Next Steps (Phase 2)

The following issues from the audit remain open and should be addressed in Phase 2:

- **C5**: Unprotected pages rendering before auth check
- **C6**: SQL injection risk in dynamic column construction
- **H1-H12**: High severity infrastructure and auth issues
- **M1-M15**: Medium severity API and session issues

See `SECURITY-AUDIT-2025-12-04.md` Section 8 (Remediation Roadmap) for the full plan.
