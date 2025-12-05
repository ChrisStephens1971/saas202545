-- Migration 022: Add bulletin settings to brand_pack
-- Adds organization-level defaults for bulletin creation and canvas editor behavior

-- Add bulletin default layout mode (template vs canvas)
ALTER TABLE brand_pack
ADD COLUMN IF NOT EXISTS bulletin_default_layout_mode VARCHAR(20) DEFAULT 'template' CHECK (bulletin_default_layout_mode IN ('template', 'canvas'));

-- Add AI assist enabled flag
ALTER TABLE brand_pack
ADD COLUMN IF NOT EXISTS bulletin_ai_enabled BOOLEAN DEFAULT false;

-- Add default canvas grid size (in pixels)
ALTER TABLE brand_pack
ADD COLUMN IF NOT EXISTS bulletin_default_canvas_grid_size INTEGER DEFAULT 16 CHECK (bulletin_default_canvas_grid_size > 0);

-- Add default show grid preference
ALTER TABLE brand_pack
ADD COLUMN IF NOT EXISTS bulletin_default_canvas_show_grid BOOLEAN DEFAULT true;

-- Add default page count for new canvas bulletins (1-4 pages)
ALTER TABLE brand_pack
ADD COLUMN IF NOT EXISTS bulletin_default_pages INTEGER DEFAULT 4 CHECK (bulletin_default_pages BETWEEN 1 AND 4);

-- Add giving URL for QR code presets (if not using existing church_website)
ALTER TABLE brand_pack
ADD COLUMN IF NOT EXISTS giving_url TEXT;

-- Add comments for clarity
COMMENT ON COLUMN brand_pack.bulletin_default_layout_mode IS 'Default layout mode for new bulletins: template or canvas';
COMMENT ON COLUMN brand_pack.bulletin_ai_enabled IS 'Enable AI Assist for bulletin text generation in this org';
COMMENT ON COLUMN brand_pack.bulletin_default_canvas_grid_size IS 'Default grid size in pixels for canvas editor (e.g., 8, 16, 24)';
COMMENT ON COLUMN brand_pack.bulletin_default_canvas_show_grid IS 'Show grid by default in canvas editor';
COMMENT ON COLUMN brand_pack.bulletin_default_pages IS 'Default number of pages for new canvas bulletins (1-4)';
COMMENT ON COLUMN brand_pack.giving_url IS 'URL for online giving, used in QR code presets';
