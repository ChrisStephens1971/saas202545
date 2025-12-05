-- Migration: Add 'deleted' status to bulletin_status enum
-- This allows soft-delete functionality for bulletins

-- Add 'deleted' to the bulletin_status enum
ALTER TYPE bulletin_status ADD VALUE IF NOT EXISTS 'deleted';

-- Note: The IF NOT EXISTS clause is available in PostgreSQL 9.1+
-- If you're on an older version, you'll need to check manually first.
