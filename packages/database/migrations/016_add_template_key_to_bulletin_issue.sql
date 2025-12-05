-- Migration 016: Add template_key to bulletin_issue
--
-- Purpose: Allow bulletins to be associated with a service template
-- (e.g., "Standard Sunday Worship", "Communion Sunday")
--
-- The template_key references a code-defined template that determines
-- the default service items for the bulletin.
--
-- Run: npm run db:migrate

-- Add template_key column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bulletin_issue'
      AND column_name = 'template_key'
  ) THEN
    ALTER TABLE bulletin_issue ADD COLUMN template_key TEXT NULL;
    RAISE NOTICE 'Added template_key column to bulletin_issue';
  ELSE
    RAISE NOTICE 'template_key column already exists on bulletin_issue';
  END IF;
END $$;

-- Add comment documenting the column
COMMENT ON COLUMN bulletin_issue.template_key IS 'Key referencing a code-defined service template (e.g., standard_sunday, communion_sunday)';

-- Optional: Create index for filtering by template
CREATE INDEX IF NOT EXISTS idx_bulletin_issue_template_key ON bulletin_issue(template_key) WHERE template_key IS NOT NULL;
