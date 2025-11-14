-- ============================================================================
-- Elder-First Church Platform - Multi-Tenant Data Model
-- PostgreSQL 14+ with Row-Level Security (RLS)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- ENUMS & CUSTOM TYPES
-- ============================================================================

CREATE TYPE role_name AS ENUM ('Admin', 'Editor', 'Submitter', 'Viewer', 'Kiosk');

CREATE TYPE service_item_type AS ENUM (
  'Welcome',
  'CallToWorship',
  'Song',
  'Prayer',
  'Scripture',
  'Sermon',
  'Offering',
  'Communion',
  'Benediction',
  'Announcement',
  'Other'
);

CREATE TYPE bulletin_status AS ENUM ('draft', 'approved', 'built', 'locked');

CREATE TYPE announcement_priority AS ENUM ('Urgent', 'High', 'Normal');

CREATE TYPE rsvp_response AS ENUM ('Yes', 'No', 'Maybe');

CREATE TYPE contribution_method AS ENUM ('Card', 'ACH', 'Cash', 'Check', 'ApplePay', 'GooglePay');

CREATE TYPE contribution_frequency AS ENUM ('OneTime', 'Weekly', 'Monthly');

-- ============================================================================
-- CORE TENANT TABLE (No RLS - referenced by all other tables)
-- ============================================================================

CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL, -- "gracechurch" for gracechurch.elderfirst.app
  name VARCHAR(255) NOT NULL,

  -- Subscription
  status VARCHAR(50) DEFAULT 'trial', -- trial, active, suspended, cancelled
  trial_ends_at TIMESTAMPTZ,

  -- Contact
  primary_email VARCHAR(255),
  primary_phone VARCHAR(50),

  -- Settings
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  locale VARCHAR(10) DEFAULT 'en-US',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenant_slug ON tenant(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_status ON tenant(status) WHERE deleted_at IS NULL;

-- ============================================================================
-- PEOPLE & HOUSEHOLDS
-- ============================================================================

CREATE TABLE household (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL, -- "Smith Family"
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_household_tenant ON household(tenant_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE household ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_household ON household
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE person (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  household_id UUID REFERENCES household(id) ON DELETE SET NULL,

  -- Identity
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  photo_url TEXT,

  -- Demographics
  date_of_birth DATE,
  gender VARCHAR(50),

  -- Membership
  member_since DATE,
  membership_status VARCHAR(50) DEFAULT 'member', -- member, attendee, visitor

  -- External IDs (for imports)
  planning_center_id VARCHAR(100),
  external_id VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_person_tenant ON person(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_person_household ON person(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_person_email ON person(tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_person_name ON person(tenant_id, last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_person_external_id ON person(tenant_id, external_id) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_person_search ON person USING gin(
  (first_name || ' ' || last_name || ' ' || COALESCE(email, '')) gin_trgm_ops
) WHERE deleted_at IS NULL;

ALTER TABLE person ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_person ON person
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- GROUPS
-- ============================================================================

CREATE TABLE "group" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- "Small Group", "Committee", "Ministry Team"

  -- Leaders
  leader_id UUID REFERENCES person(id) ON DELETE SET NULL,

  -- Settings
  is_public BOOLEAN DEFAULT true,
  max_members INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_group_tenant ON "group"(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_group_category ON "group"(tenant_id, category) WHERE deleted_at IS NULL;

ALTER TABLE "group" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_group ON "group"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE group_member (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

  role VARCHAR(50) DEFAULT 'member', -- leader, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(group_id, person_id)
);

CREATE INDEX idx_group_member_tenant ON group_member(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_group_member_group ON group_member(group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_group_member_person ON group_member(person_id) WHERE deleted_at IS NULL;

ALTER TABLE group_member ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_group_member ON group_member
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- EVENTS & RSVP
-- ============================================================================

CREATE TABLE event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Schedule
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,

  -- Location
  location_name VARCHAR(255),
  location_address VARCHAR(500),

  -- Settings
  is_public BOOLEAN DEFAULT true,
  allow_rsvp BOOLEAN DEFAULT true,
  rsvp_limit INT,

  -- External
  external_calendar_id VARCHAR(255), -- ICS import ID for idempotency

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_event_tenant ON event(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_event_start ON event(tenant_id, start_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_event_external_id ON event(tenant_id, external_calendar_id) WHERE deleted_at IS NULL;

ALTER TABLE event ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_event ON event
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE rsvp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

  response rsvp_response NOT NULL,
  headcount INT DEFAULT 1,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, person_id)
);

CREATE INDEX idx_rsvp_tenant ON rsvp(tenant_id);
CREATE INDEX idx_rsvp_event ON rsvp(event_id);
CREATE INDEX idx_rsvp_person ON rsvp(person_id);

ALTER TABLE rsvp ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_rsvp ON rsvp
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- ANNOUNCEMENTS & MESSAGING
-- ============================================================================

CREATE TABLE announcement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  title VARCHAR(60) NOT NULL, -- Hard limit for bulletin rendering
  body VARCHAR(300) NOT NULL, -- Hard limit for bulletin rendering

  priority announcement_priority DEFAULT 'Normal',
  category VARCHAR(100), -- "Missions", "Youth", "Worship"

  -- Visibility
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Auto-expire

  -- Approval workflow
  submitted_by UUID REFERENCES person(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES person(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_title_length CHECK (char_length(title) <= 60),
  CONSTRAINT chk_body_length CHECK (char_length(body) <= 300)
);

CREATE INDEX idx_announcement_tenant ON announcement(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcement_active ON announcement(tenant_id, is_active, priority DESC, starts_at DESC)
  WHERE deleted_at IS NULL AND expires_at IS NULL OR expires_at > NOW();
CREATE INDEX idx_announcement_expires ON announcement(expires_at) WHERE is_active = true AND deleted_at IS NULL;

ALTER TABLE announcement ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_announcement ON announcement
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- BULLETIN GENERATOR
-- ============================================================================

CREATE TABLE brand_pack (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL DEFAULT 'Default',

  -- Branding assets
  logo_url TEXT,
  primary_color VARCHAR(7), -- "#3B82F6"
  secondary_color VARCHAR(7),
  font_family VARCHAR(100) DEFAULT 'Inter',

  -- Contact info for bulletin
  church_name VARCHAR(255),
  church_address VARCHAR(500),
  church_phone VARCHAR(50),
  church_email VARCHAR(255),
  church_website VARCHAR(255),

  is_active BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_brand_pack_tenant ON brand_pack(tenant_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_brand_pack_active ON brand_pack(tenant_id) WHERE is_active = true AND deleted_at IS NULL;

ALTER TABLE brand_pack ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_brand_pack ON brand_pack
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE service_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  service_date DATE NOT NULL,
  type service_item_type NOT NULL,
  sequence INT NOT NULL, -- Order in service

  title VARCHAR(255),
  content TEXT, -- Lyrics, scripture text, sermon notes

  -- Songs only
  ccli_number VARCHAR(50),
  artist VARCHAR(255),

  -- Scripture
  scripture_ref VARCHAR(100), -- "John 3:16-17"

  -- Sermon
  speaker VARCHAR(255),

  -- External import
  planning_center_id VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_service_item_tenant ON service_item(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_item_date ON service_item(tenant_id, service_date DESC, sequence) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_item_pc_id ON service_item(tenant_id, planning_center_id) WHERE deleted_at IS NULL;

ALTER TABLE service_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_service_item ON service_item
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE bulletin_issue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  -- Issue identity
  issue_date DATE NOT NULL, -- Sunday date
  week_of_year INT GENERATED ALWAYS AS (EXTRACT(WEEK FROM issue_date)) STORED,

  status bulletin_status DEFAULT 'draft',

  -- Branding
  brand_pack_id UUID REFERENCES brand_pack(id) ON DELETE SET NULL,

  -- Output artifacts (populated after build)
  pdf_url TEXT, -- Blob storage URL
  pdf_large_print_url TEXT, -- 120% scaled version
  slides_json JSONB, -- Array of JPG URLs
  loop_mp4_url TEXT,
  email_html TEXT,
  propresenter_bundle_url TEXT,

  -- Lock tracking
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES person(id) ON DELETE SET NULL,

  -- Emergency reopen
  reopened_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES person(id) ON DELETE SET NULL,
  reopen_reason TEXT,

  -- Content hash (for immutability verification)
  content_hash VARCHAR(64), -- SHA-256 of template + data at lock time

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, issue_date)
);

CREATE INDEX idx_bulletin_tenant ON bulletin_issue(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bulletin_date ON bulletin_issue(tenant_id, issue_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_bulletin_status ON bulletin_issue(tenant_id, status) WHERE deleted_at IS NULL;

ALTER TABLE bulletin_issue ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_bulletin_issue ON bulletin_issue
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Link bulletin to announcements (top 3 + overflow)
CREATE TABLE bulletin_announcement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  bulletin_issue_id UUID NOT NULL REFERENCES bulletin_issue(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES announcement(id) ON DELETE CASCADE,

  display_order INT NOT NULL,
  is_featured BOOLEAN DEFAULT false, -- Top 3 large cards

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(bulletin_issue_id, announcement_id)
);

CREATE INDEX idx_bulletin_announcement_tenant ON bulletin_announcement(tenant_id);
CREATE INDEX idx_bulletin_announcement_issue ON bulletin_announcement(bulletin_issue_id, display_order);

ALTER TABLE bulletin_announcement ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_bulletin_announcement ON bulletin_announcement
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- GIVING
-- ============================================================================

CREATE TABLE fund (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT,

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- QuickBooks integration
  quickbooks_account_id VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_fund_tenant ON fund(tenant_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_fund_default ON fund(tenant_id) WHERE is_default = true AND deleted_at IS NULL;

ALTER TABLE fund ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_fund ON fund
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE contribution (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,
  fund_id UUID NOT NULL REFERENCES fund(id) ON DELETE RESTRICT,

  -- Amount
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',

  -- Payment
  method contribution_method NOT NULL,
  frequency contribution_frequency DEFAULT 'OneTime',

  -- Stripe IDs
  stripe_payment_intent_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, succeeded, failed, refunded
  succeeded_at TIMESTAMPTZ,

  -- Receipt
  receipt_sent_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contribution_tenant ON contribution(tenant_id);
CREATE INDEX idx_contribution_person ON contribution(person_id);
CREATE INDEX idx_contribution_fund ON contribution(fund_id);
CREATE INDEX idx_contribution_date ON contribution(tenant_id, succeeded_at DESC) WHERE status = 'succeeded';
CREATE INDEX idx_contribution_stripe_intent ON contribution(stripe_payment_intent_id);
CREATE INDEX idx_contribution_stripe_subscription ON contribution(stripe_subscription_id);

ALTER TABLE contribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_contribution ON contribution
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- ATTACHMENTS (Generic file storage)
-- ============================================================================

CREATE TABLE attachment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  -- Polymorphic relationship
  entity_type VARCHAR(50) NOT NULL, -- "announcement", "bulletin_issue", "person"
  entity_id UUID NOT NULL,

  -- File metadata
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size_bytes BIGINT,
  blob_url TEXT NOT NULL,

  -- Image-specific
  width INT,
  height INT,
  aspect_ratio DECIMAL(5, 2), -- 16:9 = 1.78

  uploaded_by UUID REFERENCES person(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_image_size CHECK (size_bytes <= 4 * 1024 * 1024) -- 4MB max
);

CREATE INDEX idx_attachment_tenant ON attachment(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachment_entity ON attachment(entity_type, entity_id) WHERE deleted_at IS NULL;

ALTER TABLE attachment ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_attachment ON attachment
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- ROLE ASSIGNMENTS
-- ============================================================================

CREATE TABLE role_assignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

  role role_name NOT NULL,

  granted_by UUID REFERENCES person(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, person_id, role)
);

CREATE INDEX idx_role_assignment_tenant ON role_assignment(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_role_assignment_person ON role_assignment(person_id) WHERE deleted_at IS NULL;

ALTER TABLE role_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_role_assignment ON role_assignment
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  user_id UUID REFERENCES person(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- "bulletin.lock", "announcement.approve"

  -- Entity reference
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Changes (JSON diff)
  changes JSONB, -- { "status": { "old": "built", "new": "locked" } }

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_action ON audit_log(tenant_id, action, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

-- No RLS on audit_log - admins only access via special query functions

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC AUDIT LOGGING
-- ============================================================================

-- Generic audit function
CREATE OR REPLACE FUNCTION log_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changes JSONB;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);

    -- Build changes object (only modified fields)
    SELECT jsonb_object_agg(key, jsonb_build_object('old', old_data->key, 'new', new_data->key))
    INTO changes
    FROM jsonb_each(new_data)
    WHERE new_data->key IS DISTINCT FROM old_data->key
      AND key NOT IN ('updated_at', 'created_at');

    IF changes IS NOT NULL THEN
      INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, changes)
      VALUES (
        NEW.tenant_id,
        TG_TABLE_NAME || '.' || TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        changes
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, changes)
    VALUES (
      NEW.tenant_id,
      TG_TABLE_NAME || '.' || TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, changes)
    VALUES (
      OLD.tenant_id,
      TG_TABLE_NAME || '.' || TG_OP,
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_bulletin_issue
AFTER INSERT OR UPDATE OR DELETE ON bulletin_issue
FOR EACH ROW EXECUTE FUNCTION log_audit_trigger();

CREATE TRIGGER audit_announcement
AFTER UPDATE OR DELETE ON announcement
FOR EACH ROW EXECUTE FUNCTION log_audit_trigger();

CREATE TRIGGER audit_role_assignment
AFTER INSERT OR UPDATE OR DELETE ON role_assignment
FOR EACH ROW EXECUTE FUNCTION log_audit_trigger();

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON tenant
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_household_updated_at BEFORE UPDATE ON household
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_person_updated_at BEFORE UPDATE ON person
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_group_updated_at BEFORE UPDATE ON "group"
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_event_updated_at BEFORE UPDATE ON event
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_announcement_updated_at BEFORE UPDATE ON announcement
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bulletin_issue_updated_at BEFORE UPDATE ON bulletin_issue
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contribution_updated_at BEFORE UPDATE ON contribution
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Set tenant context (call at start of each request)
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;

-- Get active announcements for bulletin (top 3 featured + rest)
CREATE OR REPLACE FUNCTION get_bulletin_announcements(p_tenant_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title VARCHAR(60),
  body VARCHAR(300),
  priority announcement_priority,
  is_featured BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      a.id,
      a.title,
      a.body,
      a.priority,
      ROW_NUMBER() OVER (ORDER BY
        CASE a.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Normal' THEN 3
        END,
        a.starts_at DESC
      ) as rn
    FROM announcement a
    WHERE a.tenant_id = p_tenant_id
      AND a.is_active = true
      AND a.deleted_at IS NULL
      AND (a.expires_at IS NULL OR a.expires_at > NOW())
    LIMIT p_limit
  )
  SELECT
    ranked.id,
    ranked.title,
    ranked.body,
    ranked.priority,
    ranked.rn <= 3 as is_featured
  FROM ranked;
END;
$$ LANGUAGE plpgsql;

-- Validate CCLI numbers before lock
CREATE OR REPLACE FUNCTION validate_ccli_for_lock(p_bulletin_issue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  missing_count INT;
BEGIN
  SELECT COUNT(*)
  INTO missing_count
  FROM service_item si
  JOIN bulletin_issue bi ON bi.issue_date = si.service_date
  WHERE bi.id = p_bulletin_issue_id
    AND si.type = 'Song'
    AND (si.ccli_number IS NULL OR si.ccli_number = '')
    AND si.deleted_at IS NULL;

  RETURN missing_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tenant IS 'Multi-tenant root table - each church is a tenant';
COMMENT ON TABLE bulletin_issue IS 'Weekly bulletin workflow: draft → approved → built → locked';
COMMENT ON TABLE service_item IS 'Order of worship for Sunday service';
COMMENT ON TABLE announcement IS 'Messages for bulletin and member feed (60/300 char limits)';
COMMENT ON COLUMN announcement.title IS 'Max 60 chars for bulletin layout';
COMMENT ON COLUMN announcement.body IS 'Max 300 chars; overflow goes to QR code';
COMMENT ON FUNCTION get_bulletin_announcements IS 'Returns top 3 as featured, rest as regular';
COMMENT ON FUNCTION validate_ccli_for_lock IS 'Ensures all songs have CCLI# before bulletin lock';
