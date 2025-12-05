-- ============================================================================
-- Migration 008: Ensure Tax Tracking Columns on Donation Table
-- ============================================================================
-- This migration ensures fund_id and is_tax_deductible columns exist on the
-- donation table. It's idempotent and safe to run multiple times.
-- ============================================================================

-- Add fund_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donation' AND column_name = 'fund_id'
  ) THEN
    ALTER TABLE donation ADD COLUMN fund_id UUID;
    RAISE NOTICE 'Added fund_id column to donation table';
  ELSE
    RAISE NOTICE 'fund_id column already exists on donation table';
  END IF;
END $$;

-- Add is_tax_deductible column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donation' AND column_name = 'is_tax_deductible'
  ) THEN
    ALTER TABLE donation ADD COLUMN is_tax_deductible BOOLEAN NOT NULL DEFAULT true;
    RAISE NOTICE 'Added is_tax_deductible column to donation table';
  ELSE
    RAISE NOTICE 'is_tax_deductible column already exists on donation table';
  END IF;
END $$;

-- Add foreign key constraint for fund_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_donation_fund' AND table_name = 'donation'
  ) THEN
    ALTER TABLE donation
      ADD CONSTRAINT fk_donation_fund
        FOREIGN KEY (fund_id) REFERENCES fund(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added foreign key constraint fk_donation_fund';
  ELSE
    RAISE NOTICE 'Foreign key constraint fk_donation_fund already exists';
  END IF;
END $$;

-- Create index for tax reporting queries (person_id + donation_date + is_tax_deductible)
CREATE INDEX IF NOT EXISTS idx_donation_tax_reporting
  ON donation(person_id, donation_date DESC, is_tax_deductible)
  WHERE deleted_at IS NULL AND status = 'completed';

-- Create index for fund queries
CREATE INDEX IF NOT EXISTS idx_donation_fund
  ON donation(fund_id)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- BACKFILL EXISTING DATA
-- ============================================================================

-- Ensure all existing donations have is_tax_deductible set to true
UPDATE donation
SET is_tax_deductible = true
WHERE is_tax_deductible IS NULL;

-- ============================================================================
-- CREATE DEFAULT "GENERAL FUND" IF NO FUNDS EXIST
-- ============================================================================

DO $$
DECLARE
  tenant_record RECORD;
  general_fund_id UUID;
BEGIN
  -- Loop through all tenants
  FOR tenant_record IN SELECT id FROM tenant WHERE deleted_at IS NULL LOOP
    -- Check if tenant has any funds
    IF NOT EXISTS (
      SELECT 1 FROM fund
      WHERE tenant_id = tenant_record.id AND deleted_at IS NULL
    ) THEN
      -- Create a General Fund for this tenant
      INSERT INTO fund (tenant_id, name, description, is_active, is_default)
      VALUES (
        tenant_record.id,
        'General Fund',
        'General church giving and tithes',
        true,
        true
      )
      RETURNING id INTO general_fund_id;

      RAISE NOTICE 'Created General Fund for tenant %', tenant_record.id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- DATABASE FUNCTIONS FOR TAX SUMMARY
-- ============================================================================

-- Function to get tax-deductible donation summary for a person and year
CREATE OR REPLACE FUNCTION get_tax_summary_by_person(
  p_tenant_id UUID,
  p_person_id UUID,
  p_year INTEGER,
  p_include_fund_breakdown BOOLEAN DEFAULT false
)
RETURNS TABLE(
  person_id UUID,
  year INTEGER,
  total_amount DECIMAL,
  currency VARCHAR,
  fund_breakdown JSONB
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calculate year boundaries
  v_start_date := make_date(p_year, 1, 1);
  v_end_date := make_date(p_year, 12, 31);

  RETURN QUERY
  SELECT
    p_person_id as person_id,
    p_year as year,
    COALESCE(SUM(d.amount), 0) as total_amount,
    COALESCE(MAX(d.currency), 'USD') as currency,
    CASE
      WHEN p_include_fund_breakdown THEN
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'fundId', f.id,
              'fundName', f.name,
              'totalAmount', fund_total.amount
            )
            ORDER BY f.name
          )
          FROM (
            SELECT
              COALESCE(fund_id, '00000000-0000-0000-0000-000000000000'::uuid) as fund_id,
              SUM(amount) as amount
            FROM donation
            WHERE tenant_id = p_tenant_id
              AND person_id = p_person_id
              AND is_tax_deductible = true
              AND status = 'completed'
              AND deleted_at IS NULL
              AND donation_date BETWEEN v_start_date AND v_end_date
            GROUP BY fund_id
          ) fund_total
          LEFT JOIN fund f ON fund_total.fund_id = f.id
        )
      ELSE NULL
    END as fund_breakdown
  FROM donation d
  WHERE d.tenant_id = p_tenant_id
    AND d.person_id = p_person_id
    AND d.is_tax_deductible = true
    AND d.status = 'completed'
    AND d.deleted_at IS NULL
    AND d.donation_date BETWEEN v_start_date AND v_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get tax summaries for all givers in a year (for bulk statement generation)
CREATE OR REPLACE FUNCTION get_tax_summaries_for_year(
  p_tenant_id UUID,
  p_year INTEGER
)
RETURNS TABLE(
  person_id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR,
  total_amount DECIMAL,
  currency VARCHAR,
  donation_count BIGINT
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calculate year boundaries
  v_start_date := make_date(p_year, 1, 1);
  v_end_date := make_date(p_year, 12, 31);

  RETURN QUERY
  SELECT
    p.id as person_id,
    p.first_name,
    p.last_name,
    p.email,
    COALESCE(SUM(d.amount), 0) as total_amount,
    COALESCE(MAX(d.currency), 'USD') as currency,
    COUNT(d.id) as donation_count
  FROM person p
  INNER JOIN donation d ON p.id = d.person_id
  WHERE d.tenant_id = p_tenant_id
    AND d.is_tax_deductible = true
    AND d.status = 'completed'
    AND d.deleted_at IS NULL
    AND d.donation_date BETWEEN v_start_date AND v_end_date
    AND p.deleted_at IS NULL
  GROUP BY p.id, p.first_name, p.last_name, p.email
  HAVING SUM(d.amount) > 0
  ORDER BY p.last_name, p.first_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN donation.fund_id IS 'Foreign key to fund table - which fund this donation goes to';
COMMENT ON COLUMN donation.is_tax_deductible IS 'Whether this donation is tax-deductible (default true for most church donations)';
COMMENT ON FUNCTION get_tax_summary_by_person IS 'Get tax-deductible donation summary for a person and year with optional fund breakdown';
COMMENT ON FUNCTION get_tax_summaries_for_year IS 'Get tax-deductible summaries for all givers in a year (for bulk statement generation)';
