-- Migration: 035_add_layout_engine_to_bulletin_issue
-- Description: Add layoutEngine enum and generatorPayload JSONB to bulletin_issue
-- This supports the new Bulletin Generator as the primary workflow, with Canvas demoted to special-use

-- Create the layout engine enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'layout_engine_type') THEN
        CREATE TYPE layout_engine_type AS ENUM ('generator', 'canvas', 'legacy');
    END IF;
END$$;

-- Add layout_engine column with default 'generator' for new bulletins
ALTER TABLE bulletin_issue
ADD COLUMN IF NOT EXISTS layout_engine layout_engine_type DEFAULT 'generator';

-- Add generator_payload JSONB column for storing the generator view model
ALTER TABLE bulletin_issue
ADD COLUMN IF NOT EXISTS generator_payload JSONB NULL;

-- Migrate existing bulletins based on their current state:
-- - Bulletins with use_canvas_layout = true -> 'canvas'
-- - Bulletins with use_canvas_layout = false/null but have canvas_layout_json -> 'legacy'
-- - All others (empty/draft) -> keep as 'generator' (the new default)
UPDATE bulletin_issue
SET layout_engine = CASE
    WHEN use_canvas_layout = true THEN 'canvas'::layout_engine_type
    WHEN canvas_layout_json IS NOT NULL THEN 'legacy'::layout_engine_type
    ELSE 'generator'::layout_engine_type
END
WHERE layout_engine IS NULL OR layout_engine = 'generator';

-- Add index for efficient filtering by layout engine
CREATE INDEX IF NOT EXISTS idx_bulletin_issue_layout_engine
ON bulletin_issue(tenant_id, layout_engine)
WHERE deleted_at IS NULL;

-- Add comment explaining the field
COMMENT ON COLUMN bulletin_issue.layout_engine IS
'The layout system used for this bulletin: generator (data-driven, recommended), canvas (drag-drop, special use), legacy (old templates)';

COMMENT ON COLUMN bulletin_issue.generator_payload IS
'JSON view model for the Bulletin Generator layout engine. Contains all content and layout data for the 4-page classic template.';
