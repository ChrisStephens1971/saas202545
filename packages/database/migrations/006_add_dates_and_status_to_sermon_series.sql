-- ============================================================================
-- Migration 006: Add date range and status columns to sermon_series
-- ============================================================================
-- Fixes seed script compatibility by adding:
-- - start_date: When the series begins
-- - end_date: When the series ends (optional)
-- - is_active: Whether series is currently active/ongoing
-- - image_url: Optional series artwork/image
-- ============================================================================

ALTER TABLE sermon_series
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for querying active series
CREATE INDEX IF NOT EXISTS idx_sermon_series_active
  ON sermon_series(tenant_id, is_active)
  WHERE deleted_at IS NULL AND is_active = true;

-- Add index for date range queries
CREATE INDEX IF NOT EXISTS idx_sermon_series_dates
  ON sermon_series(tenant_id, start_date DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN sermon_series.start_date IS 'Date when the sermon series begins';
COMMENT ON COLUMN sermon_series.end_date IS 'Date when the sermon series ends (optional for ongoing series)';
COMMENT ON COLUMN sermon_series.is_active IS 'Whether the series is currently active/ongoing';
COMMENT ON COLUMN sermon_series.image_url IS 'Optional URL to series artwork or promotional image';
