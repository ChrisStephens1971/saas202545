# Session: Next.js 3135.js Module Error Fix

**Date:** 2025-12-03
**Issue:** `Error: Cannot find module './3135.js'`

## The Error

```
Server Error
Error: Cannot find module './3135.js'
Require stack:
- apps/web/.next/server/webpack-runtime.js
- apps/web/.next/server/app/_not-found/page.js
- node_modules/next/dist/server/require.js
...
```

## Root Cause

The `.next` build cache became corrupted, likely due to one of:
- An interrupted build/dev process
- Hot Module Replacement (HMR) state corruption during development
- Disk write issues during build output

The `3135.js` file was a webpack chunk that the runtime expected but was either missing or incomplete in the cached build output.

## Investigation Findings

1. **next.config.js** - Standard configuration, no custom webpack manipulation
2. **Source code** - No suspicious dynamic imports or numeric chunk references
3. **Build system** - Turbo-based monorepo with correct clean/build pipeline

## Resolution

Deleted the corrupted `.next` directory and rebuilt:

```bash
npx rimraf apps/web/.next
npm run build --workspace=@elder-first/web
```

Build completed successfully with all 41 pages generated.

## Files Changed

- `package.json` - Added `clean:web` convenience script for future cache issues

## Prevention

If this error occurs again:

1. **Quick fix:** Run `npm run clean:web` from repo root, then `npm run build`
2. **Full clean:** Run `npm run clean` to clear all workspace caches
3. **If persists:** Check for filesystem issues or incomplete git operations

## Verification

```bash
# Clean web build cache
npm run clean:web

# Rebuild
npm run build

# Start dev (after stopping any existing dev server)
npm run dev
```

All pages should load without the `./3135.js` error.
