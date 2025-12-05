-- ============================================================================
-- Phase 5: Sermon Plans & Templates
-- ============================================================================
-- Adds sermon_templates table for reusable sermon outline templates
-- Adds sermon_plans table for persisting sermon outlines built via Sermon Helper

-- ============================================================================
-- SERMON TEMPLATES (create first - no dependencies on other new tables)
-- ============================================================================
-- Reusable sermon outline templates that can bootstrap new sermons.
-- Created from existing sermon plans via "Save as Template".

CREATE TABLE sermon_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  -- Template info
  name VARCHAR(200) NOT NULL,

  -- Default values for new sermons
  default_title VARCHAR(200),
  default_big_idea VARCHAR(500),
  default_primary_text VARCHAR(100),
  default_supporting_texts TEXT[] DEFAULT '{}',

  -- Outline skeleton (JSONB array of SermonElement)
  structure JSONB NOT NULL DEFAULT '[]',

  -- Categorization
  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sermon_template_tenant ON sermon_template(tenant_id);
CREATE INDEX idx_sermon_template_tags ON sermon_template USING gin(tags);

ALTER TABLE sermon_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sermon_template ON sermon_template
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- SERMON PLANS (create second - references sermon_template)
-- ============================================================================
-- Stores structured sermon plans built from Sermon Helper or imported from manuscripts.
-- Elements are stored as JSONB to allow flexible structure (section, point, note, scripture, hymn).

CREATE TABLE sermon_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  sermon_id UUID NOT NULL REFERENCES sermon(id) ON DELETE CASCADE,

  -- Core content
  title VARCHAR(200) NOT NULL,
  big_idea VARCHAR(500),
  primary_text VARCHAR(100),
  supporting_texts TEXT[] DEFAULT '{}',

  -- Structured outline elements (discriminated union stored as JSONB)
  elements JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Template reference (if created from a template)
  template_id UUID REFERENCES sermon_template(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sermon_plan_tenant ON sermon_plan(tenant_id);
CREATE INDEX idx_sermon_plan_sermon ON sermon_plan(sermon_id);
CREATE UNIQUE INDEX idx_sermon_plan_sermon_unique ON sermon_plan(sermon_id);

ALTER TABLE sermon_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sermon_plan ON sermon_plan
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_sermon_template_updated_at BEFORE UPDATE ON sermon_template
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sermon_plan_updated_at BEFORE UPDATE ON sermon_plan
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sermon_template IS 'Reusable sermon outline templates for bootstrapping new sermons';
COMMENT ON TABLE sermon_plan IS 'Persisted sermon outlines built via Sermon Helper or imported from manuscripts';
COMMENT ON COLUMN sermon_plan.elements IS 'JSONB array of SermonElement: {id, type, ...} where type is section|point|note|scripture|hymn';
COMMENT ON COLUMN sermon_template.structure IS 'JSONB array of SermonElement skeleton for new sermons';
