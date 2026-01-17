-- Add user association and drive folder to photo libraries
ALTER TABLE public.photo_libraries 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT true;

-- Update RLS Policies for photo_libraries
-- Drop existing public policy
DROP POLICY IF EXISTS "Public can view photo libraries" ON public.photo_libraries;

-- Create more restrictive policies
CREATE POLICY "Clients can view their own libraries" 
ON public.photo_libraries 
FOR SELECT 
USING (
    auth.uid() = user_id 
    OR 
    (is_private = false)
);

CREATE POLICY "Admins can do everything with libraries" 
ON public.photo_libraries 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND is_admin = true
    )
    OR
    (auth.jwt() ->> 'email') IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
);

-- Update RLS Policies for photos
-- Photos inherit visibility from their library
DROP POLICY IF EXISTS "Public can view photos" ON public.photos;

CREATE POLICY "Users can view photos in accessible libraries" 
ON public.photos 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.photo_libraries
        WHERE id = photos.library_id
        AND (
            auth.uid() = user_id 
            OR is_private = false
            OR EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND is_admin = true
            )
            OR (auth.jwt() ->> 'email') IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
        )
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_photo_libraries_user_id ON public.photo_libraries(user_id);
