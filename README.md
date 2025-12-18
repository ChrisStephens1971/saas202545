# Elder-First Church Platform

A modern, accessible church management platform designed with elder-first principles. Manage bulletins, people, events, and announcements with ease.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![tRPC](https://img.shields.io/badge/tRPC-10.x-blue)](https://trpc.io/)

---

## 🚀 Quick Start

**Get running in 10 minutes**: See **[Quick Start Guide](docs/QUICK-START.md)**

```bash
# 1. Install dependencies
npm install

# 2. Start database
docker-compose up -d

# 3. Run migrations & seed data
cd packages/database
npm run migrate && npm run seed

# 4. Start API server (port 8045)
cd apps/api && npm run dev

# 5. Start web app (port 3045)
cd apps/web && npm run dev

# 6. Open http://localhost:3045/login
```

---

## 📚 Documentation

- **[Quick Start Guide](docs/QUICK-START.md)** - Get running in 10 minutes
- **[API Documentation](docs/API-DOCUMENTATION.md)** - Complete API reference
- **[Database Schema](docs/DATABASE-SCHEMA.md)** - Database structure & RLS
- **[Dual-UI Runbook](docs/ui/DUAL-UI-RUNBOOK.md)** - UiMode architecture and dual-view pattern
- **[P15 Accessibility](artifacts/P15_accessibility.md)** - WCAG 2.1 AA and elder-first design
- **[Documentation Index](docs/README.md)** - All documentation

---

## ✨ Features

### ✅ Implemented (Sprints 1-2)

- **Multi-Tenant Architecture**: Row-Level Security (RLS) for data isolation
- **Bulletins Management**: Create, edit, lock bulletins for Sunday worship
- **Service Items**: Drag-and-drop order of worship with CCLI validation
- **PDF Generation**: Basic bulletin PDF download with formatted output
- **People Directory**: Manage members, attendees, and visitors
- **Events Calendar**: Month view calendar with event management
- **Event Management**: Create, edit, delete events with RSVP support
- **Announcements**: Priority-based with approval workflow
- **Dashboard**: Real statistics, active announcements, quick actions
- **Type-Safe API**: tRPC with full TypeScript inference
- **Responsive UI**: Elder-first design (18px min font, 48px touch targets)
- **Dev Authentication**: JWT-based auth (Azure AD B2C planned)

### 🚧 In Progress

- [ ] Forms builder
- [ ] Attendance tracking
- [ ] Groups management

### ⏳ Planned

- [ ] Forms builder
- [ ] Attendance tracking
- [ ] Giving/donations
- [ ] Groups management
- [ ] Enhanced PDF templates
- [ ] Slide generation for worship
- [ ] Azure AD B2C authentication

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **State**: React Query (TanStack Query)
- **API Client**: tRPC React

### Backend
- **API**: tRPC on Express
- **Database**: PostgreSQL 15
- **Validation**: Zod schemas
- **Authentication**: JWT (dev), Azure AD B2C (planned)
- **Multi-Tenancy**: Row-Level Security (RLS)

### Infrastructure
- **Monorepo**: Turborepo + npm workspaces
- **Database**: Docker Compose
- **Deployment**: Azure (planned)

---

## 📁 Project Structure

```
saas202545/
├── apps/
│   ├── api/                    # tRPC API server (port 8045)
│   │   ├── src/
│   │   │   ├── routers/        # API endpoints
│   │   │   ├── db.ts           # Database client + RLS
│   │   │   ├── trpc.ts         # tRPC setup
│   │   │   └── index.ts        # Express server
│   │   └── package.json
│   │
│   └── web/                    # Next.js frontend (port 3045)
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   ├── components/     # React components
│       │   └── lib/trpc/       # tRPC client
│       └── package.json
│
├── packages/
│   ├── database/               # Migrations & seed data
│   │   ├── migrations/         # SQL migration files
│   │   └── src/
│   │       ├── migrate.ts      # Migration runner
│   │       └── seed.ts         # Test data seeding
│   │
│   ├── types/                  # Shared TypeScript types
│   └── config/                 # Shared configuration
│
├── docs/                       # 📚 Documentation
│   ├── QUICK-START.md
│   ├── API-DOCUMENTATION.md
│   ├── DATABASE-SCHEMA.md
│   └── SESSION-2025-11-14.md
│
├── docker-compose.yml          # PostgreSQL container
└── package.json                # Monorepo root
```

---

## 🗄️ Database

### Schema Overview

24 tables with Row-Level Security:
- `tenant` - Multi-tenant organizations
- `person` - Church members/attendees
- `household` - Family groupings
- `bulletin_issue` - Sunday bulletins
- `service_item` - Order of worship
- `event` - Church events
- `announcement` - Announcements
- `brand_pack` - Visual branding
- `fund` - Giving/donations
- `communication_template` - Email/SMS templates
- `communication_campaign` - Email/SMS campaigns
- `directory_settings` - Member privacy settings
- `prayer_request` - Prayer requests
- Plus 11 more tables...

**Full schema**: See [Database Schema Documentation](docs/DATABASE-SCHEMA.md)

### Multi-Tenancy

Every query automatically filtered by tenant using PostgreSQL RLS:

```sql
-- User writes:
SELECT * FROM person WHERE email = 'john@example.com';

-- PostgreSQL executes:
SELECT * FROM person
WHERE email = 'john@example.com'
  AND tenant_id = current_setting('app.tenant_id')::uuid;
```

No way to access other tenant's data—enforced at database level.

---

## 🔌 API

### tRPC Endpoints

**Bulletins**: `list`, `get`, `create`, `update`, `delete`, `lock`
**People**: `list`, `get`, `create`, `update`, `delete`
**Service Items**: `list`, `create`, `update`, `delete`, `reorder`
**Events**: `list`, `get`, `create`, `update`, `delete`
**Announcements**: `listActive`, `list`, `get`, `create`, `update`, `delete`, `approve`

### Example Usage

```typescript
// Frontend query
const { data } = trpc.bulletins.list.useQuery({
  limit: 20,
  status: 'draft',
});

// Frontend mutation
const createBulletin = trpc.bulletins.create.useMutation();
await createBulletin.mutate({
  serviceDate: '2025-11-17T10:00:00Z',
});
```

**Full API reference**: See [API Documentation](docs/API-DOCUMENTATION.md)

---

## 🧪 Testing

### Test Data

Seed data includes:
- **Tenant**: Grace Community Church (`gracechurch`)
- **People**: 4 test people
- **Bulletin**: Next Sunday's bulletin
- **Service Items**: 9 worship items
- **Announcements**: 3 test announcements

```bash
cd packages/database
npm run seed
```

### Dev Login Accounts

Development uses in-memory test accounts with passwords loaded from environment variables.

**Quick setup:**
1. Create `apps/web/.env.development.local` (see [docs/DEV-ACCOUNTS.md](docs/DEV-ACCOUNTS.md))
2. Set `ALLOW_DEV_USERS=true` and `NEXT_PUBLIC_DEV_MODE=true`
3. Set passwords for test accounts (e.g., `DEV_ADMIN_PASSWORD=yourpassword`)
4. Restart dev server

**Validate configuration:**
```bash
npm run dev:check-accounts
```

**Sync accounts to database (optional):**
```bash
npm run dev:reset-accounts
```

**Test accounts:** admin@dev.com, editor@dev.com, submitter@dev.com, viewer@dev.com, kiosk@dev.com

Full setup instructions: [docs/DEV-ACCOUNTS.md](docs/DEV-ACCOUNTS.md)

### Manual Testing

1. Login at http://localhost:3045/login
2. View bulletins at http://localhost:3045/bulletins
3. View people at http://localhost:3045/people
4. API health: `curl http://localhost:8045/health`

---

## 🛠️ Development

### Commands

```bash
# Install dependencies
npm install

# Start development servers
docker-compose up -d           # Database
cd apps/api && npm run dev     # API (port 8045)
cd apps/web && npm run dev     # Web (port 3045)

# Database
cd packages/database
npm run migrate                # Run migrations
npm run seed                   # Seed test data

# Quality checks
npm run typecheck              # TypeScript
npm run lint                   # ESLint
npm run build                  # Production build
```

### Before Committing

```bash
# 1. Typecheck
npm run typecheck

# 2. Lint
npm run lint

# 3. Commit
git add .
git commit -m "feat: description"
```

### Security Tests (mandatory for auth/data changes)

The platform includes a dedicated security test suite covering authentication, RBAC, CSRF protection, SQL injection prevention, RLS, and bulletin access rules.

```bash
# From repo root
npm run test:security
```

Run this before merging any changes that touch:
- Authentication or login flows
- Roles/permissions
- Database access patterns
- Bulletin generation or access rules

For full details of what this suite covers, see [docs/SECURITY-TESTS.md](./docs/SECURITY-TESTS.md).

---

## 🎨 Design Principles

### Elder-First Design

- **18px minimum font size** (most platforms use 14-16px)
- **48px minimum touch targets** (WCAG requires 44px)
- **WCAG AA contrast** (4.5:1 text, 3:1 UI components)
- **Clear visual hierarchy**
- **Consistent spacing** (8px grid)
- **Simple navigation**

### Accessibility

- Keyboard navigation support
- Screen reader friendly
- High contrast mode
- No auto-playing content
- Clear error messages

---

## 🔒 Security

### Implemented
- ✅ Row-Level Security (RLS) at database level
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Rate limiting (general + auth endpoints)
- ✅ CSRF protection (Bearer token model)
- ✅ Security headers (Helmet)
- ✅ Secrets scanning in CI (Gitleaks)
- ✅ Automated security test suite (75 tests)

### Security Status (as of 2025-12-06)

The Elder-First Church Platform has completed a comprehensive 10-phase security audit covering:

- Authentication and session handling
- Authorization and role/tenant isolation
- Database access and row-level security (RLS)
- Input validation, XSS/CSRF protection, and rate limiting
- Secrets management and configuration
- Logging, error handling, and CI/CD security checks

**Latest audit (2025-12-06):**

- 0 Critical findings
- 0 High findings
- 2 Low findings (both remediated)
- 1 Informational item

All previously identified Critical and High issues were fixed in earlier hardening phases.
The full audit report is available at: `docs/SECURITY-AUDIT-REPORT-2025-12-06.md`.
Ongoing security status and maintenance items (including the next-auth 5.x beta → stable upgrade) are tracked in: `docs/SECURITY-STATUS.md`.

### Security Testing

Run the security test suite before any auth/data changes:

```bash
npm run test:security
```

See [docs/SECURITY-TESTS.md](./docs/SECURITY-TESTS.md) for details, or [docs/SECURITY-STATUS.md](./docs/SECURITY-STATUS.md) for full security posture.

### Planned for Production
- [ ] Azure AD B2C with OAuth 2.0
- [ ] JWT signing with RS256
- [ ] HTTPS enforcement
- [ ] Secrets in Azure Key Vault

---

## 📦 Deployment

### Planned Infrastructure (Azure)

- **App Service**: Web app + API
- **PostgreSQL**: Azure Database for PostgreSQL
- **Key Vault**: Secrets management
- **Front Door**: CDN + WAF
- **Monitor**: Application Insights
- **AD B2C**: Authentication

**Canonical environment URLs**: See [`docs/ops/ENVIRONMENT-URLS.md`](docs/ops/ENVIRONMENT-URLS.md)

**Deployment guide**: See [`docs/PRODUCTION-DEPLOYMENT.md`](docs/PRODUCTION-DEPLOYMENT.md)

---

## 🤝 Contributing

### Workflow

1. Create feature branch: `git checkout -b feat/my-feature`
2. Make changes
3. Run tests: `npm run typecheck && npm run lint`
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feat/my-feature`
6. Create Pull Request

### Commit Message Format

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

---

## 📋 Roadmap

### Sprint 1 (✅ COMPLETED)
- [x] Database schema with RLS
- [x] All 5 main routers implemented
- [x] Frontend pages (bulletins, people)
- [x] Service items drag-and-drop UI
- [x] End-to-end bulletin flow

### Sprint 2 (✅ COMPLETED)
- [x] Events calendar view
- [x] Announcements management
- [x] Dashboard with stats
- [x] PDF bulletin generation (basic)

### Sprint 3 (✅ COMPLETED)
- [x] Forms builder
- [x] Attendance tracking
- [x] Groups management

### Sprint 4 (✅ COMPLETED)
- [x] Giving/donations
- [x] Azure AD B2C authentication (documented)
- [x] Production deployment (documented)

### Sprint 5 (✅ COMPLETED)
- [x] Communications & Notifications (email/SMS campaigns)
- [x] Member Directory with privacy settings
- [x] Prayer Requests with tracking

---

## 🤖 AI / MCP Tooling

This repository has first-class documentation for MCP (Model Context Protocol) servers used by AI coding agents (Claude Code, Gemini CLI, etc.). MCP configuration lives **only on the developer's machine**, not in the repo.

- **[MCP Servers Guide](docs/dev/MCP-SERVERS.md)** - Complete guide to GitHub, Azure, Redis, and docs MCP servers
- **[Playwright Guardrails](docs/mcp/PLAYWRIGHT-GUARDRAILS.md)** - Rules for browser automation

**Browser automation rules (in short):**
- Use staging URLs only (never production)
- Use low-privilege test accounts only
- Do not delete or bulk-modify existing data
- Any test data created by agents must be clearly marked with a `[MCP-TEST]` prefix

---

## 📝 License

Private - All Rights Reserved

---

## 🙏 Acknowledgments

Built with:
- [tRPC](https://trpc.io) - Type-safe APIs
- [Next.js](https://nextjs.org) - React framework
- [PostgreSQL](https://www.postgresql.org) - Database
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [Zod](https://zod.dev) - Schema validation

---

## 📞 Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues
- **Questions**: Developer Slack channel

---

**Version**: 0.2.0 (Sprint 2)
**Last Updated**: November 15, 2025
**Status**: In Active Development
