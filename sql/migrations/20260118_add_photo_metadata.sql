-- Add metadata column to photos table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'metadata') THEN
        ALTER TABLE photos ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN photos.metadata IS 'Stores EXIF data like camera model, iso, focal length, and corrected date.';
    END IF;
END $$;
