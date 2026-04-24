-- Re-run photo deduplication (idempotent) to catch any rows that slipped through
-- due to the timestamp collision between 20260424000001_deduplicate_photos.sql
-- and 20260424000001_photos_search_date_text.sql.  Safe to run repeatedly.

-- Step 1: Re-point photo_tags from duplicate rows → the kept row (latest created_at)
WITH dup_map AS (
  SELECT
    id AS old_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY google_drive_file_id ORDER BY created_at DESC
    ) AS kept_id
  FROM photos
  WHERE google_drive_file_id IN (
    SELECT google_drive_file_id
    FROM photos
    GROUP BY google_drive_file_id
    HAVING COUNT(*) > 1
  )
)
UPDATE photo_tags pt
SET photo_id = dm.kept_id
FROM dup_map dm
WHERE pt.photo_id = dm.old_id
  AND dm.old_id <> dm.kept_id
ON CONFLICT (photo_id, tag_id) DO NOTHING;

-- Step 2: Re-point photo_entitlements from duplicate rows → the kept row
WITH dup_map AS (
  SELECT
    id AS old_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY google_drive_file_id ORDER BY created_at DESC
    ) AS kept_id
  FROM photos
  WHERE google_drive_file_id IN (
    SELECT google_drive_file_id
    FROM photos
    GROUP BY google_drive_file_id
    HAVING COUNT(*) > 1
  )
)
UPDATE photo_entitlements pe
SET photo_id = dm.kept_id
FROM dup_map dm
WHERE pe.photo_id = dm.old_id
  AND dm.old_id <> dm.kept_id;

-- Step 3: Delete orphaned duplicate rows (keep only the latest per drive file id)
DELETE FROM photos
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY google_drive_file_id ORDER BY created_at DESC
      ) AS rn
    FROM photos
    WHERE google_drive_file_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 4: Ensure the unique constraint exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photos_google_drive_file_id_key'
      AND conrelid = 'photos'::regclass
  ) THEN
    ALTER TABLE photos
      ADD CONSTRAINT photos_google_drive_file_id_key UNIQUE (google_drive_file_id);
  END IF;
END $$;
