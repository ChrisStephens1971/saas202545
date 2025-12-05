# Changelog

All notable changes to the Elder-First Church Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Fixed

- **Website validation error on Bulletin AI settings** - Introduced a shared `WebsiteSchema` in `@elder-first/types` with auto-normalization. Previously, enabling AI on `settings/bulletins` would fail with "Invalid url" if the organization website was stored as a bare hostname (e.g., `mychurch.org`). The schema now:
  - Allows blank/empty values
  - Accepts full URLs with protocol (`https://example.com`)
  - Auto-normalizes bare hostnames to `https://` prefix
  - Rejects truly invalid URLs

  Front-end validation on Organization and Bulletin settings pages was also aligned. See [Website Field Guide](docs/settings/WEBSITE-FIELD-GUIDE.md) for details.

### Added

- **Website Field Guide** (`docs/settings/WEBSITE-FIELD-GUIDE.md`) - Documentation for how the org website field is validated, normalized, and used by bulletin AI settings.
- **WebsiteSchema tests** - 24 new tests in `packages/types` covering all validation scenarios.

---

## [0.1.0] - 2025-11-14

### Added

- Initial project scaffolding with monorepo structure
- Database schema with Row-Level Security (RLS)
- tRPC API setup with all core routers
- Frontend pages for bulletins and people management
- Dev authentication mode
- Seed data for testing
