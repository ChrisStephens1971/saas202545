-- ============================================================================
-- Migration: 042_add_service_plan_template
-- Description: Add service plan templates table for reusable service structures
-- Phase 8: Templates & Plan Library UX
-- ============================================================================

-- Create service_plan_template table
-- Templates store reusable service structures without being tied to a specific date
CREATE TABLE service_plan_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  -- Template identity
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Default service timing
  start_time VARCHAR(20) DEFAULT '10:00 AM',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_service_plan_template_tenant ON service_plan_template(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_plan_template_name ON service_plan_template(tenant_id, name) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE service_plan_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_service_plan_template ON service_plan_template
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create service_plan_template_item table
-- Stores items belonging to a template
CREATE TABLE service_plan_template_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES service_plan_template(id) ON DELETE CASCADE,

  -- Item data (mirrors service_item structure)
  type VARCHAR(50) NOT NULL, -- Uses the same types as service_item
  sequence INT NOT NULL,
  title VARCHAR(255),
  content TEXT,
  ccli_number VARCHAR(50),
  scripture_ref VARCHAR(100),
  duration_minutes INT DEFAULT 3,
  section VARCHAR(100),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_template_item_tenant ON service_plan_template_item(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_template_item_template ON service_plan_template_item(template_id, sequence) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE service_plan_template_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_template_item ON service_plan_template_item
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
