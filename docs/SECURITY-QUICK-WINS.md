# Security Quick Wins

**Priority fixes ranked by impact and effort**

This document provides actionable fixes for the security issues identified in the full review. Each fix includes the exact code changes needed.

---

## Priority 1: Critical (Fix Immediately)

### Fix SQL Injection in Tenant Context

**Files:** `apps/api/src/db.ts`, `apps/api/src/routers/serviceItems.ts`, `apps/api/src/routers/bulletins.ts`

**Current (Vulnerable):**
```typescript
// db.ts:25
await db.query(`SET LOCAL app.tenant_id = '${tenantId}'`);

// db.ts:39
await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
```

**Fixed:**
```typescript
// db.ts - Replace setTenantContext function
export async function setTenantContext(tenantId: string): Promise<void> {
  // Use set_config which properly handles parameterization
  await db.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
}

// db.ts - Update queryWithTenant function
export async function queryWithTenant<T extends QueryResultRow = any>(
  tenantId: string,
  queryText: string,
  values?: any[]
): Promise<QueryResult<T>> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // FIXED: Use parameterized set_config instead of string interpolation
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
    const result = await client.query<T>(queryText, values);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Also fix in:**
- `apps/api/src/routers/serviceItems.ts:494`
- `apps/api/src/routers/bulletins.ts:1774`

Replace all instances of:
```typescript
await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
```
With:
```typescript
await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
```

**Effort:** 15 minutes
**Impact:** Prevents complete tenant isolation bypass

---

## Priority 2: High (Fix Before Production)

### 2.1 Disable Credentials Provider in Production

**File:** `apps/web/src/auth.ts`

**Add at the top of providers array:**
```typescript
providers: [
  // Only enable credentials provider in development
  ...(process.env.NODE_ENV !== 'production' ? [
    CredentialsProvider({
      // ... existing config
    }),
  ] : []),
  // Production providers (Azure AD, etc.) go here
],
```

**Effort:** 5 minutes
**Impact:** Prevents default credential attacks in production

### 2.2 Remove JWT Secret Fallback

**File:** `apps/api/src/auth/jwt.ts`

**Current:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production';
```

**Fixed:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET or NEXTAUTH_SECRET environment variable must be set');
}
```

**Effort:** 5 minutes
**Impact:** Prevents token forgery with known secrets

### 2.3 Reduce Session Duration

**File:** `apps/web/src/auth.ts`

**Current:**
```typescript
session: {
  strategy: 'jwt',
  maxAge: 90 * 24 * 60 * 60, // 90 days
}
```

**Fixed:**
```typescript
session: {
  strategy: 'jwt',
  maxAge: 7 * 24 * 60 * 60, // 7 days (or 14 days max)
  updateAge: 24 * 60 * 60, // Refresh session daily
}
```

**Effort:** 2 minutes
**Impact:** Reduces attack window for stolen sessions

### 2.4 Add Rate Limiting to Tenant Creation

**File:** `apps/api/src/routers/tenants.ts`

**Add simple in-memory rate limiting (replace with Redis in production):**
```typescript
// Add at top of file
const createRateLimiter = new Map<string, { count: number; resetAt: number }>();

// Add before the create mutation
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = createRateLimiter.get(ip);

  if (!limit || now > limit.resetAt) {
    createRateLimiter.set(ip, { count: 1, resetAt: now + 3600000 }); // 1 hour window
    return true;
  }

  if (limit.count >= 3) { // Max 3 tenants per hour per IP
    return false;
  }

  limit.count++;
  return true;
}

// In the create mutation, add at the start:
create: publicProcedure
  .input(/* ... */)
  .mutation(async ({ input, ctx }) => {
    const clientIp = ctx.req?.ip || ctx.req?.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(String(clientIp))) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many tenant creation requests. Please try again later.',
      });
    }
    // ... rest of mutation
  }),
```

**Effort:** 20 minutes
**Impact:** Prevents abuse of tenant creation

---

## Priority 3: Medium (Fix Within 1-2 Weeks)

### 3.1 Add Role Checks to Donations Router

**File:** `apps/api/src/routers/donations.ts`

**Add person-owned data check:**
```typescript
// Add helper function
function canAccessPersonData(userId: string, personId: string, userRole: string): boolean {
  // Admin/finance can access all
  if (['admin', 'editor'].includes(userRole)) return true;
  // Users can access their own data
  return userId === personId;
}

// In getByPerson endpoint, add check:
getByPerson: protectedProcedure
  .input(z.object({ personId: z.string().uuid() }))
  .query(async ({ input, ctx }) => {
    if (!canAccessPersonData(ctx.user.id, input.personId, ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this data',
      });
    }
    // ... rest of query
  }),
```

**Effort:** 30 minutes per router
**Impact:** Prevents IDOR vulnerabilities

### 3.2 Validate Image URLs

**File:** `apps/web/src/components/bulletins/canvas/ImageUploadButton.tsx`

**Add URL validation:**
```typescript
const ALLOWED_IMAGE_DOMAINS = [
  'images.unsplash.com',
  'cdn.pixabay.com',
  // Add your CDN domain
];

const handleUrlInput = () => {
  const url = prompt('Enter image URL:', currentImageUrl || '');
  if (url !== null && url.trim()) {
    try {
      const parsedUrl = new URL(url);

      // Only allow HTTPS
      if (parsedUrl.protocol !== 'https:') {
        alert('Only HTTPS URLs are allowed');
        return;
      }

      // Optional: Restrict to allowed domains
      // if (!ALLOWED_IMAGE_DOMAINS.includes(parsedUrl.host)) {
      //   alert('This domain is not allowed');
      //   return;
      // }

      setPreview(url);
      onImageSelected(url);
    } catch {
      alert('Invalid URL');
    }
  }
};
```

**Effort:** 10 minutes
**Impact:** Prevents malicious URL injection

### 3.3 Add npm audit to CI

**File:** `.github/workflows/ci.yml`

**Add new job:**
```yaml
  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=high
```

**Effort:** 5 minutes
**Impact:** Catches dependency vulnerabilities in CI

---

## Priority 4: Low (Improvements)

### 4.1 Generic Error Messages

**Pattern to apply across routers:**
```typescript
// Instead of:
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: `Database error: ${error.message}`,
});

// Use:
console.error('Database error:', error); // Log full error server-side
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'An error occurred. Please try again.',
});
```

### 4.2 Fix npm Audit Vulnerability

**Run:**
```bash
npm audit fix
```

If that doesn't work:
```bash
npm update sucrase
```

---

## Quick Reference: Files to Modify

| Priority | File | Line(s) | Issue |
|----------|------|---------|-------|
| P1 | `apps/api/src/db.ts` | 25, 39 | SQL injection |
| P1 | `apps/api/src/routers/serviceItems.ts` | 494 | SQL injection |
| P1 | `apps/api/src/routers/bulletins.ts` | 1774 | SQL injection |
| P2 | `apps/web/src/auth.ts` | 18-40 | Credentials provider |
| P2 | `apps/api/src/auth/jwt.ts` | 4 | JWT fallback |
| P2 | `apps/web/src/auth.ts` | 60 | Session duration |
| P2 | `apps/api/src/routers/tenants.ts` | 32 | Rate limiting |
| P3 | `apps/api/src/routers/donations.ts` | Various | Role checks |
| P3 | `apps/web/.../ImageUploadButton.tsx` | 79-85 | URL validation |
| P3 | `.github/workflows/ci.yml` | New job | Security audit |

---

## Verification Checklist

After applying fixes:

- [ ] Run `npm run build` - no compilation errors
- [ ] Run `npm test` - all tests pass
- [ ] Test tenant isolation manually with different tenant IDs
- [ ] Verify JWT errors in production-like environment
- [ ] Test rate limiting on tenant creation
- [ ] Run `npm audit` - no high/critical vulnerabilities

---

*For full context on each issue, see `SECURITY-REVIEW-SUMMARY.md`*
