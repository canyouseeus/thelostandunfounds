-- Deduplicate photos table and enforce uniqueness on google_drive_file_id
--
-- Root cause: the photos table was created without a UNIQUE constraint on
-- google_drive_file_id, so supabase upsert(onConflict:'google_drive_file_id')
-- was silently inserting new rows instead of updating existing ones.

-- Step 1: Re-point photo_tags from duplicate rows → the row we're keeping
-- We keep the row with the latest created_at per google_drive_file_id.
-- ON CONFLICT DO NOTHING handles cases where the kept row already has the tag.
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

-- Step 2: Re-point photo_entitlements from duplicate rows → the row we're keeping
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

-- Step 3: Delete the now-orphaned duplicate rows (all but the latest per file id)
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

-- Step 4: Add the unique constraint to prevent future duplicates
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
