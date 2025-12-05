-- ============================================================================
-- Migration: Add design_options JSONB column to bulletin_issue
-- Purpose: Store per-bulletin customization options (layout, colors, sections)
-- ============================================================================

-- Add design_options column to store bulletin customization
ALTER TABLE bulletin_issue
ADD COLUMN IF NOT EXISTS design_options JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN bulletin_issue.design_options IS 'JSON object containing layout style, colors, fonts, and section toggles for bulletin customization';

-- Example structure:
-- {
--   "layoutStyle": "simple" | "photoHeader" | "sidebar",
--   "primaryColor": "#3B82F6",
--   "accentColor": "#1E40AF",
--   "fontFamilyHeading": "system" | "serif" | "sans",
--   "fontFamilyBody": "system" | "serif" | "sans",
--   "showBorderLines": true,
--   "sections": {
--     "showWelcomeMessage": true,
--     "welcomeText": "Welcome to our service!",
--     "showQRBlock": true,
--     "qrUrl": "https://church.example.com/give",
--     "showSocialBar": true,
--     "showNotesPage": false,
--     "showPrayerRequestCard": false,
--     "showConnectCard": false,
--     "showTestimonyBox": false,
--     "testimonyText": null
--   }
-- }
