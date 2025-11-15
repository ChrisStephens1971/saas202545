-- ============================================================================
-- Sprint 5: Communications, Notifications & Member Directory
-- ============================================================================

-- ============================================================================
-- EMAIL & SMS COMMUNICATIONS
-- ============================================================================

CREATE TYPE communication_type AS ENUM ('email', 'sms', 'push');
CREATE TYPE communication_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');

CREATE TABLE communication_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template type
  communication_type communication_type NOT NULL,

  -- Content
  subject VARCHAR(255), -- For emails
  body TEXT NOT NULL,

  -- Template variables (JSON array: ["firstName", "eventName", etc.])
  variables JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES person(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_communication_template_tenant ON communication_template(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_communication_template_type ON communication_template(tenant_id, communication_type) WHERE deleted_at IS NULL;

ALTER TABLE communication_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_communication_template ON communication_template
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- COMMUNICATION CAMPAIGNS
-- ============================================================================

CREATE TABLE communication_campaign (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template reference
  template_id UUID REFERENCES communication_template(id) ON DELETE SET NULL,

  -- Type
  communication_type communication_type NOT NULL,

  -- Content (overrides template if provided)
  subject VARCHAR(255),
  body TEXT NOT NULL,

  -- Scheduling
  status communication_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Audience filters (JSON: {groups: [...], membershipStatus: [...], etc.})
  audience_filter JSONB,

  -- Stats
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,

  created_by UUID REFERENCES person(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_communication_campaign_tenant ON communication_campaign(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_communication_campaign_status ON communication_campaign(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_communication_campaign_scheduled ON communication_campaign(scheduled_at) WHERE status = 'scheduled';

ALTER TABLE communication_campaign ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_communication_campaign ON communication_campaign
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- COMMUNICATION LOG (individual sends)
-- ============================================================================

CREATE TABLE communication_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES communication_campaign(id) ON DELETE CASCADE,

  -- Recipient
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),

  -- Type
  communication_type communication_type NOT NULL,

  -- Content sent
  subject VARCHAR(255),
  body TEXT,

  -- Status tracking
  status communication_status DEFAULT 'sending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,

  -- External provider tracking
  external_id VARCHAR(255), -- SendGrid/Twilio message ID

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communication_log_tenant ON communication_log(tenant_id);
CREATE INDEX idx_communication_log_campaign ON communication_log(campaign_id);
CREATE INDEX idx_communication_log_person ON communication_log(person_id);
CREATE INDEX idx_communication_log_status ON communication_log(status);

ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_communication_log ON communication_log
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- MEMBER DIRECTORY SETTINGS
-- ============================================================================

CREATE TABLE directory_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

  -- Privacy settings
  show_in_directory BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT true,
  show_phone BOOLEAN DEFAULT true,
  show_address BOOLEAN DEFAULT false,
  show_birthday BOOLEAN DEFAULT false,
  show_photo BOOLEAN DEFAULT true,

  -- Contact preferences
  allow_email_contact BOOLEAN DEFAULT true,
  allow_phone_contact BOOLEAN DEFAULT true,
  allow_text_contact BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, person_id)
);

CREATE INDEX idx_directory_settings_tenant ON directory_settings(tenant_id);
CREATE INDEX idx_directory_settings_person ON directory_settings(person_id);
CREATE INDEX idx_directory_settings_visible ON directory_settings(tenant_id) WHERE show_in_directory = true;

ALTER TABLE directory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_directory_settings ON directory_settings
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- PRAYER REQUESTS
-- ============================================================================

CREATE TYPE prayer_request_status AS ENUM ('active', 'answered', 'archived');
CREATE TYPE prayer_request_visibility AS ENUM ('public', 'leaders_only', 'private');

CREATE TABLE prayer_request (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  -- Requester
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,
  requester_name VARCHAR(255), -- For anonymous requests

  -- Request details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Status & visibility
  status prayer_request_status DEFAULT 'active',
  visibility prayer_request_visibility DEFAULT 'public',

  -- Metadata
  is_urgent BOOLEAN DEFAULT false,
  answered_at TIMESTAMPTZ,
  answer_note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_prayer_request_tenant ON prayer_request(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prayer_request_status ON prayer_request(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_prayer_request_visibility ON prayer_request(tenant_id, visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_prayer_request_person ON prayer_request(person_id) WHERE deleted_at IS NULL;

ALTER TABLE prayer_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_prayer_request ON prayer_request
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- PRAYER REQUEST PRAYERS (tracking who prayed)
-- ============================================================================

CREATE TABLE prayer_request_prayer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  prayer_request_id UUID NOT NULL REFERENCES prayer_request(id) ON DELETE CASCADE,
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,

  note TEXT,
  prayed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(prayer_request_id, person_id)
);

CREATE INDEX idx_prayer_request_prayer_tenant ON prayer_request_prayer(tenant_id);
CREATE INDEX idx_prayer_request_prayer_request ON prayer_request_prayer(prayer_request_id);
CREATE INDEX idx_prayer_request_prayer_person ON prayer_request_prayer(person_id);

ALTER TABLE prayer_request_prayer ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_prayer_request_prayer ON prayer_request_prayer
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_communication_template_updated_at BEFORE UPDATE ON communication_template
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_communication_campaign_updated_at BEFORE UPDATE ON communication_campaign
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_directory_settings_updated_at BEFORE UPDATE ON directory_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_prayer_request_updated_at BEFORE UPDATE ON prayer_request
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCTION TO GET DIRECTORY MEMBERS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_directory_members(p_tenant_id UUID)
RETURNS TABLE(
  id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  photo_url TEXT,
  membership_status VARCHAR,
  show_email BOOLEAN,
  show_phone BOOLEAN,
  show_photo BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    CASE WHEN COALESCE(ds.show_email, true) THEN p.email ELSE NULL END,
    CASE WHEN COALESCE(ds.show_phone, true) THEN p.phone ELSE NULL END,
    CASE WHEN COALESCE(ds.show_photo, true) THEN p.photo_url ELSE NULL END,
    p.membership_status::VARCHAR,
    COALESCE(ds.show_email, true),
    COALESCE(ds.show_phone, true),
    COALESCE(ds.show_photo, true)
  FROM person p
  LEFT JOIN directory_settings ds ON p.id = ds.person_id AND ds.tenant_id = p.tenant_id
  WHERE p.tenant_id = p_tenant_id
    AND p.deleted_at IS NULL
    AND COALESCE(ds.show_in_directory, true) = true
  ORDER BY p.last_name, p.first_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE communication_template IS 'Reusable email/SMS templates';
COMMENT ON TABLE communication_campaign IS 'Email/SMS campaigns sent to groups';
COMMENT ON TABLE communication_log IS 'Individual communication tracking';
COMMENT ON TABLE directory_settings IS 'Member directory privacy settings';
COMMENT ON TABLE prayer_request IS 'Prayer requests from members';
COMMENT ON TABLE prayer_request_prayer IS 'Track who has prayed for requests';
COMMENT ON FUNCTION get_directory_members IS 'Get directory members respecting privacy settings';
