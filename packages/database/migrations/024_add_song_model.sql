-- ============================================================================
-- Migration: Add Song/Hymn Model for Order of Service Planning
-- ============================================================================
-- This migration adds a first-class Song model to store hymn/song information
-- for reuse across services, with optional linkage from ServiceItem.
-- ============================================================================

-- ============================================================================
-- SONG TABLE
-- ============================================================================

CREATE TABLE song (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

  -- Core identification
  title VARCHAR(255) NOT NULL,
  alternate_title VARCHAR(255),        -- e.g., "Joyful, Joyful" vs "Hymn to Joy"
  first_line VARCHAR(500),             -- First line of lyrics for identification

  -- Hymnal information
  tune_name VARCHAR(100),              -- e.g., "HYFRYDOL", "OLD HUNDREDTH"
  hymn_number VARCHAR(20),             -- String to support "123a", "S-45", etc.
  hymnal_code VARCHAR(20),             -- e.g., "UMH", "CH", "PH", "ELW"

  -- Attribution
  author VARCHAR(255),                 -- Lyricist/writer
  composer VARCHAR(255),               -- Music composer

  -- Copyright & Licensing
  is_public_domain BOOLEAN DEFAULT false,
  ccli_number VARCHAR(50),             -- CCLI Song ID
  copyright_notice TEXT,               -- Full copyright text

  -- Performance defaults
  default_key VARCHAR(10),             -- e.g., "C", "D", "Eb", "F#m"
  default_tempo INT,                   -- BPM

  -- Content
  lyrics TEXT,                         -- Full lyrics text

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX idx_song_tenant ON song(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_song_title ON song(tenant_id, title) WHERE deleted_at IS NULL;
CREATE INDEX idx_song_ccli ON song(tenant_id, ccli_number) WHERE deleted_at IS NULL AND ccli_number IS NOT NULL;
CREATE INDEX idx_song_hymnal ON song(tenant_id, hymnal_code, hymn_number) WHERE deleted_at IS NULL;

-- Full-text search index for song search
CREATE INDEX idx_song_search ON song USING gin(
  (COALESCE(title, '') || ' ' || COALESCE(alternate_title, '') || ' ' || COALESCE(first_line, '') || ' ' || COALESCE(tune_name, '')) gin_trgm_ops
) WHERE deleted_at IS NULL;

-- Unique constraint: prevent duplicate songs per tenant (same title + hymnal + number)
-- This allows same title in different hymnals
CREATE UNIQUE INDEX idx_song_unique_per_tenant ON song(tenant_id, title, COALESCE(hymnal_code, ''), COALESCE(hymn_number, ''))
  WHERE deleted_at IS NULL;

-- Enable Row-Level Security
ALTER TABLE song ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation
CREATE POLICY tenant_isolation_song ON song
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- ADD SONG RELATION TO SERVICE_ITEM
-- ============================================================================

-- Add optional foreign key to song table
ALTER TABLE service_item
  ADD COLUMN song_id UUID REFERENCES song(id) ON DELETE SET NULL;

-- Index for efficient joins
CREATE INDEX idx_service_item_song ON service_item(song_id) WHERE song_id IS NOT NULL AND deleted_at IS NULL;

-- ============================================================================
-- UPDATED_AT TRIGGER FOR SONG
-- ============================================================================

CREATE TRIGGER update_song_updated_at BEFORE UPDATE ON song
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- AUDIT TRIGGER FOR SONG (Optional - follow same pattern as other tables)
-- ============================================================================

CREATE TRIGGER audit_song
AFTER INSERT OR UPDATE OR DELETE ON song
FOR EACH ROW EXECUTE FUNCTION log_audit_trigger();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE song IS 'Song/Hymn library for reuse across services';
COMMENT ON COLUMN song.title IS 'Primary song title';
COMMENT ON COLUMN song.alternate_title IS 'Alternative title or subtitle';
COMMENT ON COLUMN song.first_line IS 'First line of lyrics for identification';
COMMENT ON COLUMN song.tune_name IS 'Musical tune name (e.g., HYFRYDOL)';
COMMENT ON COLUMN song.hymn_number IS 'Number in hymnal (string to support variants like 123a)';
COMMENT ON COLUMN song.hymnal_code IS 'Hymnal abbreviation (UMH, CH, PH, ELW, etc.)';
COMMENT ON COLUMN song.ccli_number IS 'CCLI Song ID for licensing';
COMMENT ON COLUMN song.is_public_domain IS 'True if song is in public domain';
COMMENT ON COLUMN song.default_key IS 'Default musical key for performance';
COMMENT ON COLUMN song.default_tempo IS 'Default tempo in BPM';
COMMENT ON COLUMN service_item.song_id IS 'Optional link to song library; allows reuse of song metadata';
