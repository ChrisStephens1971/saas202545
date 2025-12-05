-- ============================================================================
-- Migration: Add Canvas Layout to Bulletin Issue
-- Date: 2025-11-28
-- Description: Add canvas_layout_json column to support free-positioned
--              block-based bulletin editor
-- ============================================================================

-- Add canvas_layout_json column to bulletin_issue table
ALTER TABLE bulletin_issue
ADD COLUMN canvas_layout_json JSONB DEFAULT NULL;

-- Add index for bulletins with canvas layouts (for filtering/analytics)
CREATE INDEX idx_bulletin_canvas_enabled
ON bulletin_issue(tenant_id, id)
WHERE canvas_layout_json IS NOT NULL AND deleted_at IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN bulletin_issue.canvas_layout_json IS
'Optional canvas-based layout with free-positioned blocks. Structure: {pages: [{id, pageNumber, blocks: [{id, type, x, y, width, height, rotation, zIndex, data}]}]}';
