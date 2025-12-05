-- Migration: Replace bulletin_issue unique constraint with partial index
-- This allows creating new bulletins for the same date after soft-deleting old ones
--
-- Problem: UNIQUE(tenant_id, issue_date) blocks creating new bulletins
-- even when the existing one has status = 'deleted'
--
-- Solution: Use a partial unique index that only enforces uniqueness
-- for non-deleted bulletins (status != 'deleted')

-- Drop the old unique constraint
-- Note: In PostgreSQL, a UNIQUE constraint creates an implicit index
-- We need to find and drop the constraint by name
ALTER TABLE bulletin_issue
  DROP CONSTRAINT IF EXISTS bulletin_issue_tenant_id_issue_date_key;

-- Create a partial unique index that excludes deleted bulletins
-- This allows multiple bulletins with same (tenant_id, issue_date) as long as
-- all but one have status = 'deleted'
CREATE UNIQUE INDEX bulletin_issue_tenant_date_unique_active
  ON bulletin_issue (tenant_id, issue_date)
  WHERE status <> 'deleted';

-- Note: This partial index means:
-- - You can have 1 active bulletin (draft/approved/built/locked) per tenant+date
-- - You can have multiple deleted bulletins for the same tenant+date
-- - Soft-delete truly makes a bulletin "gone" from normal operations
