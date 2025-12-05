-- Migration 009: Add tax branding fields to brand_pack
-- Purpose: Enable tenant-specific branding for tax statements (replaces "Your Church Name" placeholders)
-- Table modified: brand_pack
--
-- New columns:
--   - legal_name: Official legal name for IRS tax documents
--   - ein: Employer Identification Number (tax ID)
--   - tax_statement_footer: Custom footer/note for tax statements
--   - Structured address fields for proper formatting on official documents
--
-- This migration is idempotent and safe to re-run.

-- Add legal_name for official IRS documents (falls back to church_name if null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pack' AND column_name = 'legal_name'
  ) THEN
    ALTER TABLE brand_pack ADD COLUMN legal_name VARCHAR(255);
    COMMENT ON COLUMN brand_pack.legal_name IS 'Official legal name for IRS tax documents';
  END IF;
END $$;

-- Add EIN (Employer Identification Number / Tax ID)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pack' AND column_name = 'ein'
  ) THEN
    ALTER TABLE brand_pack ADD COLUMN ein VARCHAR(20);
    COMMENT ON COLUMN brand_pack.ein IS 'Employer Identification Number (Tax ID) for IRS documents';
  END IF;
END $$;

-- Add custom tax statement footer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pack' AND column_name = 'tax_statement_footer'
  ) THEN
    ALTER TABLE brand_pack ADD COLUMN tax_statement_footer TEXT;
    COMMENT ON COLUMN brand_pack.tax_statement_footer IS 'Custom footer text for tax statements';
  END IF;
END $$;

-- Add structured address fields for proper tax document formatting
-- These supplement the existing church_address field (which can remain for bulletin use)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pack' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE brand_pack ADD COLUMN address_line1 VARCHAR(255);
    COMMENT ON COLUMN brand_pack.address_line1 IS 'Street address line 1';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pack' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE brand_pack ADD COLUMN address_line2 VARCHAR(255);
    COMMENT ON COLUMN brand_pack.address_line2 IS 'Street address line 2 (suite, unit, etc.)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pack' AND column_name = 'city'
  ) THEN
    ALTER TABLE brand_pack ADD COLUMN city VARCHAR(100);
    COMMENT ON COLUMN brand_pack.city IS 'City';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pack' AND column_name = 'state'
  ) THEN
    ALTER TABLE brand_pack ADD COLUMN state VARCHAR(50);
    COMMENT ON COLUMN brand_pack.state IS 'State/Province';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pack' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE brand_pack ADD COLUMN postal_code VARCHAR(20);
    COMMENT ON COLUMN brand_pack.postal_code IS 'ZIP/Postal code';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pack' AND column_name = 'country'
  ) THEN
    ALTER TABLE brand_pack ADD COLUMN country VARCHAR(50) DEFAULT 'US';
    COMMENT ON COLUMN brand_pack.country IS 'Country code (default: US)';
  END IF;
END $$;

-- Backfill: Copy church_name to legal_name where legal_name is null
UPDATE brand_pack
SET legal_name = church_name
WHERE legal_name IS NULL AND church_name IS NOT NULL;

-- Summary of changes to brand_pack table:
-- +----------------+---------------+------------------------------------------+
-- | Column         | Type          | Purpose                                  |
-- +----------------+---------------+------------------------------------------+
-- | legal_name     | VARCHAR(255)  | Official name for IRS documents          |
-- | ein            | VARCHAR(20)   | Tax ID / EIN                             |
-- | tax_statement_footer | TEXT    | Custom footer for tax statements         |
-- | address_line1  | VARCHAR(255)  | Street address line 1                    |
-- | address_line2  | VARCHAR(255)  | Street address line 2                    |
-- | city           | VARCHAR(100)  | City                                     |
-- | state          | VARCHAR(50)   | State/Province                           |
-- | postal_code    | VARCHAR(20)   | ZIP/Postal code                          |
-- | country        | VARCHAR(50)   | Country (default 'US')                   |
-- +----------------+---------------+------------------------------------------+
