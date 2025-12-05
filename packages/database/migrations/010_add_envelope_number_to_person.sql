-- Migration 010: Add envelope_number to person table
-- Purpose: Allow churches to assign giving envelope numbers to members
-- Table modified: person
--
-- Envelope numbers are optional and not enforced as unique
-- (churches may reuse numbers or change assignments over time)
--
-- This migration is idempotent and safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'person' AND column_name = 'envelope_number'
  ) THEN
    ALTER TABLE person ADD COLUMN envelope_number VARCHAR(50);
    COMMENT ON COLUMN person.envelope_number IS 'Optional giving envelope number for donation tracking';
  END IF;
END $$;

-- Create index for faster lookups by envelope number (within tenant)
CREATE INDEX IF NOT EXISTS idx_person_envelope_number
  ON person(tenant_id, envelope_number)
  WHERE envelope_number IS NOT NULL AND deleted_at IS NULL;
