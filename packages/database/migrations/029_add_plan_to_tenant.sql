-- Migration: 029_add_plan_to_tenant.sql
-- Description: Add plan column to tenant table for plan-based AI behavior
-- The plan determines AI enabled status and monthly token limit

-- Add plan column to tenant table
-- Plan values: core, starter, standard, plus
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter';

-- Add a check constraint to ensure valid plan values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_plan_check'
  ) THEN
    ALTER TABLE tenant ADD CONSTRAINT tenant_plan_check
      CHECK (plan IN ('core', 'starter', 'standard', 'plus'));
  END IF;
END $$;

-- Create index for plan queries (admin reporting, etc.)
CREATE INDEX IF NOT EXISTS idx_tenant_plan ON tenant(plan);

COMMENT ON COLUMN tenant.plan IS 'Subscription plan: core, starter, standard, plus. Determines AI limits and features.';
