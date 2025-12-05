-- Migration 012: Fix bulletin tables tenant_id from UUID to TEXT
-- Purpose: Allow string-based tenant IDs (like "dev-tenant-1") in development environments
--
-- This fixes the error: invalid input syntax for type uuid: "dev-tenant-1"
-- when clicking "Create Bulletin" in the bulletin generator.
--
-- Tables affected:
--   - bulletin_issue
--   - service_item
--   - bulletin_announcement
--
-- This migration is idempotent (safe to re-run).

-- ============================================================================
-- FIX bulletin_issue TABLE
-- ============================================================================

-- IMPORTANT: Must drop RLS policy BEFORE altering column type
DROP POLICY IF EXISTS tenant_isolation_bulletin_issue ON bulletin_issue;

-- Drop the FK constraint on tenant_id (references tenant(id) which is UUID)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bulletin_issue_tenant_id_fkey'
      AND table_name = 'bulletin_issue'
  ) THEN
    ALTER TABLE bulletin_issue DROP CONSTRAINT bulletin_issue_tenant_id_fkey;
  END IF;
END $$;

-- Alter tenant_id column from UUID to TEXT (only if it's still UUID)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bulletin_issue'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE bulletin_issue ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;
  END IF;
END $$;

-- Create new RLS policy without ::uuid cast (compares TEXT to TEXT)
CREATE POLICY tenant_isolation_bulletin_issue ON bulletin_issue
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================================
-- FIX service_item TABLE
-- ============================================================================

-- IMPORTANT: Must drop RLS policy BEFORE altering column type
DROP POLICY IF EXISTS tenant_isolation_service_item ON service_item;

-- Drop the FK constraint on tenant_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'service_item_tenant_id_fkey'
      AND table_name = 'service_item'
  ) THEN
    ALTER TABLE service_item DROP CONSTRAINT service_item_tenant_id_fkey;
  END IF;
END $$;

-- Alter tenant_id column from UUID to TEXT (only if it's still UUID)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_item'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE service_item ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;
  END IF;
END $$;

-- Create new RLS policy without ::uuid cast
CREATE POLICY tenant_isolation_service_item ON service_item
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================================
-- FIX bulletin_announcement TABLE
-- ============================================================================

-- IMPORTANT: Must drop RLS policy BEFORE altering column type
DROP POLICY IF EXISTS tenant_isolation_bulletin_announcement ON bulletin_announcement;

-- Drop the FK constraint on tenant_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bulletin_announcement_tenant_id_fkey'
      AND table_name = 'bulletin_announcement'
  ) THEN
    ALTER TABLE bulletin_announcement DROP CONSTRAINT bulletin_announcement_tenant_id_fkey;
  END IF;
END $$;

-- Alter tenant_id column from UUID to TEXT (only if it's still UUID)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bulletin_announcement'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE bulletin_announcement ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;
  END IF;
END $$;

-- Create new RLS policy without ::uuid cast
CREATE POLICY tenant_isolation_bulletin_announcement ON bulletin_announcement
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN bulletin_issue.tenant_id IS 'Tenant ID (TEXT to support both UUID and dev-mode string IDs)';
COMMENT ON COLUMN service_item.tenant_id IS 'Tenant ID (TEXT to support both UUID and dev-mode string IDs)';
COMMENT ON COLUMN bulletin_announcement.tenant_id IS 'Tenant ID (TEXT to support both UUID and dev-mode string IDs)';
