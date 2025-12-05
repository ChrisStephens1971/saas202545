# Session: Error Inventory Fixes

**Date:** 2025-12-03
**Type:** Maintenance / Bug Fixes
**Status:** Completed

## Summary

Systematic fix of all build, lint, and runtime errors identified in the error inventory from the previous session.

## Issues Resolved

### Phase 1: TypeScript Monorepo Configuration (TS6059/TS6307)

**Problem:** TypeScript errors about files not being under `rootDir` when importing from internal packages:
- `TS6059: File 'packages/types/src/index.ts' is not under 'rootDir'`
- `TS6307: File 'packages/database/src/index.ts' is not listed within include`

**Solution:** Updated `apps/api/tsconfig.json`:
- Set `rootDir: "../.."` (monorepo root instead of `src/`)
- Expanded `include` to cover all package sources:
  ```json
  "include": [
    "src/**/*",
    "../../packages/types/src/**/*",
    "../../packages/database/src/**/*",
    "../../packages/config/src/**/*",
    "../../packages/shared/src/**/*"
  ]
  ```

### Phase 2: Runtime Error - Missing scripture_text Column

**Problem:** PostgreSQL error `column scripture_text does not exist` when generating bulletins.

**Solution:** Already fixed in previous session - the SQL query in `bulletins.ts` no longer references the `scripture_text` column. Verified the fix is working.

### Phase 3A: Unused Import (TS6133)

**Problem:** Unused import `adminProcedure` in `apps/api/src/routers/donations.ts`.

**Solution:** Removed `adminProcedure` from the import statement.

### Phase 3B: ESLint dist/ Directory

**Problem:** ESLint was linting the compiled `dist/` directory in the API package.

**Solution:** Added `ignorePatterns` to `apps/api/.eslintrc.json`:
```json
"ignorePatterns": ["dist/**", "node_modules/**", "*.js"]
```

### Phase 3C: React Unescaped Entities (47+ errors)

**Problem:** Multiple files had unescaped quotes and apostrophes in JSX text content, violating `react/no-unescaped-entities` rule.

**Solution:** Replaced raw characters with HTML entities:
- `'` replaced with `&apos;`
- `"` replaced with `&quot;`

**Files Fixed:**
- `apps/web/src/app/attendance/new/page.tsx`
- `apps/web/src/app/auth/forbidden/page.tsx`
- `apps/web/src/app/bulletins/[id]/generator/page.tsx`
- `apps/web/src/app/bulletins/[id]/page.tsx`
- `apps/web/src/app/bulletins/[id]/print/page.tsx`
- `apps/web/src/app/directory/page.tsx`
- `apps/web/src/app/forms/new/page.tsx`
- `apps/web/src/components/bulletins/canvas/BulletinLayoutWizard.tsx`
- `apps/web/src/components/bulletins/canvas/DriftTestHelper.tsx`
- `apps/web/src/components/bulletins/ServiceOrderPanel.tsx`
- `apps/web/src/components/sermons/SermonBuilder.tsx`

### Phase 4: Next.js Metadata themeColor Warning

**Problem:** Deprecation warning for `themeColor` in metadata export (Next.js 14+ requires it in `viewport` export).

**Solution:** Updated `apps/web/src/app/layout.tsx`:
- Moved `themeColor` from `metadata` to new `viewport` export
- Added `Viewport` type import

```tsx
// Before
export const metadata: Metadata = {
  title: '...',
  themeColor: '#0ea5e9',
};

// After
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '...',
};

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
};
```

## Verification Commands

All commands should now pass without errors:

```bash
# TypeScript type checking
npm run typecheck

# Build
npm run build

# API ESLint
cd apps/api && npx eslint . --ext .ts --quiet

# Web Next.js lint (warnings remain, no errors)
cd apps/web && npx next lint

# Tests
npm run test

# Dev server (no runtime errors)
npm run dev
```

## Remaining Warnings (Not Errors)

The following warnings were observed but are not blocking errors:

1. **react-hooks/exhaustive-deps** - React hook dependency array warnings (cosmetic, not breaking)
2. **@next/next/no-img-element** - Suggestion to use Next.js Image component (optimization, not required)

These warnings can be addressed in future iterations if desired.

## Files Modified

| File | Change |
|------|--------|
| `apps/api/tsconfig.json` | Updated rootDir and include patterns |
| `apps/api/.eslintrc.json` | Added ignorePatterns |
| `apps/api/src/routers/donations.ts` | Removed unused import |
| `apps/web/src/app/layout.tsx` | Moved themeColor to viewport export |
| Multiple web app files | Fixed unescaped entities in JSX |

## No Changes Made To

- Database migrations
- Dependencies (package.json)
- Production/cloud infrastructure
- Git commits/pushes (per instructions)
