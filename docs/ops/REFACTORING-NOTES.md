# Refactoring Notes

This document tracks refactoring decisions and changes made to improve code quality, maintainability, and security. Entries are ordered most recent first.

---

## 2025-12-06 – Phase 3 Refactors (Docs + Frontend Complexity)

**Scope:** Architecture documentation for Phase 2 backend utilities, plus frontend complexity reduction in Bulletins/Sermons UI.

### Changes Made

1. **Created Architecture Documentation**
   - File: `docs/architecture/QUERY-PATTERNS.md`
     - Documents `queryBuilders.ts` utilities (buildPartialUpdate, buildWhereClause)
     - Covers case conversion helpers (camelToSnake, snakeToCamel)
     - Provides usage examples and best practices

   - File: `docs/architecture/ERROR-HANDLING.md`
     - Documents `errors.ts` factory functions
     - Covers common, domain-specific, validation, and AI-related error factories
     - Documents type guards (isTRPCError, hasErrorCode, isUniqueViolation)

   - File: `docs/architecture/MAPPERS.md`
     - Documents `mappers.ts` row-to-DTO patterns
     - Explains three-layer architecture (DB → Row → DTO)
     - Provides guidelines for adding new mappers

2. **SaveAsTemplateModal: Replaced setTimeout with useEffect**
   - File: `apps/web/src/components/sermons/SaveAsTemplateModal.tsx`
   - Issue: setTimeout at lines 45-48 for auto-close after success is not React Strict Mode compatible.
   - Fix: Replaced with useEffect that triggers on `success` state change.
   - Behavior preserved: Modal still shows success message for 1.5s before auto-closing.

3. **BulletinCanvasEditor: Added memoization**
   - File: `apps/web/src/components/bulletins/canvas/BulletinCanvasEditor.tsx`
   - Added useMemo for expensive computations
   - Added useCallback for event handlers passed to child components
   - Improves render performance in complex canvas editing scenarios

### Tests Added/Updated

- Updated `apps/web/src/components/sermons/__tests__/SaveAsTemplateModal.test.ts`
  - Added tests for useEffect-based auto-close behavior
  - Verified cleanup on unmount

### Validation

All changes validated with:
- `npm run lint` (apps/web, apps/api)
- `npm run typecheck` (full monorepo)
- `npm test` (relevant test suites)

### Risk Assessment

- **Documentation**: Zero risk. Pure additions.
- **SaveAsTemplateModal useEffect**: Low risk. Same user-visible behavior, better React compatibility.
- **BulletinCanvasEditor memoization**: Low risk. Performance optimization only, no behavior change.

---

## 2025-12-06 – Phase 2 Refactors (Backend Utilities)

**Scope:** Created centralized backend utilities for query building, error handling, and row mapping.

### Changes Made

1. **Created Query Builder Utilities**
   - File: `apps/api/src/lib/queryBuilders.ts`
   - Provides `buildPartialUpdate()` and `buildWhereClause()` functions
   - Eliminates manual SQL parameter indexing
   - Auto-converts camelCase to snake_case

2. **Created Error Factory Utilities**
   - File: `apps/api/src/lib/errors.ts`
   - Provides consistent error factories (notFound, badRequest, forbidden, etc.)
   - Domain-specific factories (bulletinNotFound, sermonNotFound, etc.)
   - Type guards (isTRPCError, isUniqueViolation)

3. **Created Row Mapper Utilities**
   - File: `apps/api/src/lib/mappers.ts`
   - Type-safe row-to-DTO conversion
   - Bulletin mappers (list, detail, public, create)
   - Service item mappers

### Tests Added

- `apps/api/src/lib/__tests__/queryBuilders.test.ts`
- `apps/api/src/lib/__tests__/errors.test.ts`
- `apps/api/src/lib/__tests__/mappers.test.ts`

---

## 2025-12-06 – Phase 1 Refactors (PreachMode, Bulletins Auth, Input IDs, Manuscript Types)

**Scope:** Safety fixes and low-hanging fruit from codebase review.

### Changes Made

1. **PreachMode.tsx: Added 'use client' directive**
   - File: `apps/web/src/components/sermons/PreachMode.tsx`
   - Issue: Component uses React hooks and browser APIs but was missing the 'use client' directive, creating hydration risk in Next.js 14.
   - Fix: Added `'use client';` at the top of the file.

2. **Bulletins Router: Tightened authorization on mutations**
   - File: `apps/api/src/routers/bulletins.ts`
   - Issue: Four mutations (`delete`, `lock`, `saveGeneratorPayload`, `generateFromService`) used `protectedProcedure` which allows any authenticated user. These should require editor-level permissions.
   - Fix: Changed these four mutations from `protectedProcedure` to `editorProcedure`.
   - Affected lines: ~363, ~408, ~655, ~755
   - Impact: Only users with `admin` or `editor` roles can now delete, lock, or modify bulletin generation.

3. **Input.tsx: Replaced Math.random() with useId()**
   - File: `apps/web/src/components/ui/Input.tsx`
   - Issue: ID fallback used `Math.random()` which can cause hydration mismatches in SSR.
   - Fix: Replaced with React's `useId()` hook for stable, hydration-safe IDs.

4. **ManuscriptImportMeta: Exported missing type**
   - File: `packages/types/src/index.ts`
   - Issue: `ManuscriptImportMetaSchema` was defined but the inferred type `ManuscriptImportMeta` was not exported.
   - Fix: Added `export type ManuscriptImportMeta = z.infer<typeof ManuscriptImportMetaSchema>;`

### Tests Added/Updated

- Added authorization tests for bulletin mutations in `apps/api/src/__tests__/bulletinsAuth.test.ts`
- Added Input component ID generation tests in `apps/web/src/components/ui/__tests__/Input.test.ts`

### Validation

All changes validated with:
- `npm run lint` (apps/web, apps/api)
- `npm run typecheck` (full monorepo)
- `npm test` (relevant test suites)

### Risk Assessment

- **Authorization change**: Low risk. Only tightens security; does not loosen any permissions.
- **useId() change**: Zero risk. React 18+ hook, fully backward compatible.
- **Type export**: Zero risk. Pure addition, no behavior change.
- **'use client' directive**: Zero risk. Makes explicit what was implicit.

---
