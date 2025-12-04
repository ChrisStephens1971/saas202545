# Security Phase 2.5 – NODE_ENV Typing Cleanup

**Date:** 2025-12-04
**Branch:** `feature/security-phase-2-5-node-env-typing`
**Related:** `SECURITY-AUDIT-2025-12-04.md`, `SECURITY-REMEDIATION-PHASE-2-2025-12-04.md`

---

## Overview

This document summarizes the NODE_ENV typing cleanup implemented in Phase 2.5. The goal was to eliminate TypeScript errors around `process.env.NODE_ENV` and `'staging'` comparisons without changing runtime security behavior.

**Key Constraint:** No security logic changes from Phase 1 or Phase 2 were made.

---

## Problem

TypeScript's built-in `NodeJS.ProcessEnv` type defines `NODE_ENV` as:

```typescript
NODE_ENV?: 'development' | 'production' | 'test'
```

This caused TypeScript errors when comparing `NODE_ENV` to `'staging'`:

```typescript
// TS Error: This comparison appears to be unintentional because
// the types '"development" | "production" | "test"' and '"staging"' have no overlap.
if (process.env.NODE_ENV === 'staging') { ... }
```

---

## Solution

Created centralized environment helpers that:

1. Define a custom `NodeEnv` type including `'staging'`
2. Provide type-safe environment checks
3. Log warnings for unexpected environment values
4. Default to `'development'` for invalid values (safe fallback)

---

## Files Created

### API Environment Helper

**File:** `apps/api/src/config/env.ts`

```typescript
export type NodeEnv = 'development' | 'test' | 'production' | 'staging';

export const NODE_ENV: NodeEnv = getNodeEnv();
export const IS_DEV: boolean = NODE_ENV === 'development';
export const IS_TEST: boolean = NODE_ENV === 'test';
export const IS_PROD: boolean = NODE_ENV === 'production';
export const IS_STAGING: boolean = NODE_ENV === 'staging';
export const IS_PROD_LIKE: boolean = IS_PROD || IS_STAGING;
export const IS_NON_PROD: boolean = !IS_PROD_LIKE;
```

### Web Environment Helper

**File:** `apps/web/src/config/env.ts`

Identical structure to API helper.

---

## Files Modified

### API Files

| File | Change |
|------|--------|
| `apps/api/src/auth/jwt.ts` | Import `IS_PROD_LIKE`, `IS_TEST` from env helper |
| `apps/api/src/db.ts` | Import `IS_PROD_LIKE` from env helper |
| `apps/api/src/trpc.ts` | Import `IS_PROD` from env helper |
| `apps/api/src/index.ts` | Import `IS_PROD` from env helper |
| `apps/api/src/utils/encryption.ts` | Use `IS_PROD_LIKE` via require() |

### Web Files

| File | Change |
|------|--------|
| `apps/web/src/auth.ts` | Import `IS_DEV`, `NODE_ENV` from env helper |
| `apps/web/src/app/api/auth/token/route.ts` | Import `IS_PROD_LIKE` from env helper |

---

## Refactoring Pattern

### Before

```typescript
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv === 'production' || nodeEnv === 'staging') {
  // production-like behavior
}
```

### After

```typescript
import { IS_PROD_LIKE } from './config/env';

if (IS_PROD_LIKE) {
  // production-like behavior
}
```

---

## Runtime Behavior

**No changes to runtime behavior.** The refactoring is purely for type safety:

| Environment | Behavior |
|-------------|----------|
| `development` | Dev mode, relaxed security |
| `test` | Test mode |
| `staging` | Production-like security |
| `production` | Full production security |
| Invalid/undefined | Defaults to `development` with console warning |

---

## Convenience Exports

| Export | Description |
|--------|-------------|
| `NODE_ENV` | The current environment as `NodeEnv` type |
| `IS_DEV` | `NODE_ENV === 'development'` |
| `IS_TEST` | `NODE_ENV === 'test'` |
| `IS_PROD` | `NODE_ENV === 'production'` |
| `IS_STAGING` | `NODE_ENV === 'staging'` |
| `IS_PROD_LIKE` | `IS_PROD || IS_STAGING` (for security checks) |
| `IS_NON_PROD` | `!IS_PROD_LIKE` |

---

## Verification

### TypeScript Compilation

After refactoring:

```bash
# API - No NODE_ENV/staging errors
cd apps/api && npx tsc --noEmit

# Web - No NODE_ENV/staging errors
cd apps/web && npx tsc --noEmit
```

### Security Behavior Unchanged

All security checks that previously used:
- `nodeEnv === 'production' || nodeEnv === 'staging'`

Now use:
- `IS_PROD_LIKE`

The logical behavior is identical.

---

## Usage Guidelines

### When to use each export

```typescript
// Use IS_DEV for development-only features
if (IS_DEV) {
  enableDevTools();
}

// Use IS_PROD_LIKE for security checks that apply to both prod and staging
if (IS_PROD_LIKE) {
  validateSecrets();
  requireSSL();
}

// Use IS_PROD for strict production-only behavior
if (IS_PROD) {
  enableProductionAnalytics();
}

// Use NODE_ENV when you need the actual string value
logger.info(`Running in ${NODE_ENV} mode`);
```

---

## Remaining TypeScript Errors

The following TypeScript errors exist in the web app but are **unrelated to NODE_ENV**:

- Test file type mismatches (sermon tests)
- Component prop type errors (TemplateSelector)

These are out of scope for Phase 2.5 and should be addressed separately.

---

## Summary

Phase 2.5 successfully:

- ✅ Created centralized env helpers for API and Web
- ✅ Refactored all NODE_ENV === 'staging' comparisons
- ✅ Eliminated TypeScript errors related to NODE_ENV
- ✅ Maintained identical runtime behavior
- ✅ Did not change any security logic from Phase 1/2
