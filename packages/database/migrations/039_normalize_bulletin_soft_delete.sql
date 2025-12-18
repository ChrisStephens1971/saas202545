-- Migration: Normalize bulletin soft-delete mechanism
--
-- Problem: The codebase has two soft-delete mechanisms that can be out of sync:
--   1. deleted_at timestamp (used by the delete procedure)
--   2. status = 'deleted' enum (legacy data)
--
-- Solution: Make deleted_at the canonical flag while keeping status = 'deleted'
-- as a mirror for compatibility. Enforce consistency via CHECK constraint.
--
-- This migration:
--   1. Backfills deleted_at for rows where status = 'deleted' but deleted_at IS NULL
--   2. Backfills status = 'deleted' for rows where deleted_at IS NOT NULL but status <> 'deleted'
--   3. Replaces the partial unique index to use deleted_at instead of status
--   4. Adds a CHECK constraint to enforce consistency going forward

-- Step 1: Backfill deleted_at for orphaned status='deleted' rows
-- These are rows that were deleted via the old mechanism
UPDATE bulletin_issue
SET deleted_at = COALESCE(deleted_at, NOW())
WHERE status = 'deleted' AND deleted_at IS NULL;

-- Step 2: Backfill status='deleted' for orphaned deleted_at rows
-- These are rows that were deleted via the new mechanism but status wasn't set
UPDATE bulletin_issue
SET status = 'deleted'
WHERE deleted_at IS NOT NULL AND status <> 'deleted';

-- Step 3: Drop the old partial unique index that used status
DROP INDEX IF EXISTS bulletin_issue_tenant_date_unique_active;

-- Step 4: Create new partial unique index using deleted_at (the canonical flag)
-- This is the key change: deleted_at IS NULL is now the source of truth
CREATE UNIQUE INDEX bulletin_issue_tenant_date_unique_active
  ON bulletin_issue (tenant_id, issue_date)
  WHERE deleted_at IS NULL;

-- Step 5: Add CHECK constraint to enforce that status and deleted_at stay in sync
-- This prevents any future code path from creating inconsistent states
--
-- The constraint says:
--   (status = 'deleted') = (deleted_at IS NOT NULL)
-- Which means:
--   - If status IS 'deleted', then deleted_at MUST be NOT NULL
--   - If deleted_at IS NOT NULL, then status MUST be 'deleted'
--   - If status is NOT 'deleted', then deleted_at MUST be NULL
--   - If deleted_at IS NULL, then status can be anything EXCEPT 'deleted'
ALTER TABLE bulletin_issue
ADD CONSTRAINT bulletin_deleted_consistent
CHECK (
  (status = 'deleted') = (deleted_at IS NOT NULL)
);

-- Verification query (run manually to confirm):
-- SELECT
--   CASE
--     WHEN status = 'deleted' AND deleted_at IS NULL THEN 'ORPHAN: status=deleted, no timestamp'
--     WHEN status <> 'deleted' AND deleted_at IS NOT NULL THEN 'ORPHAN: timestamp set, wrong status'
--     WHEN status = 'deleted' AND deleted_at IS NOT NULL THEN 'OK: deleted (both agree)'
--     ELSE 'OK: not deleted'
--   END as scenario,
--   COUNT(*) as count
-- FROM bulletin_issue
-- GROUP BY scenario;
