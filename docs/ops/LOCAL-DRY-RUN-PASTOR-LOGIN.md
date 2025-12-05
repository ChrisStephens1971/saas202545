# Local Dry Run: Pastor Login Test

**Purpose:** Verify the pastor dev account works correctly on localhost BEFORE deploying to Azure.

**Time:** 15-20 minutes

---

## Prerequisites

- [ ] Docker Desktop installed and running (for PostgreSQL)
- [ ] Node.js 20.x installed: `node --version`
- [ ] Repository cloned locally
- [ ] No other services running on ports 5445, 8045, 3045

---

## Step 1: Start PostgreSQL with Docker

### Option A: Using Docker Compose (Recommended)

The repository already includes `docker-compose.yml` with PostgreSQL configured.

Start PostgreSQL (and Redis):
```bash
# From repository root
docker-compose up -d
```

Verify it's running:
```bash
docker ps | grep postgres
```

**Expected output:** Container named `elder-first-postgres` on port 5445

**Credentials:**
- User: `postgres`
- Password: `postgres`
- Database: `elder_first`
- Port: `5445`

### Option B: Using Docker CLI (if not using docker-compose)

```bash
docker run -d \
  --name elder-first-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=elder_first \
  -p 5445:5432 \
  postgres:14
```

---

## Step 2: Configure Local Environment

### Step 2.1: Database Package Environment

Create `packages/database/.env.local`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5445/elder_first
DATABASE_SSL=false
```

### Step 2.2: API Package Environment

Create `apps/api/.env.local`:

```bash
NODE_ENV=development
PORT=8045
ALLOWED_ORIGINS=http://localhost:3045
DATABASE_URL=postgresql://postgres:postgres@localhost:5445/elder_first
DATABASE_SSL=false
LOG_LEVEL=debug
```

### Step 2.3: Web Package Environment

Create `apps/web/.env.local`:

```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:8045

# NextAuth
NEXTAUTH_URL=http://localhost:3045
NEXTAUTH_SECRET=local-dev-secret-12345678901234567890

# Azure AD B2C (not needed in dev mode)
AZURE_AD_B2C_TENANT_NAME=
AZURE_AD_B2C_CLIENT_ID=
AZURE_AD_B2C_CLIENT_SECRET=
AZURE_AD_B2C_PRIMARY_USER_FLOW=

# Development Mode - ENABLED
DEV_MODE=true
NEXT_PUBLIC_DEV_MODE=true
```

**CRITICAL:** `DEV_MODE=true` enables the pastor test account.

---

## Step 3: Install Dependencies

From repository root:

```bash
# Install all workspace dependencies
npm ci

# Verify installation
npm run typecheck
```

**Expected:** No type errors (or only pre-existing errors in attendance/auth/directory/forms).

---

## Step 4: Run Database Migrations

```bash
cd packages/database

# Run all migrations
npm run migrate
```

**Expected output:**
```
Running migrations...
✓ Ran migration: 001_initial.sql
✓ Ran migration: 002_people.sql
✓ Ran migration: 003_events.sql
✓ Ran migration: 004_bulletins.sql
✓ Ran migration: 005_sermons_and_gratitude.sql
✓ Ran migration: 006_page_protection.sql (if exists)
All migrations completed successfully
```

---

## Step 5: Seed First Test Church Data

Still in `packages/database`:

```bash
npm run seed
```

**Expected output:**
```
Starting database seed...
✓ Created tenant: First Test Church (00000000-0000-0000-0000-000000000001)
✓ Created household: ...
✓ Created person: John Smith
✓ Created person: Jane Smith
✓ Created person: Robert Johnson
... (12 people total)
✓ Created brand pack
✓ Created bulletin for Sun [DATE]
✓ Created 9 service items
✓ Created 3 announcements
✓ Created default fund
✓ Created 2 sermon series
✓ Created 4 sermons
✓ Linked sermon to service item
✓ Created 3 events
✓ Created 6 donations
✓ Created 3 thank-you notes

✓ Database seeded successfully!

Test Credentials:
  Tenant: First Test Church
  Tenant Slug: firsttest
  Pastor Email: pastor@testchurch.local
```

**Key verification:** Tenant ID must be `00000000-0000-0000-0000-000000000001`

---

## Step 6: Start Backend API

Open a new terminal:

```bash
cd apps/api
npm run dev
```

**Expected output:**
```
[timestamp] info: Server starting...
[timestamp] info: Database connected
[timestamp] info: Server listening on http://localhost:8045
```

**Verify API is running:**

Open another terminal:
```bash
curl http://localhost:8045/health
```

**Expected:** `{"status":"ok"}` or similar

**Leave this terminal running.**

---

## Step 7: Start Frontend Web App

Open another new terminal:

```bash
cd apps/web
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.2.33
  - Local:        http://localhost:3045
  - Environments: .env.local

 ✓ Ready in [X]s
```

**Leave this terminal running.**

---

## Step 8: Test Pastor Login

### Step 8.1: Open Login Page

1. Open browser: `http://localhost:3045`
2. You should see the **Elder-First Church Platform** login page

**What to verify:**
- ✅ Yellow banner says "Development Mode Active"
- ✅ Shows list of test accounts including:
  - admin@dev.com / admin
  - pastor@testchurch.local / test123
- ✅ Login form with Email and Password fields

### Step 8.2: Log In as Pastor

1. Enter credentials:
   - **Email:** `pastor@testchurch.local`
   - **Password:** `test123`

2. Click **"Sign In"**

**Expected behavior:**
- Redirects to `http://localhost:3045/dashboard`
- No errors in browser console (F12 → Console tab)

### Step 8.3: Verify Dashboard Loads

**What to verify on dashboard:**
- ✅ Page title: "Dashboard"
- ✅ Shows First Test Church data (not empty)
- ✅ Quick Action cards visible:
  - "Plan Sunday Service" → /bulletins/new
  - "View Sermons" → /sermons
  - "Thank-You Notes" → /thank-yous
  - "Create Event" → /events/new
- ✅ Top navigation shows: Dashboard, Bulletins, Sermons, People, Events, Thank-You Notes, Donations
- ✅ User menu in top-right shows "Pastor Test" (or similar)

**If dashboard is EMPTY:**
- Check browser console for errors
- Check API terminal for database connection errors
- Verify tenantId in seed matches auth: `00000000-0000-0000-0000-000000000001`

---

## Step 9: Smoke Test All Features

### Test 9.1: Sermons List

1. Click **"Sermons"** in top nav
2. Should navigate to `/sermons`

**Verify:**
- ✅ Shows 4 seeded sermons
- ✅ Sees series: "Philippians: Joy in Chains" and "Advent 2024"
- ✅ Sermon titles:
  - "Hope in the Darkness"
  - "Joy in the Gospel"
  - "The Mind of Christ"
  - "Pressing On Toward the Goal"

### Test 9.2: Sermon Detail

1. Click on **"Joy in the Gospel"** (or any sermon)
2. Should navigate to `/sermons/[id]`

**Verify:**
- ✅ Shows sermon title
- ✅ Shows preacher: "Pastor John Smith" (or similar)
- ✅ Shows scripture reference: "Philippians 1:12-26"
- ✅ Shows full manuscript text
- ✅ "Edit Sermon" button visible (admin role)

### Test 9.3: Thank-You Notes List

1. Click **"Thank-You Notes"** in top nav
2. Should navigate to `/thank-yous`

**Verify:**
- ✅ Shows table with 3 thank-you notes
- ✅ Columns: Person, Channel, Subject, Date
- ✅ Notes show:
  - John Smith (Card) - donation thank-you
  - Robert Johnson (Email) - event volunteer
  - Sarah Wilson (Phone Call) - ministry volunteer

### Test 9.4: Person Detail with Thank-You Notes

1. From thank-you notes list, click **"John Smith"**
2. Should navigate to `/people/[id]`

**Verify:**
- ✅ Shows person profile (name, email, phone)
- ✅ Shows "Thank-You Notes" section
- ✅ Shows at least 1 note for this person
- ✅ "Log Thank-You Note" button visible

### Test 9.5: Bulletins with Sermon Link

1. Click **"Bulletins"** in top nav
2. Click on the bulletin for next Sunday
3. Should navigate to `/bulletins/[id]`

**Verify:**
- ✅ Shows service items (songs, prayers, sermon, offering)
- ✅ Sermon item shows: "Pressing On Toward the Goal"
- ✅ **CRITICAL:** Sermon item has a link: "🎙️ View Sermon: Pressing On Toward..."
- ✅ Click the sermon link → navigates to `/sermons/[id]`

**If sermon link is MISSING:**
- This was the Phase E fix
- Check `apps/web/src/components/bulletins/ServiceItemsList.tsx` lines 156-167
- Verify `sermonId` and `sermonTitle` are in ServiceItem interface

### Test 9.6: Donation Detail with Thank-You Notes

1. Click **"Donations"** in top nav (if visible for admin)
2. Click on any donation
3. Should navigate to `/donations/[id]`

**Verify:**
- ✅ Shows donation amount, date, donor
- ✅ Shows "Thank-You Notes" section
- ✅ May or may not have notes (some donations don't)

---

## Step 10: Test Tenant Isolation (Negative Test)

This verifies the pastor account ONLY sees First Test Church data, not dev-tenant-1 data.

### Step 10.1: Log Out

1. Click user menu in top-right
2. Click "Sign Out"
3. Returns to login page

### Step 10.2: Log In as Different Tenant User

1. Enter:
   - **Email:** `admin@dev.com`
   - **Password:** `admin`
2. Click "Sign In"

**Expected:**
- Dashboard loads successfully
- BUT: Shows ZERO data (empty sermons, empty thank-yous, etc.)
- This is correct! `admin@dev.com` belongs to `dev-tenant-1`, which has no seed data

### Step 10.3: Log Back In as Pastor

1. Sign out
2. Log in as `pastor@testchurch.local` / `test123`
3. Dashboard should show First Test Church data again

**Verification:** Tenant isolation is working correctly.

---

## Step 11: Browser Console Check

Open browser DevTools (F12) → Console tab

**Should NOT see:**
- ❌ Red errors (except maybe 404 for favicon)
- ❌ CORS errors
- ❌ Database connection errors
- ❌ "Cannot read property of undefined" errors

**OK to see:**
- ⚠️ Warnings about Next.js dev mode
- ⚠️ Warnings about missing images (using example URLs)

---

## Step 12: API Terminal Check

Look at the API terminal where `npm run dev` is running.

**Should see:**
- ✅ Successful database queries
- ✅ No error stack traces
- ✅ Requests logged: `GET /api/trpc/sermons.list`, etc.

**Should NOT see:**
- ❌ `ECONNREFUSED` (database connection failed)
- ❌ SQL syntax errors
- ❌ RLS policy violations
- ❌ "Tenant not found" errors

---

## Troubleshooting

### Problem: "Cannot connect to database"

**Check:**
```bash
docker ps | grep postgres
# Should show container named 'elder-first-postgres' running on port 5445

# Test connection directly (if psql installed)
psql postgresql://postgres:postgres@localhost:5445/elder_first -c "SELECT 1;"

# OR test via Docker
docker exec -it elder-first-postgres psql -U postgres -d elder_first -c "SELECT 1;"
```

**Fix:** Restart Docker container:
```bash
docker-compose restart postgres
# OR
docker restart elder-first-postgres
```

### Problem: "Invalid email or password" for pastor@testchurch.local

**Check:**
```bash
# Verify DEV_MODE is set
cat apps/web/.env.local | grep DEV_MODE
# Should show: DEV_MODE=true

# Verify auth.ts has pastor user
grep -A 2 "pastor@testchurch.local" apps/web/src/auth.ts
```

**Fix:**
- Ensure `.env.local` has `DEV_MODE=true`
- Restart web dev server after changing env vars

### Problem: Dashboard shows no data

**Check tenant ID in session:**

1. Open browser DevTools → Application → Cookies
2. Find `next-auth.session-token` cookie
3. Decode JWT at jwt.io
4. Check `tenantId` in payload

**Expected:** `"tenantId": "00000000-0000-0000-0000-000000000001"`

**If different tenantId:**
- Re-run seed script
- Clear browser cookies
- Log in again

### Problem: Sermon link missing from bulletin

**Check:**
```bash
# Verify ServiceItemsList has sermon link code
grep -A 5 "sermonId && item.sermonTitle" apps/web/src/components/bulletins/ServiceItemsList.tsx
```

**Expected:** Should show Link component with sermon navigation

**Fix:** Verify Phase E fix was applied correctly

---

## Summary Checklist

Before deploying to Azure, verify locally:

- [ ] PostgreSQL running on localhost:5445
- [ ] Migrations ran successfully (6 migrations)
- [ ] Seed created First Test Church with fixed UUID
- [ ] API running on http://localhost:8045
- [ ] Web running on http://localhost:3045
- [ ] Can log in as pastor@testchurch.local / test123
- [ ] Dashboard shows First Test Church data
- [ ] Sermons list shows 4 sermons
- [ ] Thank-You Notes list shows 3 notes
- [ ] Bulletin has clickable sermon link
- [ ] Person detail shows thank-you notes
- [ ] Tenant isolation works (admin@dev.com sees no data)
- [ ] No errors in browser console
- [ ] No errors in API terminal

**If all checks pass: Ready to deploy to Azure!**

---

## Cleanup After Testing

Stop services:
```bash
# Press Ctrl+C in API terminal
# Press Ctrl+C in Web terminal

# Stop and remove all containers
docker-compose down

# OR stop just PostgreSQL
docker stop elder-first-postgres

# Remove volume (optional - deletes all test data)
docker volume rm saas202545_postgres_data
```

---

## Next Steps

1. ✅ Complete local dry run (this document)
2. ⏳ Follow `docs/ops/DEPLOY-DEV-STAGING-FIRST-PASTOR.md` to deploy to Azure
3. ⏳ Run smoke test on staging URL
4. ⏳ Send test script and credentials to pastor
5. ⏳ Collect feedback

---

**Document Version:** 1.0
**Last Updated:** 2025-11-20
