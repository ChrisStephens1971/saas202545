-- Migration: 031_add_service_order_v2_columns
-- Purpose: Add columns for Service Order V2 feature
--   - duration_minutes: estimated duration for service time calculations
--   - section: grouping for collapsible sections (e.g., 'worship', 'message', 'response')
--   - notes: internal notes not displayed on bulletin
-- Run: npm run db:migrate

-- ============================================================================
-- Step 1: Add duration_minutes column
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_item'
      AND column_name = 'duration_minutes'
  ) THEN
    RAISE NOTICE 'Adding duration_minutes column to service_item';
    ALTER TABLE service_item ADD COLUMN duration_minutes INTEGER;
    COMMENT ON COLUMN service_item.duration_minutes IS 'Estimated duration in minutes for service timing calculations';
  ELSE
    RAISE NOTICE 'service_item.duration_minutes already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Add section column for grouping items
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_item'
      AND column_name = 'section'
  ) THEN
    RAISE NOTICE 'Adding section column to service_item';
    ALTER TABLE service_item ADD COLUMN section VARCHAR(50);
    COMMENT ON COLUMN service_item.section IS 'Grouping identifier for collapsible sections (e.g., worship, message, response)';
  ELSE
    RAISE NOTICE 'service_item.section already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 3: Add notes column for internal notes
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_item'
      AND column_name = 'notes'
  ) THEN
    RAISE NOTICE 'Adding notes column to service_item';
    ALTER TABLE service_item ADD COLUMN notes TEXT;
    COMMENT ON COLUMN service_item.notes IS 'Internal notes not displayed on the bulletin';
  ELSE
    RAISE NOTICE 'service_item.notes already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 4: Create index on section for efficient grouping queries
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'service_item'
      AND indexname = 'idx_service_item_section'
  ) THEN
    RAISE NOTICE 'Creating idx_service_item_section index';
    CREATE INDEX idx_service_item_section ON service_item(tenant_id, service_date, section) WHERE deleted_at IS NULL;
  ELSE
    RAISE NOTICE 'idx_service_item_section already exists';
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- Added columns:
--   - duration_minutes (INTEGER): For service time calculations
--   - section (VARCHAR(50)): For grouping items (e.g., 'worship', 'message')
--   - notes (TEXT): Internal notes not shown on bulletin
-- Added index:
--   - idx_service_item_section: For efficient section-based queries
