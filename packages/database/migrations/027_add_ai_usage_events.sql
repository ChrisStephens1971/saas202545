-- Migration: 027_add_ai_usage_events
-- Description: Create ai_usage_events table for tracking AI API usage per tenant
-- Created: 2025-12-01

-- AI Usage Events table
-- Records every AI API call for billing, analytics, and auditing
CREATE TABLE IF NOT EXISTS ai_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    feature TEXT NOT NULL,           -- e.g., 'sermon.suggestBigIdea', 'sermon.suggestOutline', 'bulletin.generateText'
    model TEXT NOT NULL,             -- e.g., 'gpt-4o-mini', 'gpt-4o'
    tokens_in INTEGER NOT NULL,      -- prompt tokens
    tokens_out INTEGER NOT NULL,     -- completion tokens
    meta JSONB NULL,                 -- optional extra context (sermon_id, bulletin_id, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on tenant_id for per-tenant queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_tenant_id ON ai_usage_events(tenant_id);

-- Index on created_at for time-range queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created_at ON ai_usage_events(created_at);

-- Composite index for tenant + time range queries (common for billing)
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_tenant_created ON ai_usage_events(tenant_id, created_at);

-- Index on feature for analytics by feature type
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_feature ON ai_usage_events(feature);

-- Enable RLS
ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

-- RLS policy: tenants can only see their own usage
CREATE POLICY ai_usage_events_tenant_isolation ON ai_usage_events
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

COMMENT ON TABLE ai_usage_events IS 'Tracks AI API usage for billing and analytics';
COMMENT ON COLUMN ai_usage_events.feature IS 'Feature identifier like sermon.suggestBigIdea, bulletin.generateText';
COMMENT ON COLUMN ai_usage_events.tokens_in IS 'Number of prompt tokens sent to the AI model';
COMMENT ON COLUMN ai_usage_events.tokens_out IS 'Number of completion tokens received from the AI model';
COMMENT ON COLUMN ai_usage_events.meta IS 'Optional JSON metadata (sermon_id, bulletin_id, etc.)';
