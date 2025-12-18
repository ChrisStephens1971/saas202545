-- ============================================================================
-- Migration 040: Add UI Mode to Person
-- ============================================================================
-- Adds per-user UI mode preference for dual-UI architecture.
--
-- UiMode values:
--   'accessible' - Elder-first default: 18px fonts, 48px touch targets (P15 baseline)
--   'modern'     - Denser layout: 16px fonts, 40px controls (still P15 compliant)
--
-- Default is 'accessible' to maintain elder-first design principles.
-- See: docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md
-- See: artifacts/P15_accessibility.md
-- ============================================================================

-- Add ui_mode column to person table with CHECK constraint
ALTER TABLE person
ADD COLUMN IF NOT EXISTS ui_mode VARCHAR(20) DEFAULT 'accessible'
CHECK (ui_mode IN ('modern', 'accessible'));

-- Add comment for documentation
COMMENT ON COLUMN person.ui_mode IS
  'Per-user UI mode preference: accessible (default, elder-first) or modern (denser but P15 compliant)';

-- Create index for potential filtering/analytics
CREATE INDEX IF NOT EXISTS idx_person_ui_mode ON person(tenant_id, ui_mode) WHERE deleted_at IS NULL;
