
-- Add promotion fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS promotion_banner_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS promotion_tagline TEXT;

-- Index for performance when fetching promoted events
CREATE INDEX IF NOT EXISTS idx_events_is_promoted ON events (is_promoted) WHERE is_promoted = TRUE;
