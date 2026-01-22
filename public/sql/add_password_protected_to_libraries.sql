-- Add password_protected column to photo_libraries table
ALTER TABLE photo_libraries 
ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT FALSE;

-- Add updated_at if missing (good practice)
ALTER TABLE photo_libraries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
