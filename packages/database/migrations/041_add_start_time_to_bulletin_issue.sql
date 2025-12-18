-- Migration: 041_add_start_time_to_bulletin_issue
-- Purpose: Add start_time column for Sunday Service Planner
-- Run: npm run db:migrate

-- ============================================================================
-- Add start_time column for service start time
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bulletin_issue'
      AND column_name = 'start_time'
  ) THEN
    RAISE NOTICE 'Adding start_time column to bulletin_issue';
    ALTER TABLE bulletin_issue ADD COLUMN start_time VARCHAR(20) DEFAULT '10:00 AM';
    COMMENT ON COLUMN bulletin_issue.start_time IS 'Service start time for time calculations (e.g., "10:00 AM")';
  ELSE
    RAISE NOTICE 'bulletin_issue.start_time already exists';
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- Added column:
--   - start_time (VARCHAR(20)): Service start time for Sunday Planner time calculations
