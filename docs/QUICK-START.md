# Quick Start Guide

Get the Elder-First platform running locally in under 10 minutes.

---

## Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Docker**: For PostgreSQL database
- **Git**: For version control

---

## Step 1: Clone & Install (2 minutes)

```bash
# Clone repository
cd C:\devop\saas202545

# Install dependencies (uses npm workspaces)
npm install
```

This installs dependencies for all packages in the monorepo.

---

## Step 2: Start PostgreSQL (1 minute)

```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Verify it's running
docker ps | grep postgres
```

**Database Details**:
- Host: `localhost`
- Port: `5445`
- Database: `elder_first`
- User: `postgres`
- Password: `postgres`

---

## Step 3: Run Migrations (1 minute)

```bash
# Navigate to database package
cd packages/database

# Run migrations
npm run migrate

# Expected output:
# ✓ Running migration: 001_initial_schema.sql
# ✓ Migration complete
```

This creates all 18 tables with RLS policies.

---

## Step 4: Seed Test Data (1 minute)

```bash
# Still in packages/database
npm run seed

# Expected output:
# ✓ Created tenant: <uuid>
# ✓ Created household: <uuid>
# ✓ Created person: John Smith
# ✓ Created person: Jane Smith
# ✓ Created person: Bob Johnson
# ✓ Created person: Alice Williams
# ✓ Created brand pack
# ✓ Created bulletin for <date>
# ✓ Created 9 service items
# ✓ Created 3 announcements
# ✓ Created default fund
```

**Seed Data Created**:
- Tenant: Grace Community Church (slug: `gracechurch`)
- 4 people, 1 household
- 1 bulletin for next Sunday
- 9 service items
- 3 announcements

---

## Step 5: Start API Server (30 seconds)

```bash
# From project root
cd apps/api

# Start development server
npm run dev

# Expected output:
# API server listening on port 8045
# Database: connected
```

**API URL**: http://localhost:8045

**Health Check**:
```bash
curl http://localhost:8045/health

# Should return:
# {"status":"ok","database":"connected","timestamp":"..."}
```

---

## Step 6: Start Web App (30 seconds)

```bash
# From project root
cd apps/web

# Start Next.js dev server
npm run dev

# Expected output:
# ▲ Next.js 14.2.33
# - Local: http://localhost:3045
# ✓ Ready in 2.1s
```

**Web URL**: http://localhost:3045

---

## Step 7: Login & Test (2 minutes)

### 7.1 Login

1. Open http://localhost:3045/login
2. Enter **any email and password** (dev mode)
3. Click "Sign In"
4. Redirects to `/dashboard`

### 7.2 View Bulletins

1. Navigate to http://localhost:3045/bulletins
2. Should see 1 bulletin for next Sunday
3. Status badge shows "Draft"
4. Click on bulletin to view details

### 7.3 View People

1. Navigate to http://localhost:3045/people
2. Should see 4 people from seed data
3. Try searching for "Smith"
4. Should filter to John and Jane Smith

---

## Verify Everything Works

### Check Database Connection

```bash
# Connect to database
docker exec -it elder-first-postgres psql -U postgres -d elder_first

# Run test query
SELECT slug, name FROM tenant;

# Expected output:
#     slug     |          name
# -------------+------------------------
#  gracechurch | Grace Community Church

# Exit psql
\q
```

### Check API Endpoints

```bash
# Test health endpoint
curl http://localhost:8045/health

# Test tRPC endpoint (requires auth - will fail with UNAUTHORIZED, which is correct)
curl http://localhost:8045/trpc/bulletins.list
```

### Check Frontend

Open browser DevTools (F12):
- **Network tab**: Should see successful tRPC calls
- **Console**: No errors (warnings about Next.js config are OK)
- **Application → Local Storage**: Should see `auth-token` and `tenant-id`

---

## Common Issues

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Check what's using the port
netstat -ano | findstr :8045

# Kill the process
taskkill /PID <pid> /F

# Or use different port in .env
PORT=8046
```

### Database Connection Refused

**Error**: `ECONNREFUSED 127.0.0.1:5445`

**Solution**:
```bash
# Check Docker is running
docker ps

# Restart PostgreSQL
docker-compose down
docker-compose up -d

# Check logs
docker logs elder-first-postgres
```

### TypeScript Errors

**Error**: Type errors when running dev servers

**Solution**:
```bash
# Run typecheck to see all errors
npm run typecheck

# Fix any reported errors
# Then restart dev servers
```

---

## Development Workflow

### Daily Startup

```bash
# 1. Start database (if not running)
docker-compose up -d

# 2. Start API server
cd apps/api && npm run dev

# 3. Start web app (in another terminal)
cd apps/web && npm run dev
```

### Making Changes

```bash
# 1. Make code changes
# 2. Servers auto-reload (hot module replacement)
# 3. Test changes in browser
# 4. Run typecheck before committing
npm run typecheck
```

### Database Changes

```bash
# 1. Create new migration file
touch packages/database/migrations/002_my_change.sql

# 2. Write SQL
# 3. Run migration
cd packages/database && npm run migrate

# 4. Update seed.ts if needed
# 5. Re-run seed
npm run seed
```

---

## Next Steps

### Learn the Codebase

1. **Read Documentation**:
   - `docs/SESSION-2025-11-14.md` - Development session notes
   - `docs/API-DOCUMENTATION.md` - API reference
   - `docs/DATABASE-SCHEMA.md` - Database structure

2. **Explore Code**:
   - `apps/api/src/routers/` - API endpoints
   - `apps/web/src/app/` - Frontend pages
   - `packages/database/migrations/` - Database schema

3. **Try Building Features**:
   - Add a new API endpoint
   - Create a new page component
   - Modify database schema

### Development Tasks

- [ ] Test bulletin creation flow
- [ ] Build service items drag-and-drop UI
- [ ] Implement events calendar view
- [ ] Add announcements management
- [ ] Create dashboard with stats

---

## Useful Commands

### Monorepo Management

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Lint all packages
npm run lint

# Typecheck all packages
npm run typecheck

# Build all packages
npm run build
```

### Database

```bash
# Connect to database
docker exec -it elder-first-postgres psql -U postgres -d elder_first

# Run migrations
cd packages/database && npm run migrate

# Seed data
npm run seed

# Backup database
docker exec elder-first-postgres pg_dump -U postgres elder_first > backup.sql

# Restore database
docker exec -i elder-first-postgres psql -U postgres elder_first < backup.sql
```

### Git

```bash
# Check status
git status

# Stage changes
git add .

# Commit with message
git commit -m "feat: description of changes"

# Push to remote
git push
```

---

## Development Tools

### VS Code Extensions (Recommended)

- **ESLint** - Linting
- **Prettier** - Code formatting
- **TypeScript Vue Plugin** - TypeScript support
- **Tailwind CSS IntelliSense** - CSS classes
- **PostgreSQL** - Database management
- **Docker** - Container management

### Browser Extensions (Recommended)

- **React Developer Tools** - Component debugging
- **TanStack Query DevTools** - React Query debugging (built into app)

---

## Getting Help

### Documentation

- **Project Docs**: `docs/` folder
- **tRPC Docs**: https://trpc.io
- **Next.js Docs**: https://nextjs.org/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs

### Debugging

**API Issues**:
- Check `apps/api` terminal for errors
- Check database connection
- Verify environment variables in `apps/api/.env`

**Frontend Issues**:
- Check browser console for errors
- Check `apps/web` terminal for build errors
- Verify tRPC client configuration

**Database Issues**:
- Check Docker container is running
- Check migration status
- Verify RLS policies with `\d+ table_name` in psql

---

## Clean Slate

If you need to start fresh:

```bash
# 1. Stop all servers
# Ctrl+C in all terminals

# 2. Stop and remove database
docker-compose down -v

# 3. Remove node_modules
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# 4. Reinstall
npm install

# 5. Start database
docker-compose up -d

# 6. Run migrations
cd packages/database && npm run migrate

# 7. Seed data
npm run seed

# 8. Start servers
cd apps/api && npm run dev
cd apps/web && npm run dev
```

---

**Estimated Time**: 7-10 minutes total
**Last Updated**: November 14, 2025
