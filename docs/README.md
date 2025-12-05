# Documentation Index

Complete documentation for the Elder-First Church Platform.

---

## Getting Started

### New Developers
1. **[Quick Start Guide](QUICK-START.md)** - Get running in 10 minutes
2. **[Session Notes](SESSION-2025-11-14.md)** - Latest development session
3. **[API Documentation](API-DOCUMENTATION.md)** - API reference

### Experienced Developers
1. **[Database Schema](DATABASE-SCHEMA.md)** - Database structure
2. **[API Documentation](API-DOCUMENTATION.md)** - Endpoint details
3. **[Session Notes](SESSION-2025-11-14.md)** - Implementation details

---

## Documentation Files

### [QUICK-START.md](QUICK-START.md)
**For**: New developers, onboarding
**Contents**:
- Installation steps (7 steps, ~10 minutes)
- Running the application
- Testing the setup
- Common issues and solutions
- Daily development workflow

**Start here** if you're new to the project.

---

### [SESSION-2025-11-14.md](SESSION-2025-11-14.md)
**For**: Understanding implementation details
**Contents**:
- Complete session summary (database integration)
- All routers implemented (bulletins, people, service items, events, announcements)
- Database setup (migrations, seed data)
- Frontend configuration
- Errors encountered and solutions
- Technical architecture diagrams
- File changes summary
- Testing checklist

**Read this** to understand how the system was built.

---

### [API-DOCUMENTATION.md](API-DOCUMENTATION.md)
**For**: Frontend developers, API consumers
**Contents**:
- Authentication (JWT, headers)
- Common patterns (pagination, soft deletes, dates)
- All API endpoints:
  - Bulletins API (list, get, create, update, delete, lock)
  - People API (list, get, create, update, delete)
  - Service Items API (list, create, update, delete, reorder)
  - Events API (list, get, create, update, delete)
  - Announcements API (listActive, list, get, create, update, delete, approve)
- Error codes
- TypeScript client usage examples

**Reference this** when building frontend features.

---

### [DATABASE-SCHEMA.md](DATABASE-SCHEMA.md)
**For**: Backend developers, database administrators
**Contents**:
- Database overview (PostgreSQL + RLS)
- All table schemas (18 tables)
- Indexes and performance considerations
- Row-Level Security policies
- Database functions
- Migration guide
- Seeding data
- Backup and recovery
- Performance optimization

**Reference this** when working with the database.

---

## Quick Reference

### Running the Application

```bash
# Start database
docker-compose up -d

# Start API (port 8045)
cd apps/api && npm run dev

# Start web (port 3045)
cd apps/web && npm run dev
```

### Database Commands

```bash
# Run migrations
cd packages/database && npm run migrate

# Seed test data
npm run seed

# Connect to database
docker exec -it elder-first-postgres psql -U postgres -d elder_first
```

### Development Commands

```bash
# Typecheck all packages
npm run typecheck

# Lint all packages
npm run lint

# Build all packages
npm run build
```

---

## Project Structure

```
saas202545/
├── apps/
│   ├── api/              # tRPC API server (port 8045)
│   └── web/              # Next.js frontend (port 3045)
├── packages/
│   ├── database/         # Migrations, seed data
│   ├── types/            # Shared TypeScript types
│   └── config/           # Shared configuration
├── docs/                 # 📍 YOU ARE HERE
│   ├── README.md         # This file
│   ├── QUICK-START.md
│   ├── SESSION-2025-11-14.md
│   ├── API-DOCUMENTATION.md
│   └── DATABASE-SCHEMA.md
└── docker-compose.yml    # PostgreSQL container
```

---

## Key Technologies

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **API**: tRPC, Express, Zod validation
- **Database**: PostgreSQL 15 with Row-Level Security
- **State Management**: React Query (TanStack Query)
- **Monorepo**: Turborepo with npm workspaces
- **Authentication**: JWT tokens (dev mode, Azure AD B2C planned)

---

## Development Phases

### ✅ Completed (Foundation Phase)
- [x] Project scaffolding
- [x] Database schema with RLS
- [x] tRPC API setup
- [x] All 5 main routers implemented
- [x] Frontend pages (bulletins, people)
- [x] Dev authentication
- [x] Seed data

### 🚧 In Progress (Sprint 1)
- [ ] End-to-end bulletin creation flow
- [ ] Service items drag-and-drop UI
- [ ] Dashboard with stats

### ⏳ Planned (Sprint 2+)
- [ ] Events calendar view
- [ ] Announcements management
- [ ] PDF bulletin generation
- [ ] Forms builder
- [ ] Azure AD B2C authentication

---

## Testing

### Test Credentials (Dev Mode)

**Tenant**: Grace Community Church
- Slug: `gracechurch`
- Tenant ID: `753161b3-e698-46a6-965f-b2ef814c6874`

**Login**: Any email/password works in dev mode

**Test Data**:
- 4 people (John Smith, Jane Smith, Bob Johnson, Alice Williams)
- 1 bulletin for next Sunday
- 9 service items
- 3 announcements

### Manual Testing

1. **Login Flow**:
   - Visit http://localhost:3045/login
   - Enter any credentials
   - Verify redirect to dashboard

2. **Bulletins**:
   - Visit http://localhost:3045/bulletins
   - Verify list shows 1 bulletin
   - Click bulletin to view details

3. **People**:
   - Visit http://localhost:3045/people
   - Verify list shows 4 people
   - Try search functionality

4. **API Health**:
   ```bash
   curl http://localhost:8045/health
   # Should return: {"status":"ok","database":"connected"}
   ```

---

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Check for running processes
   - Kill old processes or use different port

2. **Database connection refused**
   - Verify Docker is running
   - Check `docker ps`
   - Restart: `docker-compose down && docker-compose up -d`

3. **TypeScript errors**
   - Run `npm run typecheck` to see all errors
   - Fix and restart dev servers

4. **Missing dependencies**
   - Run `npm install` from project root
   - Check for node_modules in all packages

---

## Contributing

### Before You Commit

```bash
# 1. Run typecheck
npm run typecheck

# 2. Run linting
npm run lint

# 3. Fix any errors
# 4. Commit changes
git add .
git commit -m "feat: description"
```

### Commit Message Format

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

---

## Additional Resources

### External Documentation
- [tRPC](https://trpc.io) - Type-safe API framework
- [Next.js](https://nextjs.org/docs) - React framework
- [PostgreSQL](https://www.postgresql.org/docs) - Database
- [Zod](https://zod.dev) - Schema validation
- [TanStack Query](https://tanstack.com/query) - Data fetching

### Internal Resources
- `CLAUDE.md` - Project configuration
- `artifacts/` - Planning documents
- `sprints/` - Sprint planning
- `technical/` - Technical decisions

---

## Support

### Questions?
- Check documentation first
- Search existing issues
- Ask in team chat

### Found a Bug?
1. Check if it's already reported
2. Create detailed issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages
   - Environment details

### Need a Feature?
1. Check roadmap first
2. Create feature request with:
   - User story
   - Acceptance criteria
   - Priority/urgency

---

**Documentation Version**: 1.0
**Last Updated**: November 14, 2025
**Maintained By**: Development Team
