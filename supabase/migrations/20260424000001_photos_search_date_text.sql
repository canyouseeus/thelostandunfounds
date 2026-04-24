-- Add generated column for month/year text search (e.g. "March 2025")
-- Enables ILIKE searches like "March" or "2025" against photo capture dates
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS search_date_text TEXT
  GENERATED ALWAYS AS (to_char(created_at AT TIME ZONE 'UTC', 'FMMonth YYYY')) STORED;

CREATE INDEX IF NOT EXISTS photos_search_date_text_idx ON photos (search_date_text);
