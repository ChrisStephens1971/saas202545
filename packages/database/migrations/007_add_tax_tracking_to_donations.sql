-- ============================================================================
-- Migration 007: Add Tax-Compliant Donation Tracking
-- ============================================================================
-- Adds fund_id FK and is_tax_deductible boolean to support year-end tax reporting
-- ============================================================================

-- Add fund_id foreign key to donation table
ALTER TABLE donation
  ADD COLUMN IF NOT EXISTS fund_id UUID REFERENCES fund(id) ON DELETE SET NULL;

-- Add is_tax_deductible boolean (default true for church donations)
ALTER TABLE donation
  ADD COLUMN IF NOT EXISTS is_tax_deductible BOOLEAN DEFAULT true NOT NULL;

-- Create index for tax reporting queries (personId + year + tax deductible status)
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

-- Set is_tax_deductible = true for all existing donations
-- (Most church donations are tax-deductible by default)
UPDATE donation
SET is_tax_deductible = true
WHERE is_tax_deductible IS NULL;

-- ============================================================================
-- CREATE DEFAULT "GENERAL FUND" IF NO FUNDS EXIST
-- ============================================================================

-- Function to create a default General Fund for each tenant if they don't have one
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
-- DATABASE FUNCTION FOR TAX SUMMARY
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
