-- Migration 015: Fix audit_log tenant_id from UUID to TEXT
--
-- ROOT CAUSE: The audit_log table has tenant_id UUID, but the log_audit_trigger()
-- function copies NEW.tenant_id from tables like bulletin_issue (now TEXT) into
-- audit_log (still UUID), causing type mismatch errors.
--
-- Error: "column tenant_id is of type uuid but expression is of type text"
-- Where: "PL/pgSQL function log_audit_trigger() line 29 at SQL statement"
--
-- Solution: Change audit_log.tenant_id to TEXT to match all other tables.
--
-- Run: npm run db:migrate

-- ============================================================================
-- FIX AUDIT_LOG TABLE
-- ============================================================================

-- Step 1: Drop the FK constraint on tenant_id
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_tenant_id_fkey;

-- Step 2: Alter tenant_id from UUID to TEXT
-- (The trigger function doesn't need changes - it just copies NEW.tenant_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_log'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    RAISE NOTICE 'audit_log.tenant_id is UUID, converting to TEXT';
    ALTER TABLE audit_log ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;
  ELSE
    RAISE NOTICE 'audit_log.tenant_id is already TEXT';
  END IF;
END $$;

-- Step 3: Add comment documenting the TEXT pattern
COMMENT ON COLUMN audit_log.tenant_id IS 'Tenant ID as TEXT (supports dev-tenant-1 and UUID strings)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'tenant_id';

  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'audit_log.tenant_id: %', col_type;

  IF col_type = 'text' THEN
    RAISE NOTICE 'SUCCESS: audit_log.tenant_id is now TEXT';
  ELSE
    RAISE WARNING 'PROBLEM: audit_log.tenant_id is still %', col_type;
  END IF;
END $$;
