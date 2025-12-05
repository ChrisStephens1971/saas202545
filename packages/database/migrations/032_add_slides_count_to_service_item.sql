-- Migration: 032_add_slides_count_to_service_item
-- Purpose: Add slides_count column for tracking presentation slides per service item
--   - slides_count: total number of slides associated with this item
--   - Null or 0 = "no slides / unknown"
-- Run: npm run db:migrate

-- ============================================================================
-- Step 1: Add slides_count column
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_item'
      AND column_name = 'slides_count'
  ) THEN
    RAISE NOTICE 'Adding slides_count column to service_item';
    ALTER TABLE service_item ADD COLUMN slides_count INTEGER;
    COMMENT ON COLUMN service_item.slides_count IS 'Total number of presentation slides for this item. Null or 0 means no slides.';
  ELSE
    RAISE NOTICE 'service_item.slides_count already exists';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Add constraint to ensure non-negative values
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'service_item'
      AND constraint_name = 'service_item_slides_count_check'
  ) THEN
    RAISE NOTICE 'Adding slides_count constraint';
    ALTER TABLE service_item ADD CONSTRAINT service_item_slides_count_check CHECK (slides_count IS NULL OR slides_count >= 0);
  ELSE
    RAISE NOTICE 'service_item_slides_count_check constraint already exists';
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- Added column:
--   - slides_count (INTEGER): Total slides for this service item
--     - Nullable, defaults to NULL
--     - Must be >= 0 when set
--     - NULL or 0 means "no slides"
