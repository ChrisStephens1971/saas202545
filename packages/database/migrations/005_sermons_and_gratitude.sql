-- ============================================================================
-- Sprint 6: Sermons & Gratitude / Thank-You Notes
-- ============================================================================

-- ============================================================================
-- SERMON SERIES
-- ============================================================================

CREATE TABLE sermon_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  title VARCHAR(200) NOT NULL,
  description TEXT,
  slug VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sermon_series_tenant ON sermon_series(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sermon_series_slug ON sermon_series(tenant_id, slug) WHERE deleted_at IS NULL;

ALTER TABLE sermon_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sermon_series ON sermon_series
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- SERMONS
-- ============================================================================

CREATE TABLE sermon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  -- Organization
  series_id UUID REFERENCES sermon_series(id) ON DELETE SET NULL,

  -- Core metadata
  title VARCHAR(200) NOT NULL,
  preacher VARCHAR(150),

  -- Scripture references
  primary_scripture VARCHAR(100),
  additional_scripture TEXT,

  -- Date
  sermon_date DATE NOT NULL,

  -- Content
  manuscript TEXT,
  audio_url TEXT,
  video_url TEXT,

  -- Categorization
  tags TEXT[], -- Array of tags for filtering/search

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sermon_tenant ON sermon(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sermon_series ON sermon(series_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sermon_date ON sermon(tenant_id, sermon_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_sermon_preacher ON sermon(tenant_id, preacher) WHERE deleted_at IS NULL;

ALTER TABLE sermon ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sermon ON sermon
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- LINK SERVICE ITEMS TO SERMONS
-- ============================================================================

-- Add sermon_id to service_item table (from 001_initial_schema.sql)
-- This allows bulletin "Sermon" service items to link to rich sermon records
ALTER TABLE service_item ADD COLUMN sermon_id UUID REFERENCES sermon(id) ON DELETE SET NULL;

CREATE INDEX idx_service_item_sermon ON service_item(sermon_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- THANK-YOU NOTES / GRATITUDE LOG
-- ============================================================================

CREATE TABLE thank_you_note (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  -- Who received the thank-you
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

  -- Optional context linkage
  donation_id UUID REFERENCES donation(id) ON DELETE SET NULL,
  event_id UUID REFERENCES event(id) ON DELETE SET NULL,

  -- Note details
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel VARCHAR(50) NOT NULL, -- 'Card', 'Email', 'Text', 'Call', 'In-Person'
  subject VARCHAR(200),
  body TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES person(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_thank_you_note_tenant ON thank_you_note(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_thank_you_note_person ON thank_you_note(person_id, note_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_thank_you_note_donation ON thank_you_note(donation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_thank_you_note_event ON thank_you_note(event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_thank_you_note_date ON thank_you_note(tenant_id, note_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_thank_you_note_channel ON thank_you_note(tenant_id, channel) WHERE deleted_at IS NULL;

ALTER TABLE thank_you_note ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_thank_you_note ON thank_you_note
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_sermon_series_updated_at BEFORE UPDATE ON sermon_series
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sermon_updated_at BEFORE UPDATE ON sermon
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_thank_you_note_updated_at BEFORE UPDATE ON thank_you_note
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- HELPER FUNCTION: GET SERMON STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sermon_stats(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_sermons BIGINT,
  unique_preachers BIGINT,
  series_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_sermons,
    COUNT(DISTINCT preacher) as unique_preachers,
    COUNT(DISTINCT series_id) as series_count
  FROM sermon
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND sermon_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sermon_series IS 'Sermon series for organizing related sermons (e.g., "Gospel of John", "Faith & Doubt")';
COMMENT ON TABLE sermon IS 'Individual sermon records with full metadata, manuscript, and media links';
COMMENT ON TABLE thank_you_note IS 'Thank-you notes for pastoral care, donor stewardship, and volunteer appreciation';
COMMENT ON FUNCTION get_sermon_stats IS 'Get sermon statistics for a date range';
