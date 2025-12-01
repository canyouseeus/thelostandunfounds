-- Add blog_title and author_name fields to user_subdomains table
-- Allows users to set a custom title for their blog and stores their author name

-- Add the blog_title column if it doesn't exist
ALTER TABLE user_subdomains 
ADD COLUMN IF NOT EXISTS blog_title TEXT;

-- Add the author_name column if it doesn't exist (for displaying username on blog page)
ALTER TABLE user_subdomains 
ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Update RLS policy to allow users to update their own blog_title and author_name
-- Drop existing update policies to avoid conflicts
DROP POLICY IF EXISTS "Users can update their own blog title" ON user_subdomains;
DROP POLICY IF EXISTS "Admins can update subdomains" ON user_subdomains;

-- Create new policy that allows users to update their own blog_title and author_name
-- This avoids infinite recursion by not checking user_roles
CREATE POLICY "Users can update their own blog title"
  ON user_subdomains
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate admin policy (for subdomain changes if needed) - check email directly to avoid recursion
CREATE POLICY "Admins can update subdomains"
  ON user_subdomains
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (email = 'admin@thelostandunfounds.com' OR email = 'thelostandunfounds@gmail.com')
    )
  );

-- Add comments to document the fields
COMMENT ON COLUMN user_subdomains.blog_title IS 'Custom title for the user''s blog. Displayed as "[BLOG TITLE] BOOK CLUB" on the blog page.';
COMMENT ON COLUMN user_subdomains.author_name IS 'Author name (username) from user metadata. Displayed on blog page if blog_title is not set.';
