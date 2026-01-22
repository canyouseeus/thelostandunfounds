-- Add invited_emails column to photo_libraries
ALTER TABLE photo_libraries ADD COLUMN IF NOT EXISTS invited_emails TEXT DEFAULT '';

COMMENT ON COLUMN photo_libraries.invited_emails IS 'Comma-separated list of client emails invited to access this gallery';
