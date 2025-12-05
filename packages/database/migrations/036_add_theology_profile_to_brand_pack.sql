-- Migration: 036_add_theology_profile_to_brand_pack.sql
-- Description: Add theology profile fields to brand_pack for AI sermon helper guardrails
-- Date: 2025-12-03

-- Add theology profile columns to brand_pack
ALTER TABLE brand_pack
ADD COLUMN IF NOT EXISTS theology_tradition VARCHAR(100) DEFAULT 'Non-denominational evangelical',
ADD COLUMN IF NOT EXISTS theology_bible_translation VARCHAR(20) DEFAULT 'ESV',
ADD COLUMN IF NOT EXISTS theology_sermon_style VARCHAR(50) DEFAULT 'expository',
ADD COLUMN IF NOT EXISTS theology_sensitivity VARCHAR(20) DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS theology_restricted_topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS theology_preferred_tone VARCHAR(100) DEFAULT 'warm and pastoral';

-- Add comments for documentation
COMMENT ON COLUMN brand_pack.theology_tradition IS 'Church theological tradition (e.g., Reformed Baptist, Anglican, Non-denominational evangelical)';
COMMENT ON COLUMN brand_pack.theology_bible_translation IS 'Preferred Bible translation for AI suggestions (e.g., ESV, NIV, CSB, KJV)';
COMMENT ON COLUMN brand_pack.theology_sermon_style IS 'Preferred sermon style (expository, topical, textual)';
COMMENT ON COLUMN brand_pack.theology_sensitivity IS 'Sensitivity level for AI content (conservative, moderate, broad)';
COMMENT ON COLUMN brand_pack.theology_restricted_topics IS 'Topics AI should avoid unless explicitly requested';
COMMENT ON COLUMN brand_pack.theology_preferred_tone IS 'Preferred tone for AI suggestions (e.g., warm and pastoral, teaching-focused)';

-- Create index for common query patterns (fetching theology profile for AI calls)
CREATE INDEX IF NOT EXISTS idx_brand_pack_active_tenant
ON brand_pack(tenant_id)
WHERE is_active = true AND deleted_at IS NULL;
