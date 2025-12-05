-- Migration 023: Add publish and public fields to bulletin_issue
-- Adds publish workflow and optional public sharing capability

-- Add is_published flag (separate from locked/draft status)
ALTER TABLE bulletin_issue
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Add is_public flag (only meaningful when is_published = true)
ALTER TABLE bulletin_issue
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Add public_token for anonymous share links (UUID, only set when is_public = true)
ALTER TABLE bulletin_issue
ADD COLUMN IF NOT EXISTS public_token UUID;

-- Add published_at timestamp
ALTER TABLE bulletin_issue
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Create unique index on public_token (sparse - only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bulletin_issue_public_token
ON bulletin_issue (public_token)
WHERE public_token IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN bulletin_issue.is_published IS 'Whether bulletin is published (separate from locked state)';
COMMENT ON COLUMN bulletin_issue.is_public IS 'Whether bulletin is accessible via public share link without auth';
COMMENT ON COLUMN bulletin_issue.public_token IS 'UUID token for anonymous public access via /b/[token]';
COMMENT ON COLUMN bulletin_issue.published_at IS 'Timestamp when bulletin was first published';
