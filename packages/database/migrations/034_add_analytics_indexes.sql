-- Migration: 034_add_analytics_indexes
-- Purpose: Add indexes to improve performance of service analytics queries
--   - Composite indexes for date range queries on preach_session
--   - Indexes for sermon preacher and series lookups
--   - Indexes for efficient aggregation queries
-- Run: npm run db:migrate

-- ============================================================================
-- Step 1: Add composite index for date range queries on preach_session
-- Used by: analytics.getOverview, analytics.getPreacherStats, etc.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'preach_session'
      AND indexname = 'idx_preach_session_tenant_ended_at'
  ) THEN
    RAISE NOTICE 'Creating idx_preach_session_tenant_ended_at index';
    CREATE INDEX idx_preach_session_tenant_ended_at
      ON preach_session(tenant_id, ended_at)
      WHERE ended_at IS NOT NULL;
  ELSE
    RAISE NOTICE 'idx_preach_session_tenant_ended_at already exists';
  END IF;
END $$;

-- Add index for started_at for service slot grouping
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'preach_session'
      AND indexname = 'idx_preach_session_started_at'
  ) THEN
    RAISE NOTICE 'Creating idx_preach_session_started_at index';
    CREATE INDEX idx_preach_session_started_at
      ON preach_session(tenant_id, started_at DESC);
  ELSE
    RAISE NOTICE 'idx_preach_session_started_at already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Add indexes for sermon preacher and series lookups
-- Used by: analytics.getPreacherStats, analytics.getSeriesStats
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'sermon'
      AND indexname = 'idx_sermon_tenant_preacher'
  ) THEN
    RAISE NOTICE 'Creating idx_sermon_tenant_preacher index';
    CREATE INDEX idx_sermon_tenant_preacher
      ON sermon(tenant_id, preacher)
      WHERE preacher IS NOT NULL AND deleted_at IS NULL;
  ELSE
    RAISE NOTICE 'idx_sermon_tenant_preacher already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'sermon'
      AND indexname = 'idx_sermon_tenant_series'
  ) THEN
    RAISE NOTICE 'Creating idx_sermon_tenant_series index';
    CREATE INDEX idx_sermon_tenant_series
      ON sermon(tenant_id, series_id)
      WHERE series_id IS NOT NULL AND deleted_at IS NULL;
  ELSE
    RAISE NOTICE 'idx_sermon_tenant_series already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 3: Add index for bulletin issue date lookups
-- Used by: Joining bulletin_issue to service_item by date
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'bulletin_issue'
      AND indexname = 'idx_bulletin_issue_tenant_date'
  ) THEN
    RAISE NOTICE 'Creating idx_bulletin_issue_tenant_date index';
    CREATE INDEX idx_bulletin_issue_tenant_date
      ON bulletin_issue(tenant_id, issue_date DESC);
  ELSE
    RAISE NOTICE 'idx_bulletin_issue_tenant_date already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 4: Add index for service item date and sermon lookups
-- Used by: Joining service_item to sermon for analytics
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'service_item'
      AND indexname = 'idx_service_item_tenant_date_sermon'
  ) THEN
    RAISE NOTICE 'Creating idx_service_item_tenant_date_sermon index';
    CREATE INDEX idx_service_item_tenant_date_sermon
      ON service_item(tenant_id, service_date, sermon_id)
      WHERE deleted_at IS NULL;
  ELSE
    RAISE NOTICE 'idx_service_item_tenant_date_sermon already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 5: Add partial index for completed sessions (analytics focus)
-- Used by: All analytics queries that filter by ended_at IS NOT NULL
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'preach_session'
      AND indexname = 'idx_preach_session_completed'
  ) THEN
    RAISE NOTICE 'Creating idx_preach_session_completed index';
    CREATE INDEX idx_preach_session_completed
      ON preach_session(tenant_id, bulletin_issue_id)
      WHERE ended_at IS NOT NULL;
  ELSE
    RAISE NOTICE 'idx_preach_session_completed already exists';
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- Added indexes:
--   - idx_preach_session_tenant_ended_at: For filtering completed sessions
--   - idx_preach_session_started_at: For service slot grouping
--   - idx_sermon_tenant_preacher: For preacher analytics
--   - idx_sermon_tenant_series: For series analytics
--   - idx_bulletin_issue_tenant_date: For date range queries
--   - idx_service_item_tenant_date_sermon: For sermon timing queries
--   - idx_preach_session_completed: For completed session analytics
