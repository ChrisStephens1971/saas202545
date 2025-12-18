# Database Schema Documentation

**Database**: PostgreSQL 15
**Multi-Tenancy**: Row-Level Security (RLS)
**Migration Tool**: Custom SQL migrations

---

## Overview

The Elder-First platform uses PostgreSQL with Row-Level Security (RLS) policies to enforce multi-tenant data isolation. All queries automatically filter by `tenant_id` using the `app.tenant_id` session variable.

---

## Core Tables

### `tenant`

Organization/church accounts.

```sql
CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  primary_email VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  locale VARCHAR(10) DEFAULT 'en-US',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Indexes**:
- `idx_tenant_slug` on `slug`
- `idx_tenant_status` on `status` WHERE `deleted_at IS NULL`

**No RLS** (tenant table is not tenant-scoped)

---

### `person`

Church members, attendees, and visitors.

```sql
CREATE TABLE person (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  household_id UUID REFERENCES household(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  membership_status VARCHAR(20) DEFAULT 'visitor',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Indexes**:
- `idx_person_tenant` on `tenant_id, deleted_at`
- `idx_person_name` on `tenant_id, first_name, last_name`
- `idx_person_email` on `tenant_id, email`

**RLS Policy**:
```sql
CREATE POLICY person_tenant_isolation ON person
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

### `household`

Family/household groupings.

```sql
CREATE TABLE household (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name VARCHAR(200) NOT NULL,
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**RLS Policy**: Standard tenant isolation

---

### `bulletin_issue`

Sunday worship bulletins. Also serves as the anchor for Sunday Planner service plans.

```sql
CREATE TABLE bulletin_issue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  issue_date DATE NOT NULL,
  service_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  start_time VARCHAR(20) DEFAULT '10:00 AM',  -- Service start time for Sunday Planner
  locked_at TIMESTAMP,
  locked_by UUID REFERENCES person(id),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES person(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, issue_date)
);
```

**Key Columns**:
- `start_time`: Service start time (e.g., "10:00 AM"). Used by the Sunday Planner to compute item start times.

**Status Values**: `draft`, `approved`, `built`, `locked`

**Indexes**:
- `idx_bulletin_tenant_date` on `tenant_id, service_date`
- `idx_bulletin_status` on `tenant_id, status` WHERE `deleted_at IS NULL`

**RLS Policy**: Standard tenant isolation

---

### `service_item`

Order of worship items. Linked to `bulletin_issue` by `service_date`.

```sql
CREATE TABLE service_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  service_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  sequence INTEGER NOT NULL,
  title VARCHAR(200),
  content VARCHAR(500),
  ccli_number VARCHAR(20),
  scripture_ref VARCHAR(100),
  speaker VARCHAR(100),
  duration_minutes INTEGER,
  section VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Key Columns**:
- `section`: Section ID for grouping (e.g., "worship", "message", "closing")
- `duration_minutes`: Duration in minutes for time calculations

**Type Values**: `Welcome`, `Song`, `Prayer`, `Scripture`, `Sermon`, `Offering`, `Benediction`, `Other`

**Indexes**:
- `idx_service_item_date` on `tenant_id, service_date, sequence`

**RLS Policy**: Standard tenant isolation

**Business Rules**:
- `ccli_number` required when `type = 'Song'`
- Validated by database function `validate_ccli_for_lock()`

---

### `service_plan_template`

Reusable Sunday Planner templates.

```sql
CREATE TABLE service_plan_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_time VARCHAR(20) DEFAULT '10:00 AM',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Key Columns**:
- `start_time`: Default service start time for plans created from this template

**RLS Policy**: Standard tenant isolation

---

### `service_plan_template_item`

Items within a Sunday Planner template.

```sql
CREATE TABLE service_plan_template_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  template_id UUID NOT NULL REFERENCES service_plan_template(id),
  type VARCHAR(50) NOT NULL,
  sequence INTEGER NOT NULL,
  title VARCHAR(200),
  content VARCHAR(500),
  ccli_number VARCHAR(20),
  scripture_ref VARCHAR(100),
  duration_minutes INTEGER,
  section VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**RLS Policy**: Standard tenant isolation

---

### `event`

Church events and calendar.

```sql
CREATE TABLE event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP,
  all_day BOOLEAN DEFAULT false,
  location_name VARCHAR(200),
  location_address VARCHAR(500),
  is_public BOOLEAN DEFAULT true,
  allow_rsvp BOOLEAN DEFAULT true,
  rsvp_limit INTEGER,
  external_calendar_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Indexes**:
- `idx_event_tenant_date` on `tenant_id, start_at`
- `idx_event_public` on `tenant_id, is_public, start_at` WHERE `deleted_at IS NULL`

**RLS Policy**: Standard tenant isolation

---

### `announcement`

Church announcements and notices.

```sql
CREATE TABLE announcement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  title VARCHAR(60) NOT NULL,
  body VARCHAR(300) NOT NULL,
  priority VARCHAR(20) DEFAULT 'Normal',
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  submitted_by UUID REFERENCES person(id),
  approved_by UUID REFERENCES person(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Priority Values**: `Urgent`, `High`, `Normal`

**Indexes**:
- `idx_announcement_active` on `tenant_id, is_active, priority DESC, starts_at DESC` WHERE `deleted_at IS NULL`

**RLS Policy**: Standard tenant isolation

---

### `brand_pack`

Visual branding and themes.

```sql
CREATE TABLE brand_pack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name VARCHAR(100) NOT NULL,
  church_name VARCHAR(200),
  church_address VARCHAR(500),
  church_phone VARCHAR(20),
  church_email VARCHAR(255),
  church_website VARCHAR(255),
  primary_color VARCHAR(7),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**RLS Policy**: Standard tenant isolation

---

### Church Profile Data

Organization-level settings like theology preferences are stored on the `tenant` table or in related profile tables. For theology settings (tradition, Bible translation, sensitivity level), see:

- **[Theology Settings Guide](settings/THEOLOGY-SETTINGS.md)** - Canonical values, label/value mapping, and shared types

---

### `fund`

Giving/donation funds.

```sql
CREATE TABLE fund (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**RLS Policy**: Standard tenant isolation

---

## Database Functions

### `validate_ccli_for_lock(bulletin_id UUID)`

Validates all songs in a bulletin have CCLI numbers before locking.

```sql
CREATE FUNCTION validate_ccli_for_lock(bulletin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM service_item
    WHERE bulletin_issue_id = bulletin_id
      AND type = 'Song'
      AND (ccli_number IS NULL OR ccli_number = '')
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;
```

---

## Row-Level Security

All tenant-scoped tables have RLS enabled:

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY <table>_tenant_isolation ON <table_name>
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### How RLS Works

1. Application sets session variable:
   ```sql
   SET LOCAL app.tenant_id = '753161b3-e698-46a6-965f-b2ef814c6874';
   ```

2. All queries automatically filtered:
   ```sql
   -- User writes:
   SELECT * FROM person WHERE email = 'john@example.com';

   -- PostgreSQL executes:
   SELECT * FROM person
   WHERE email = 'john@example.com'
     AND tenant_id = '753161b3-e698-46a6-965f-b2ef814c6874';
   ```

3. Impossible to bypass at application level

---

## Migrations

Migrations are SQL files in `packages/database/migrations/`.

### Running Migrations

```bash
cd packages/database
npm run migrate        # Run all pending
npm run migrate:up     # Run next migration
npm run migrate:down   # Rollback last migration
```

### Migration Template

```sql
-- Migration: 002_add_table_name
-- Description: What this migration does

BEGIN;

-- Up migration
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  -- ... columns
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY new_table_tenant_isolation ON new_table
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

COMMIT;
```

---

## Seeding Data

Seed script: `packages/database/src/seed.ts`

### Seed Data Contents

- **Tenant**: Grace Community Church
- **People**: 4 test people
- **Household**: 1 test household
- **Bulletin**: Next Sunday's bulletin
- **Service Items**: 9 worship items
- **Announcements**: 3 test announcements
- **Brand Pack**: Default branding
- **Fund**: General fund

### Running Seed

```bash
cd packages/database
npm run seed
```

**Warning**: Seed uses `ON CONFLICT DO NOTHING`, so it's safe to run multiple times.

---

## Database Connections

### Connection Pooling

```typescript
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,                      // Max connections
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 2000 // Timeout after 2s
});
```

### Query Helper

Always use `queryWithTenant()` for tenant-scoped queries:

```typescript
import { queryWithTenant } from './db';

const result = await queryWithTenant<Person>(
  tenantId,
  'SELECT * FROM person WHERE email = $1',
  ['john@example.com']
);
```

---

## Backup & Recovery

### Backup

```bash
# Full database backup
docker exec elder-first-postgres pg_dump -U postgres elder_first > backup.sql

# Schema only
docker exec elder-first-postgres pg_dump -U postgres -s elder_first > schema.sql

# Data only
docker exec elder-first-postgres pg_dump -U postgres -a elder_first > data.sql
```

### Restore

```bash
# Restore full backup
docker exec -i elder-first-postgres psql -U postgres elder_first < backup.sql

# Create database first if needed
docker exec elder-first-postgres psql -U postgres -c "CREATE DATABASE elder_first;"
```

---

## Performance Considerations

### Indexes

All tables have indexes on:
- `tenant_id` (for RLS filtering)
- Common query patterns (date ranges, status, names)
- Foreign keys

### Connection Pooling

- Max 20 connections prevents database overload
- Connections released after each query
- Idle connections closed after 30 seconds

### Query Optimization

- Use prepared statements (parameterized queries)
- Limit result sets with `LIMIT`
- Use `deleted_at IS NULL` indexes for soft deletes

---

## Security Best Practices

1. **Always use RLS**: Never bypass tenant isolation
2. **Parameterized queries**: Prevent SQL injection
3. **Soft deletes**: Preserve audit trail
4. **Transactions**: Use for multi-query operations
5. **Connection limits**: Prevent resource exhaustion

---

**Last Updated**: December 7, 2025
