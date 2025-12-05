-- Migration: 030_fix_ai_token_limit_constraint.sql
-- Description: Fix ai_monthly_token_limit constraint to allow 0 for disabled plans
-- The "core" plan sets ai_monthly_token_limit to 0 (no tokens allowed)

-- Drop the old constraint that required > 0
ALTER TABLE tenant DROP CONSTRAINT IF EXISTS chk_ai_monthly_token_limit_positive;

-- Add new constraint that allows 0 (for disabled plans) - only if it doesn't exist
-- Values can be: NULL (unlimited), 0 (disabled), or positive number (limited)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'chk_ai_monthly_token_limit_non_negative'
      AND table_name = 'tenant'
  ) THEN
    ALTER TABLE tenant ADD CONSTRAINT chk_ai_monthly_token_limit_non_negative
      CHECK (ai_monthly_token_limit IS NULL OR ai_monthly_token_limit >= 0);

    COMMENT ON CONSTRAINT chk_ai_monthly_token_limit_non_negative ON tenant IS
      'AI monthly token limit must be NULL (unlimited), 0 (disabled), or positive (limited)';
  END IF;
END $$;
