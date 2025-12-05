-- Migration: Add Sermon Builder fields to sermon table
-- Adds outline (JSONB), path_stage, and status fields for Sermon Builder V1

-- Add new columns to sermon table
ALTER TABLE sermon ADD COLUMN IF NOT EXISTS outline JSONB;
ALTER TABLE sermon ADD COLUMN IF NOT EXISTS path_stage VARCHAR(20) NOT NULL DEFAULT 'text_setup';
ALTER TABLE sermon ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';

-- Add check constraints for valid enum values
ALTER TABLE sermon ADD CONSTRAINT sermon_path_stage_check
  CHECK (path_stage IN ('text_setup', 'big_idea', 'outline', 'finalize'));

ALTER TABLE sermon ADD CONSTRAINT sermon_status_check
  CHECK (status IN ('idea', 'draft', 'ready', 'preached'));

-- Create index for status filtering (common query pattern)
CREATE INDEX IF NOT EXISTS idx_sermon_status ON sermon(tenant_id, status) WHERE deleted_at IS NULL;

-- Create index for path_stage (useful for tracking pastor progress)
CREATE INDEX IF NOT EXISTS idx_sermon_path_stage ON sermon(tenant_id, path_stage) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN sermon.outline IS 'JSON structure containing sermon outline: passage, audienceFocus, bigIdea, mainPoints[], application, callToAction, extraNotes';
COMMENT ON COLUMN sermon.path_stage IS 'Current step in Sermon Builder path: text_setup, big_idea, outline, finalize';
COMMENT ON COLUMN sermon.status IS 'Sermon preparation status: idea, draft, ready, preached';
