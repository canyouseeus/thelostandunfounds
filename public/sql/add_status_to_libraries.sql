-- Add status column to photo_libraries table
ALTER TABLE photo_libraries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
