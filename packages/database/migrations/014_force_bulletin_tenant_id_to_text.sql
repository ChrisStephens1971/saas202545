-- Migration 014: Force bulletin tables tenant_id to TEXT
--
-- Problem: Despite previous migrations (012, 013), the tenant_id columns are still UUID,
-- causing "column tenant_id is of type uuid but expression is of type text" errors.
--
-- Solution: This migration uses unconditional ALTER statements to force the change.
-- We also drop and recreate RLS policies without any ::uuid casts.
--
-- We standardized on tenant_id TEXT to support:
--   - "dev-tenant-1" in development environments
--   - UUID-like strings in production
--
-- No code should ever cast tenant_id or current_setting('app.tenant_id', true) to UUID.
--
-- Run: npm run db:migrate
-- Or manually: psql -d elder_first_dev -f packages/database/migrations/014_force_bulletin_tenant_id_to_text.sql

-- ============================================================================
-- BULLETIN_ISSUE TABLE
-- ============================================================================

-- Step 1: Drop RLS policy (must be done before ALTER COLUMN)
DROP POLICY IF EXISTS tenant_isolation_bulletin_issue ON bulletin_issue;

-- Step 2: Drop FK constraint if it exists
ALTER TABLE bulletin_issue DROP CONSTRAINT IF EXISTS bulletin_issue_tenant_id_fkey;

-- Step 3: Force change tenant_id to TEXT
-- This works whether it's currently UUID or TEXT (idempotent)
DO $$
BEGIN
  -- Check if column exists and is UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bulletin_issue'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    RAISE NOTICE 'bulletin_issue.tenant_id is UUID, converting to TEXT';
    ALTER TABLE bulletin_issue ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;
  ELSE
    RAISE NOTICE 'bulletin_issue.tenant_id is already TEXT or does not exist';
  END IF;
END $$;

-- Step 4: Recreate RLS policy WITHOUT ::uuid cast
CREATE POLICY tenant_isolation_bulletin_issue ON bulletin_issue
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================================
-- SERVICE_ITEM TABLE
-- ============================================================================

-- Step 1: Drop RLS policy
DROP POLICY IF EXISTS tenant_isolation_service_item ON service_item;

-- Step 2: Drop FK constraint if it exists
ALTER TABLE service_item DROP CONSTRAINT IF EXISTS service_item_tenant_id_fkey;

-- Step 3: Force change tenant_id to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_item'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    RAISE NOTICE 'service_item.tenant_id is UUID, converting to TEXT';
    ALTER TABLE service_item ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;
  ELSE
    RAISE NOTICE 'service_item.tenant_id is already TEXT or does not exist';
  END IF;
END $$;

-- Step 4: Add bulletin_issue_id column if missing (needed by generateFromContent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_item'
      AND column_name = 'bulletin_issue_id'
  ) THEN
    RAISE NOTICE 'Adding bulletin_issue_id column to service_item';
    ALTER TABLE service_item ADD COLUMN bulletin_issue_id UUID REFERENCES bulletin_issue(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'service_item.bulletin_issue_id already exists';
  END IF;
END $$;

-- Step 5: Recreate RLS policy WITHOUT ::uuid cast
CREATE POLICY tenant_isolation_service_item ON service_item
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================================
-- BULLETIN_ANNOUNCEMENT TABLE
-- ============================================================================

-- Step 1: Drop RLS policy
DROP POLICY IF EXISTS tenant_isolation_bulletin_announcement ON bulletin_announcement;

-- Step 2: Drop FK constraint if it exists
ALTER TABLE bulletin_announcement DROP CONSTRAINT IF EXISTS bulletin_announcement_tenant_id_fkey;

-- Step 3: Force change tenant_id to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bulletin_announcement'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    RAISE NOTICE 'bulletin_announcement.tenant_id is UUID, converting to TEXT';
    ALTER TABLE bulletin_announcement ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;
  ELSE
    RAISE NOTICE 'bulletin_announcement.tenant_id is already TEXT or does not exist';
  END IF;
END $$;

-- Step 4: Recreate RLS policy WITHOUT ::uuid cast
CREATE POLICY tenant_isolation_bulletin_announcement ON bulletin_announcement
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Add comments documenting the TEXT pattern
COMMENT ON COLUMN bulletin_issue.tenant_id IS 'Tenant ID as TEXT (supports dev-tenant-1 and UUID strings)';
COMMENT ON COLUMN service_item.tenant_id IS 'Tenant ID as TEXT (supports dev-tenant-1 and UUID strings)';
COMMENT ON COLUMN bulletin_announcement.tenant_id IS 'Tenant ID as TEXT (supports dev-tenant-1 and UUID strings)';

-- Output verification (will show in psql output)
DO $$
DECLARE
  bi_type text;
  si_type text;
  ba_type text;
BEGIN
  SELECT data_type INTO bi_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bulletin_issue' AND column_name = 'tenant_id';
  SELECT data_type INTO si_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_item' AND column_name = 'tenant_id';
  SELECT data_type INTO ba_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bulletin_announcement' AND column_name = 'tenant_id';

  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'bulletin_issue.tenant_id: %', bi_type;
  RAISE NOTICE 'service_item.tenant_id: %', si_type;
  RAISE NOTICE 'bulletin_announcement.tenant_id: %', ba_type;

  IF bi_type = 'text' AND si_type = 'text' AND ba_type = 'text' THEN
    RAISE NOTICE 'SUCCESS: All bulletin tenant_id columns are TEXT';
  ELSE
    RAISE WARNING 'PROBLEM: Not all columns are TEXT!';
  END IF;
END $$;
