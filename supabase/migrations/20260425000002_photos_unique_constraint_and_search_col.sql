-- Idempotent: dedup any remaining rows, add unique constraint, add search column
-- Safe to re-run; all steps use IF NOT EXISTS / conflict guards.

-- Step 1: Delete duplicate photos rows (keep oldest per google_drive_file_id)
DELETE FROM photos
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY google_drive_file_id ORDER BY created_at ASC
      ) AS rn
    FROM photos
    WHERE google_drive_file_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Add UNIQUE constraint (prevents future duplicates from sync upserts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photos_google_drive_file_id_key'
      AND conrelid = 'public.photos'::regclass
  ) THEN
    ALTER TABLE public.photos
      ADD CONSTRAINT photos_google_drive_file_id_key UNIQUE (google_drive_file_id);
  END IF;
END $$;

-- Step 3: Add search_date_text generated column (for month/year text search)
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS search_date_text TEXT
  GENERATED ALWAYS AS (to_char(created_at AT TIME ZONE 'UTC', 'FMMonth YYYY')) STORED;

CREATE INDEX IF NOT EXISTS photos_search_date_text_idx ON photos (search_date_text);
