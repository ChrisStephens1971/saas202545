-- ============================================================================
-- Sprint 3: Forms Builder & Attendance Tracking
-- ============================================================================

-- ============================================================================
-- FORMS BUILDER
-- ============================================================================

CREATE TYPE form_field_type AS ENUM (
  'text',
  'textarea',
  'email',
  'phone',
  'number',
  'date',
  'select',
  'multiselect',
  'checkbox',
  'radio'
);

CREATE TYPE form_status AS ENUM ('draft', 'active', 'closed', 'archived');

CREATE TABLE form (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  status form_status DEFAULT 'draft',

  -- Settings
  allow_multiple_submissions BOOLEAN DEFAULT false,
  require_login BOOLEAN DEFAULT false,
  close_at TIMESTAMPTZ, -- Auto-close form

  -- Notifications
  notification_email VARCHAR(255), -- Where to send submission alerts

  created_by UUID REFERENCES person(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_form_tenant ON form(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_form_status ON form(tenant_id, status) WHERE deleted_at IS NULL;

ALTER TABLE form ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_form ON form
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE form_field (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES form(id) ON DELETE CASCADE,

  label VARCHAR(255) NOT NULL,
  field_type form_field_type NOT NULL,

  -- Validation
  is_required BOOLEAN DEFAULT false,
  placeholder VARCHAR(255),
  help_text TEXT,

  -- For select/radio/checkbox
  options JSONB, -- ["Option 1", "Option 2"]

  -- Order
  sequence INT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_form_field_form ON form_field(form_id, sequence) WHERE deleted_at IS NULL;

ALTER TABLE form_field ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_form_field ON form_field
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE form_submission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES form(id) ON DELETE CASCADE,

  person_id UUID REFERENCES person(id) ON DELETE SET NULL, -- NULL if anonymous

  -- Responses stored as JSON: { "field_id": "value" }
  responses JSONB NOT NULL,

  -- Submission metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_form_submission_tenant ON form_submission(tenant_id);
CREATE INDEX idx_form_submission_form ON form_submission(form_id, created_at DESC);
CREATE INDEX idx_form_submission_person ON form_submission(person_id);

ALTER TABLE form_submission ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_form_submission ON form_submission
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- ATTENDANCE TRACKING
-- ============================================================================

CREATE TYPE attendance_category AS ENUM (
  'SundayService',
  'SmallGroup',
  'Event',
  'Class',
  'Meeting',
  'Other'
);

CREATE TABLE attendance_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  category attendance_category NOT NULL,

  -- Link to specific event/group (optional)
  event_id UUID REFERENCES event(id) ON DELETE CASCADE,
  group_id UUID REFERENCES "group"(id) ON DELETE CASCADE,

  session_date DATE NOT NULL,
  session_time TIME,

  -- Quick stats (cached)
  total_count INT DEFAULT 0,
  member_count INT DEFAULT 0,
  visitor_count INT DEFAULT 0,

  created_by UUID REFERENCES person(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_attendance_session_tenant ON attendance_session(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_session_date ON attendance_session(tenant_id, session_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_session_category ON attendance_session(tenant_id, category, session_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_session_event ON attendance_session(event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_session_group ON attendance_session(group_id) WHERE deleted_at IS NULL;

ALTER TABLE attendance_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_attendance_session ON attendance_session
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE attendance_record (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES attendance_session(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

  -- Additional guests brought
  guest_count INT DEFAULT 0,

  notes TEXT,

  checked_in_by UUID REFERENCES person(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, person_id)
);

CREATE INDEX idx_attendance_record_tenant ON attendance_record(tenant_id);
CREATE INDEX idx_attendance_record_session ON attendance_record(session_id);
CREATE INDEX idx_attendance_record_person ON attendance_record(person_id, checked_in_at DESC);

ALTER TABLE attendance_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_attendance_record ON attendance_record
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_form_updated_at BEFORE UPDATE ON form
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_form_field_updated_at BEFORE UPDATE ON form_field
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_attendance_session_updated_at BEFORE UPDATE ON attendance_session
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TRIGGER TO UPDATE ATTENDANCE COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_attendance_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE attendance_session
    SET
      total_count = total_count + 1 + COALESCE(NEW.guest_count, 0),
      member_count = member_count + (
        SELECT CASE WHEN p.membership_status = 'member' THEN 1 ELSE 0 END
        FROM person p
        WHERE p.id = NEW.person_id
      ),
      visitor_count = visitor_count + (
        SELECT CASE WHEN p.membership_status != 'member' THEN 1 ELSE 0 END
        FROM person p
        WHERE p.id = NEW.person_id
      )
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE attendance_session
    SET
      total_count = total_count - 1 - COALESCE(OLD.guest_count, 0),
      member_count = member_count - (
        SELECT CASE WHEN p.membership_status = 'member' THEN 1 ELSE 0 END
        FROM person p
        WHERE p.id = OLD.person_id
      ),
      visitor_count = visitor_count - (
        SELECT CASE WHEN p.membership_status != 'member' THEN 1 ELSE 0 END
        FROM person p
        WHERE p.id = OLD.person_id
      )
    WHERE id = OLD.session_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_counts_trigger
AFTER INSERT OR DELETE ON attendance_record
FOR EACH ROW EXECUTE FUNCTION update_attendance_counts();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE form IS 'Custom forms builder for surveys, registrations, etc.';
COMMENT ON TABLE form_field IS 'Individual fields in a form with validation rules';
COMMENT ON TABLE form_submission IS 'User responses to forms';
COMMENT ON TABLE attendance_session IS 'Attendance tracking sessions (services, events, groups)';
COMMENT ON TABLE attendance_record IS 'Individual check-ins for attendance sessions';
COMMENT ON FUNCTION update_attendance_counts IS 'Auto-updates total/member/visitor counts on attendance_session';
