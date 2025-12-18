-- Migration 013: Force fix bulletin tables tenant_id from UUID to TEXT
-- Purpose: Fix "column tenant_id is of type uuid but expression is of type text" error
--
-- The previous migration (012) used conditional checks that may not have worked.
-- This migration forcefully alters the columns and adds missing columns.
--
-- Tables affected:
--   - bulletin_issue
--   - service_item (also adding missing bulletin_issue_id column)
--   - bulletin_announcement
--
-- Run: npm run db:migrate

-- ============================================================================
-- FIX bulletin_issue TABLE
-- ============================================================================

-- Drop RLS policy first (required before altering column type)
DROP POLICY IF EXISTS tenant_isolation_bulletin_issue ON bulletin_issue;

-- Drop FK constraint if exists
ALTER TABLE bulletin_issue DROP CONSTRAINT IF EXISTS bulletin_issue_tenant_id_fkey;

-- Force alter tenant_id to TEXT
ALTER TABLE bulletin_issue
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;

-- Recreate RLS policy without ::uuid cast
CREATE POLICY tenant_isolation_bulletin_issue ON bulletin_issue
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================================
-- FIX service_item TABLE
-- ============================================================================

-- Drop RLS policy first
DROP POLICY IF EXISTS tenant_isolation_service_item ON service_item;

-- Drop FK constraint if exists
ALTER TABLE service_item DROP CONSTRAINT IF EXISTS service_item_tenant_id_fkey;

-- Force alter tenant_id to TEXT
ALTER TABLE service_item
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;

-- Add bulletin_issue_id column if it doesn't exist
-- This column links service items to their bulletin issue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_item'
      AND column_name = 'bulletin_issue_id'
  ) THEN
    ALTER TABLE service_item
      ADD COLUMN bulletin_issue_id UUID REFERENCES bulletin_issue(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Recreate RLS policy without ::uuid cast
CREATE POLICY tenant_isolation_service_item ON service_item
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================================
-- FIX bulletin_announcement TABLE
-- ============================================================================

-- Drop RLS policy first
DROP POLICY IF EXISTS tenant_isolation_bulletin_announcement ON bulletin_announcement;

-- Drop FK constraint if exists
ALTER TABLE bulletin_announcement DROP CONSTRAINT IF EXISTS bulletin_announcement_tenant_id_fkey;

-- Force alter tenant_id to TEXT
ALTER TABLE bulletin_announcement
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;

-- Recreate RLS policy without ::uuid cast
CREATE POLICY tenant_isolation_bulletin_announcement ON bulletin_announcement
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================================
-- VERIFY
-- ============================================================================

-- Add comments to document the TEXT pattern
COMMENT ON COLUMN bulletin_issue.tenant_id IS 'Tenant ID (TEXT to support dev-mode string IDs like dev-tenant-1)';
COMMENT ON COLUMN service_item.tenant_id IS 'Tenant ID (TEXT to support dev-mode string IDs like dev-tenant-1)';
COMMENT ON COLUMN service_item.bulletin_issue_id IS 'Optional link to the bulletin issue this item belongs to';
COMMENT ON COLUMN bulletin_announcement.tenant_id IS 'Tenant ID (TEXT to support dev-mode string IDs like dev-tenant-1)';
