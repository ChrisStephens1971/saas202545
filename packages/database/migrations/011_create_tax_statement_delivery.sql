-- Migration 011: Create tax_statement_delivery table
-- Purpose: Track when tax statements are printed, emailed, or otherwise delivered
-- This provides an audit trail for year-end tax statement distribution
--
-- This migration is idempotent and safe to re-run.

-- Drop existing table if it exists (to fix any schema issues from partial runs)
-- This is safe because this is a new table with no production data yet
DROP TABLE IF EXISTS tax_statement_delivery CASCADE;

-- Create the tax_statement_delivery table
-- NOTE: tenant_id is TEXT (not UUID) to support both UUID and dev-mode string tenant IDs
-- (e.g., "dev-tenant-1"). This matches how ctx.tenantId flows through the application.
-- RLS policy handles tenant isolation without requiring a strict UUID type.
CREATE TABLE tax_statement_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('printed', 'emailed', 'other')),
  destination VARCHAR(255) NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE tax_statement_delivery IS 'Audit log of tax statement deliveries (print, email, etc.)';
COMMENT ON COLUMN tax_statement_delivery.tenant_id IS 'Tenant/organization this delivery belongs to';
COMMENT ON COLUMN tax_statement_delivery.person_id IS 'The person whose tax statement was delivered';
COMMENT ON COLUMN tax_statement_delivery.year IS 'Tax year (e.g., 2025)';
COMMENT ON COLUMN tax_statement_delivery.method IS 'Delivery method: printed, emailed, or other';
COMMENT ON COLUMN tax_statement_delivery.destination IS 'For email: the email address; for printed: optional note';
COMMENT ON COLUMN tax_statement_delivery.delivered_at IS 'When the statement was delivered/marked';
COMMENT ON COLUMN tax_statement_delivery.created_by IS 'User ID of admin who marked it delivered';
COMMENT ON COLUMN tax_statement_delivery.notes IS 'Optional notes about the delivery';

-- Create composite index for efficient lookups by org/year/person
CREATE INDEX idx_tax_stmt_deliv_tenant_year_person
  ON tax_statement_delivery (tenant_id, year, person_id, delivered_at DESC);

-- Create index for person lookups (for cascade deletes and joins)
CREATE INDEX idx_tax_stmt_deliv_person
  ON tax_statement_delivery (person_id);

-- Enable Row Level Security
ALTER TABLE tax_statement_delivery ENABLE ROW LEVEL SECURITY;

-- RLS Policy: tenant_id is compared as TEXT (no ::uuid cast) to support
-- both UUID and string-based tenant IDs used in development environments.
CREATE POLICY tax_statement_delivery_tenant_isolation ON tax_statement_delivery
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));
