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
- **[Session Notes](docs/SESSION-2025-11-14.md)** - Latest development session
- **[Documentation Index](docs/README.md)** - All documentation

---

## ✨ Features

### ✅ Implemented (Sprint 1)

- **Multi-Tenant Architecture**: Row-Level Security (RLS) for data isolation
- **Bulletins Management**: Create, edit, lock bulletins for Sunday worship
- **People Directory**: Manage members, attendees, and visitors
- **Service Items**: Order of worship with CCLI number validation
- **Events Calendar**: Schedule and manage church events
- **Announcements**: Priority-based church announcements
- **Type-Safe API**: tRPC with full TypeScript inference
- **Responsive UI**: Elder-first design (18px min font, 48px touch targets)
- **Dev Authentication**: JWT-based auth (Azure AD B2C planned)

### 🚧 In Progress

- [x] End-to-end bulletin creation flow
- [x] Service items drag-and-drop UI
- [ ] Dashboard with quick stats (basic version exists)

### ⏳ Planned

- [ ] PDF bulletin generation
- [ ] Forms builder
- [ ] Attendance tracking
- [ ] Giving/donations
- [ ] Groups management
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

18 tables with Row-Level Security:
- `tenant` - Multi-tenant organizations
- `person` - Church members/attendees
- `household` - Family groupings
- `bulletin_issue` - Sunday bulletins
- `service_item` - Order of worship
- `event` - Church events
- `announcement` - Announcements
- `brand_pack` - Visual branding
- `fund` - Giving/donations
- Plus 9 more tables...

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

### Manual Testing

1. Login at http://localhost:3045/login (any credentials)
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

### Current (Development)
- ✅ Row-Level Security (RLS) at database level
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Soft deletes (audit trail)
- ⚠️ Simple JWT (dev only, **NOT production ready**)

### Required for Production
- [ ] Azure AD B2C with OAuth 2.0
- [ ] JWT signing with RS256
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] Input sanitization
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

**Deployment guide**: Coming soon

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

### Sprint 2 (Weeks 3-4)
- [ ] Events calendar view
- [ ] Announcements management
- [ ] Dashboard with stats
- [ ] PDF bulletin generation (basic)

### Sprint 3 (Weeks 5-6)
- [ ] Forms builder
- [ ] Attendance tracking
- [ ] Groups management

### Sprint 4 (Weeks 7-8)
- [ ] Giving/donations
- [ ] Azure AD B2C authentication
- [ ] Production deployment

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

**Version**: 0.1.0 (Sprint 1)
**Last Updated**: November 14, 2025
**Status**: In Active Development
