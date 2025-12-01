-- Add blog_title and author_name fields to user_subdomains table
-- Allows users to set a custom title for their blog and stores their author name

-- Add the blog_title column if it doesn't exist (normalized version for database)
ALTER TABLE user_subdomains 
ADD COLUMN IF NOT EXISTS blog_title TEXT;

-- Add the blog_title_display column if it doesn't exist (styled version for display)
ALTER TABLE user_subdomains 
ADD COLUMN IF NOT EXISTS blog_title_display TEXT;

-- Add the author_name column if it doesn't exist (for displaying username on blog page)
ALTER TABLE user_subdomains 
ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Update RLS policy to allow users to update their own blog_title and author_name
-- IMPORTANT: Drop the existing restrictive admin-only update policy first
DROP POLICY IF EXISTS "Admins can update subdomains" ON user_subdomains;
DROP POLICY IF EXISTS "Users can update their own blog title" ON user_subdomains;

-- Create policy that allows ALL users to update their own row
-- This policy allows regular users to update blog_title and author_name on their own row
CREATE POLICY "Users can update their own blog title"
  ON user_subdomains
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create separate admin policy for subdomain updates (if needed in future)
-- Use a simple function that doesn't query tables
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Try to get email from JWT claims
  -- Fallback: return false if JWT doesn't have email
  RETURN COALESCE(
    (auth.jwt() ->> 'email')::text IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com'),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policy allows admins to update any row (including subdomain)
-- This is separate from the user policy - both can coexist
CREATE POLICY "Admins can update subdomains"
  ON user_subdomains
  FOR UPDATE
  USING (is_admin_user());

-- Add comments to document the fields
COMMENT ON COLUMN user_subdomains.blog_title IS 'Normalized blog title (symbols removed, + converted to AND) for database storage and URLs.';
COMMENT ON COLUMN user_subdomains.blog_title_display IS 'Styled blog title (as typed by user) for display on the blog page.';
COMMENT ON COLUMN user_subdomains.author_name IS 'Author name (username) from user metadata. Displayed on blog page if blog_title is not set.';
