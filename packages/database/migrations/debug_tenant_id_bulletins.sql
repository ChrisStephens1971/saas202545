-- Debug: Inspect tenant_id columns in bulletin-related tables
--
-- Example usage in psql:
--   \i packages/database/migrations/debug_tenant_id_bulletins.sql
--
-- Or from command line:
--   psql -h localhost -U postgres -d elder_first_dev -f packages/database/migrations/debug_tenant_id_bulletins.sql
--
-- Expected results after migration 014:
--   bulletin_issue.tenant_id -> text (NOT uuid)
--   service_item.tenant_id -> text (NOT uuid)
--   bulletin_announcement.tenant_id -> text (NOT uuid)

-- List all tenant_id columns in the database
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name = 'tenant_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- Specific bulletin-related tables
SELECT
  '--- BULLETIN TABLES ---' as info;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('bulletin_issue', 'service_item', 'bulletin_announcement')
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check RLS policies for these tables
SELECT
  '--- RLS POLICIES ---' as info;

SELECT
  schemaname,
  tablename,
  policyname,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename IN ('bulletin_issue', 'service_item', 'bulletin_announcement')
ORDER BY tablename, policyname;
