-- Add owner_id to photo_libraries
ALTER TABLE photo_libraries 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_photo_libraries_owner_id ON photo_libraries(owner_id);

-- Update RLS policies (if enabled)
-- Allow owners to view their own libraries
CREATE POLICY "Users can view own photo libraries" 
ON photo_libraries FOR SELECT 
USING (auth.uid() = owner_id);

-- Allow admins to see everything (assuming admin check logic exists or use service role)
-- For now, we rely on application-level logic or existing public/admin policies
