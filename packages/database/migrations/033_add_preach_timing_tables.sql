-- Migration: 033_add_preach_timing_tables
-- Purpose: Add tables for Preach Mode live timing and analytics
--   - preach_session: Tracks individual preaching sessions (e.g., 9am vs 11am service)
--   - service_item_timing: Records actual start/end times per service item within a session
-- Run: npm run db:migrate

-- ============================================================================
-- Step 1: Create preach_session table
-- ============================================================================
CREATE TABLE IF NOT EXISTS preach_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  bulletin_issue_id UUID NOT NULL REFERENCES bulletin_issue(id) ON DELETE CASCADE,

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Created by
  created_by_user_id VARCHAR(255), -- May be non-UUID in dev mode

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE preach_session IS 'Tracks individual Preach Mode sessions for timing analytics';
COMMENT ON COLUMN preach_session.started_at IS 'When the preach session was started';
COMMENT ON COLUMN preach_session.ended_at IS 'When the preach session was ended (null if still active)';
COMMENT ON COLUMN preach_session.created_by_user_id IS 'User who started the session';

-- ============================================================================
-- Step 2: Create indexes for preach_session
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'preach_session'
      AND indexname = 'idx_preach_session_tenant'
  ) THEN
    RAISE NOTICE 'Creating idx_preach_session_tenant index';
    CREATE INDEX idx_preach_session_tenant ON preach_session(tenant_id);
  ELSE
    RAISE NOTICE 'idx_preach_session_tenant already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'preach_session'
      AND indexname = 'idx_preach_session_bulletin'
  ) THEN
    RAISE NOTICE 'Creating idx_preach_session_bulletin index';
    CREATE INDEX idx_preach_session_bulletin ON preach_session(bulletin_issue_id, started_at DESC);
  ELSE
    RAISE NOTICE 'idx_preach_session_bulletin already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 3: Enable RLS for preach_session
-- ============================================================================
ALTER TABLE preach_session ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'preach_session'
      AND policyname = 'tenant_isolation_preach_session'
  ) THEN
    RAISE NOTICE 'Creating tenant_isolation_preach_session policy';
    CREATE POLICY tenant_isolation_preach_session ON preach_session
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  ELSE
    RAISE NOTICE 'tenant_isolation_preach_session policy already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 4: Create service_item_timing table
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_item_timing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  preach_session_id UUID NOT NULL REFERENCES preach_session(id) ON DELETE CASCADE,
  service_item_id UUID NOT NULL REFERENCES service_item(id) ON DELETE CASCADE,

  -- Timing data
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER, -- Computed when ended_at is set

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One timing record per session/item combination
  UNIQUE(preach_session_id, service_item_id)
);

-- Add comments
COMMENT ON TABLE service_item_timing IS 'Records actual start/end times for each service item within a preach session';
COMMENT ON COLUMN service_item_timing.started_at IS 'When this item was started (presenter moved to this item)';
COMMENT ON COLUMN service_item_timing.ended_at IS 'When this item was ended (presenter moved away from this item)';
COMMENT ON COLUMN service_item_timing.duration_seconds IS 'Computed duration in seconds (ended_at - started_at)';

-- ============================================================================
-- Step 5: Create indexes for service_item_timing
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'service_item_timing'
      AND indexname = 'idx_service_item_timing_tenant'
  ) THEN
    RAISE NOTICE 'Creating idx_service_item_timing_tenant index';
    CREATE INDEX idx_service_item_timing_tenant ON service_item_timing(tenant_id);
  ELSE
    RAISE NOTICE 'idx_service_item_timing_tenant already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'service_item_timing'
      AND indexname = 'idx_service_item_timing_session'
  ) THEN
    RAISE NOTICE 'Creating idx_service_item_timing_session index';
    CREATE INDEX idx_service_item_timing_session ON service_item_timing(preach_session_id);
  ELSE
    RAISE NOTICE 'idx_service_item_timing_session already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'service_item_timing'
      AND indexname = 'idx_service_item_timing_item'
  ) THEN
    RAISE NOTICE 'Creating idx_service_item_timing_item index';
    CREATE INDEX idx_service_item_timing_item ON service_item_timing(service_item_id);
  ELSE
    RAISE NOTICE 'idx_service_item_timing_item already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 6: Enable RLS for service_item_timing
-- ============================================================================
ALTER TABLE service_item_timing ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_item_timing'
      AND policyname = 'tenant_isolation_service_item_timing'
  ) THEN
    RAISE NOTICE 'Creating tenant_isolation_service_item_timing policy';
    CREATE POLICY tenant_isolation_service_item_timing ON service_item_timing
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  ELSE
    RAISE NOTICE 'tenant_isolation_service_item_timing policy already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 7: Add trigger to auto-compute duration_seconds
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_timing_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.started_at IS NOT NULL AND NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_compute_timing_duration'
  ) THEN
    RAISE NOTICE 'Creating trg_compute_timing_duration trigger';
    CREATE TRIGGER trg_compute_timing_duration
      BEFORE INSERT OR UPDATE ON service_item_timing
      FOR EACH ROW
      EXECUTE FUNCTION compute_timing_duration();
  ELSE
    RAISE NOTICE 'trg_compute_timing_duration trigger already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 8: Add trigger to update preach_session.updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_preach_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_update_preach_session_timestamp'
  ) THEN
    RAISE NOTICE 'Creating trg_update_preach_session_timestamp trigger';
    CREATE TRIGGER trg_update_preach_session_timestamp
      BEFORE UPDATE ON preach_session
      FOR EACH ROW
      EXECUTE FUNCTION update_preach_session_timestamp();
  ELSE
    RAISE NOTICE 'trg_update_preach_session_timestamp trigger already exists';
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- Created tables:
--   - preach_session: Tracks preach sessions with start/end times
--   - service_item_timing: Records per-item timing within a session
--
-- Features:
--   - Row Level Security (RLS) enabled for tenant isolation
--   - Automatic duration_seconds computation via trigger
--   - Unique constraint on (preach_session_id, service_item_id)
--   - Indexes for efficient queries by tenant, bulletin, and session
