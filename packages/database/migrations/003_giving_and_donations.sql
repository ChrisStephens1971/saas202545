-- ============================================================================
-- Sprint 4: Giving & Donations
-- ============================================================================

-- ============================================================================
-- GIVING CAMPAIGNS
-- ============================================================================

CREATE TABLE donation_campaign (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Financial
  goal_amount DECIMAL(10, 2),

  -- Dates
  start_date DATE,
  end_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES person(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_donation_campaign_tenant ON donation_campaign(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_donation_campaign_active ON donation_campaign(tenant_id, is_active) WHERE deleted_at IS NULL;

ALTER TABLE donation_campaign ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_donation_campaign ON donation_campaign
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- DONATIONS
-- ============================================================================

CREATE TYPE donation_method AS ENUM (
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'online',
  'other'
);

CREATE TYPE donation_frequency AS ENUM (
  'one_time',
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
);

CREATE TYPE donation_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded',
  'cancelled'
);

CREATE TABLE donation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  -- Who gave
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,
  donor_name VARCHAR(255), -- For anonymous or non-person donors
  donor_email VARCHAR(255),

  -- Amount
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Payment details
  donation_method donation_method NOT NULL,
  donation_frequency donation_frequency DEFAULT 'one_time',
  status donation_status DEFAULT 'completed',

  -- Campaign/Fund
  campaign_id UUID REFERENCES donation_campaign(id) ON DELETE SET NULL,
  fund_name VARCHAR(255), -- e.g., "General Fund", "Building Fund"

  -- Dates
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Payment metadata
  transaction_id VARCHAR(255), -- External payment processor ID
  check_number VARCHAR(50),
  notes TEXT,

  -- Tax receipt
  receipt_sent BOOLEAN DEFAULT false,
  receipt_sent_at TIMESTAMPTZ,

  -- Recurring donation reference
  recurring_donation_id UUID REFERENCES donation(id) ON DELETE SET NULL,
  is_recurring_parent BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_donation_tenant ON donation(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_donation_person ON donation(person_id, donation_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_donation_campaign ON donation(campaign_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_donation_date ON donation(tenant_id, donation_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_donation_status ON donation(tenant_id, status) WHERE deleted_at IS NULL;

ALTER TABLE donation ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_donation ON donation
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_donation_campaign_updated_at BEFORE UPDATE ON donation_campaign
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_donation_updated_at BEFORE UPDATE ON donation
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCTION TO GET DONATION STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_donation_stats(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_amount DECIMAL,
  donation_count BIGINT,
  unique_donors BIGINT,
  avg_donation DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*) as donation_count,
    COUNT(DISTINCT person_id) as unique_donors,
    COALESCE(AVG(amount), 0) as avg_donation
  FROM donation
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND status = 'completed'
    AND donation_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE donation_campaign IS 'Fundraising campaigns and special funds';
COMMENT ON TABLE donation IS 'Individual donations and giving records';
COMMENT ON FUNCTION get_donation_stats IS 'Get donation statistics for a date range';
