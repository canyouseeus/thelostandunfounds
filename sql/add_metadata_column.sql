ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN photos.metadata IS 'Stores EXIF data like camera model, iso, focal length, and corrected date.';
