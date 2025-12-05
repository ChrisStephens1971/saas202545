-- Migration: Add use_canvas_layout flag to bulletin_issue
-- Purpose: Allow users to explicitly choose between template-based and canvas-based layouts
-- Date: 2025-11-28

-- Add use_canvas_layout column to bulletin_issue table
-- This column determines whether the bulletin should use canvas layout or template layout for rendering
-- Default is false to preserve existing behavior for all current bulletins
ALTER TABLE bulletin_issue
ADD COLUMN use_canvas_layout BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN bulletin_issue.use_canvas_layout IS
'Flag indicating whether this bulletin uses canvas layout (true) or template layout (false). '
'Canvas layout uses the drag-and-drop editor and stores layout in canvas_layout_json. '
'Template layout uses the legacy design_options + service items system. '
'Default is false to preserve existing behavior.';

-- Create index for querying bulletins by layout type
CREATE INDEX idx_bulletin_use_canvas_layout
ON bulletin_issue(tenant_id, use_canvas_layout)
WHERE deleted_at IS NULL;

-- Note: No data migration needed - all existing bulletins default to template layout (false)
