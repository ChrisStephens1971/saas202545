# Changelog

### 2025-12-12

- Added reporting baseline documentation (`docs/reporting/`) per fleet compliance requirements


All notable changes to the Elder-First Church Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## 2025-12-06 – Security Audit & Final Hardening

- Completed full 10-phase security audit of the Elder-First Church Platform.
- Confirmed strong security posture:
  - 0 Critical findings
  - 0 High findings
  - 2 Low findings (both fixed)
  - 1 Informational item
- Fixed LOW-001: Database tenant context now uses parameterized `set_config` calls in:
  - `packages/database/src/index.ts`
  - `packages/database/src/seed.ts`
- Documented the audit in:
  - `docs/SECURITY-AUDIT-REPORT-2025-12-06.md`
  - `docs/SECURITY-STATUS.md`
  - `docs/SECURITY-REVIEW-SUMMARY.md` (Follow-Up Audit section)
- Opened maintenance task to track upgrade from `next-auth@5.0.0-beta.30` to a stable release when available.

---

## [Unreleased]

### Added (Experimental)

- **Carbon Shell experiment (dev only)** - New experimental UI shell inspired by IBM Carbon Design System.
  - Light top bar with app branding and user avatar
  - Left sidebar navigation with active state styling
  - Calm, neutral background colors with flat white cards
  - Strong typography hierarchy
  - Shell variant controlled by `NEXT_PUBLIC_CHURCH_UI_SHELL_VARIANT` env var (`legacy` | `carbon`)
  - Density controlled by `NEXT_PUBLIC_CHURCH_UI_DENSITY` env var (`standard` | `elder`)
  - Initially applied to `/bulletins` only
  - Config helper: `apps/web/src/config/uiShellVariant.ts`
  - Components: `apps/web/src/ui/carbon/`
  - Documentation: `docs/ui/CARBON-SHELL-EXPERIMENT.md`

### Fixed

- **Single-chip pattern for bulletin status display** - Fixed duplicate "Deleted" tags appearing on bulletin cards. Previously, deleted bulletins showed both a status chip and a separate "Deleted" badge. Now each bulletin card displays exactly one status chip:
  - Deleted bulletins: Single red "Deleted" chip (no duplicates)
  - Non-deleted bulletins: Single status chip (Locked/Built/Approved/Draft)
  - Updated `apps/web/src/app/bulletins/page.tsx` with single-chip rendering logic
  - Updated tests (29 tests) to verify single-chip behavior and edge cases
  - Updated `docs/ui/BULLETINS.md` with "Status Chip (Single Chip Pattern)" documentation

- **Normalized bulletin soft-delete mechanism** - Fixed data inconsistency "landmine" where two soft-delete mechanisms (`deleted_at` timestamp and `status = 'deleted'` enum) could get out of sync.
  - Added migration `039_normalize_bulletin_soft_delete.sql`:
    - Backfills `deleted_at` for orphaned `status='deleted'` rows
    - Backfills `status='deleted'` for orphaned `deleted_at IS NOT NULL` rows
    - Creates new partial unique index using `deleted_at IS NULL`
    - Adds CHECK constraint `bulletin_deleted_consistent` enforcing: `(status = 'deleted') = (deleted_at IS NOT NULL)`
  - Updated delete procedure to set both `deleted_at = NOW()` and `status = 'deleted'`
  - Simplified filter logic to use only `deleted_at` as the canonical flag
  - Updated seed.ts to comply with CHECK constraint
  - Updated tests (35 tests, up from 31) to document CHECK constraint behavior
  - Updated `docs/ui/BULLETINS.md` with canonical rule documentation

### Added

- **Bulletins page filter dropdown** - Added a filter dropdown to the Bulletins page allowing users to switch between different views of bulletins. By default, only published bulletins are shown (hiding drafts and deleted).
  - Filter options: Active (Published), Drafts, Deleted, All
  - Default filter is "Active" which shows only approved, built, and locked bulletins
  - Added `BulletinFilterSchema` enum to backend for filter validation
  - Updated `bulletins.list` tRPC procedure to accept filter parameter
  - Added "Deleted" badge on bulletin cards when viewing deleted bulletins
  - Filter-aware empty state messages (e.g., "No draft bulletins found")
  - 28 backend tests for filter logic (`apps/api/src/__tests__/bulletinsFilter.test.ts`)
  - 29 frontend tests for UI behavior (`apps/web/src/app/bulletins/__tests__/BulletinsPage.test.ts`)
  - Documentation: `docs/ui/BULLETINS.md`

### Fixed

- **Theology Settings 'Invalid enum value' error** - Fixed validation error when saving theology settings with detailed tradition labels (e.g., "Presbyterian (PCA)"). The backend expected canonical values ("Presbyterian") but the UI was sending display labels.
  - Introduced shared `THEOLOGICAL_TRADITIONS` constant in `@elder-first/types` for canonical tradition values
  - Added `THEOLOGY_TRADITION_OPTIONS` mapping detailed labels to canonical values
  - Added helper functions `getCanonicalTradition()` and `getTraditionDisplayLabel()` for bidirectional conversion
  - Updated UI select dropdown to track display labels separately from stored canonical values
  - Fixed Bible translation and sensitivity values to match backend schema (removed RSV/NRSV, changed 'broad' to 'progressive')
  - No database migration required - stored values remain unchanged

- **Website validation error on Bulletin AI settings** - Introduced a shared `WebsiteSchema` in `@elder-first/types` with auto-normalization. Previously, enabling AI on `settings/bulletins` would fail with "Invalid url" if the organization website was stored as a bare hostname (e.g., `mychurch.org`). The schema now:
  - Allows blank/empty values
  - Accepts full URLs with protocol (`https://example.com`)
  - Auto-normalizes bare hostnames to `https://` prefix
  - Rejects truly invalid URLs

  Front-end validation on Organization and Bulletin settings pages was also aligned. See [Website Field Guide](docs/settings/WEBSITE-FIELD-GUIDE.md) for details.

### Changed

- **Navigation layout refactored to left-hand sidebar** - Replaced top header navigation with a left-hand sidebar layout for improved navigation experience and scalability.
  - Created `SidebarNav` component with vertical navigation items (icon + label)
  - Implemented active state styling using pathname matching (exact for Dashboard, prefix for others)
  - Added mobile-responsive design with hamburger menu and slide-in drawer
  - Extracted navigation configuration to `src/config/navigation.ts` for shared use
  - All existing role-based visibility rules preserved (Thank-Yous for submitter+, Donations/Communications for editor+)
  - Added 47 new tests for navigation configuration, role visibility, and active state logic
  - Updated navigation documentation (`docs/ui/NAVIGATION.md`)

### Added

- **Theology Settings Guide** (`docs/settings/THEOLOGY-SETTINGS.md`) - Comprehensive documentation for the theology settings model, canonical vs display value pattern, and shared types usage.
- **Theology Settings types and tests** - 19 new tests in `packages/types/src/__tests__/theologySettings.test.ts` covering all theology schema validation scenarios and helper functions.
- **Development Rules** (`docs/DEV-RULES.md`) - Mandatory rules for using shared types and enums across the platform.
- **Website Field Guide** (`docs/settings/WEBSITE-FIELD-GUIDE.md`) - Documentation for how the org website field is validated, normalized, and used by bulletin AI settings.
- **WebsiteSchema tests** - 24 new tests in `packages/types` covering all validation scenarios.
- **Sermons and Thank-Yous in main navigation** - Added Sermons and Thank-Yous pages to the main app navigation bar.
  - Sermons (`/sermons`) - visible to all authenticated users
  - Thank-Yous (`/thank-yous`) - visible to admin, editor, and submitter roles
  - Added navigation documentation (`docs/ui/NAVIGATION.md`)
  - Added 30 navigation tests (`apps/web/src/components/layout/__tests__/Header.navigation.test.ts`)

---

## [0.1.0] - 2025-11-14

### Added

- Initial project scaffolding with monorepo structure
- Database schema with Row-Level Security (RLS)
- tRPC API setup with all core routers
- Frontend pages for bulletins and people management
- Dev authentication mode
- Seed data for testing
