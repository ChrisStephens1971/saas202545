-- Migration 038: Add style_profile column to sermon_plans and sermon_templates
-- Phase 6: Sermon Style Profiles
--
-- Adds optional style_profile column to categorize sermon structure:
--   - 'story_first_3_point': Classic 3-point, story-first sermons
--   - 'expository_verse_by_verse': Text-first, walk through the passage
--   - 'topical_teaching': Teaching-oriented, topical / doctrinal
--
-- Both columns are nullable to maintain backward compatibility with existing data.

-- Add style_profile to sermon_plan (note: table is singular, not plural)
ALTER TABLE sermon_plan
ADD COLUMN IF NOT EXISTS style_profile TEXT
CHECK (style_profile IS NULL OR style_profile IN (
  'story_first_3_point',
  'expository_verse_by_verse',
  'topical_teaching'
));

COMMENT ON COLUMN sermon_plan.style_profile IS
'Optional sermon style profile for categorization. Values: story_first_3_point, expository_verse_by_verse, topical_teaching';

-- Add style_profile to sermon_template (note: table is singular, not plural)
ALTER TABLE sermon_template
ADD COLUMN IF NOT EXISTS style_profile TEXT
CHECK (style_profile IS NULL OR style_profile IN (
  'story_first_3_point',
  'expository_verse_by_verse',
  'topical_teaching'
));

COMMENT ON COLUMN sermon_template.style_profile IS
'Optional sermon style profile for categorization. Values: story_first_3_point, expository_verse_by_verse, topical_teaching';

-- Create indexes for filtering by style_profile (optional, but useful for queries)
CREATE INDEX IF NOT EXISTS idx_sermon_plan_style_profile
ON sermon_plan(style_profile)
WHERE style_profile IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sermon_template_style_profile
ON sermon_template(style_profile)
WHERE style_profile IS NOT NULL;
