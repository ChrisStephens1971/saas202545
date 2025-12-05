-- Migration: Add ai_settings table for global AI configuration
-- This table stores encrypted API keys and AI feature toggles

-- Create ai_settings table (global, single-row configuration)
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'openai',
  api_key_encrypted TEXT,  -- Encrypted with AES-256-GCM, null means no key configured
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE ai_settings IS 'Global AI configuration (single row). Stores encrypted API keys.';
COMMENT ON COLUMN ai_settings.provider IS 'AI provider name (currently only openai supported)';
COMMENT ON COLUMN ai_settings.api_key_encrypted IS 'AES-256-GCM encrypted API key. Decrypted server-side using APP_ENCRYPTION_KEY.';
COMMENT ON COLUMN ai_settings.enabled IS 'Whether AI features are enabled (still subject to environment gating)';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_settings_updated_at();

-- Insert default row (singleton pattern)
INSERT INTO ai_settings (provider, enabled)
VALUES ('openai', false)
ON CONFLICT DO NOTHING;
