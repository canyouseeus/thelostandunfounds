-- Add cover_image_url column to photo_libraries table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'photo_libraries'
        AND column_name = 'cover_image_url'
    ) THEN
        ALTER TABLE photo_libraries
        ADD COLUMN cover_image_url TEXT;
    END IF;
END $$;
