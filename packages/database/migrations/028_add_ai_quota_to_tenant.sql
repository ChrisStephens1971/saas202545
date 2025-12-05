-- Migration: 028_add_ai_quota_to_tenant
-- Description: Add AI quota fields to tenant table for per-tenant usage limits
-- Created: 2025-12-01

-- Add AI-related columns to tenant table
-- ai_enabled: Whether AI features are enabled for this tenant (default true for existing tenants)
-- ai_monthly_token_limit: Maximum tokens (in + out) allowed per calendar month (NULL = no limit)

ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS ai_monthly_token_limit INTEGER NULL;

-- Add constraint to ensure limit is positive if set
ALTER TABLE tenant
ADD CONSTRAINT chk_ai_monthly_token_limit_positive
CHECK (ai_monthly_token_limit IS NULL OR ai_monthly_token_limit > 0);

COMMENT ON COLUMN tenant.ai_enabled IS 'Whether AI features are enabled for this tenant';
COMMENT ON COLUMN tenant.ai_monthly_token_limit IS 'Maximum total tokens (in + out) allowed per calendar month. NULL means no limit.';
