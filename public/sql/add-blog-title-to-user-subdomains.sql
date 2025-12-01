-- Add blog_title field to user_subdomains table
-- Allows users to set a custom title for their blog

-- Add the blog_title column if it doesn't exist
ALTER TABLE user_subdomains 
ADD COLUMN IF NOT EXISTS blog_title TEXT;

-- Update RLS policy to allow users to update their own blog_title
-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update their own blog title" ON user_subdomains;

-- Create new policy that allows users to update their own blog_title
CREATE POLICY "Users can update their own blog title"
  ON user_subdomains
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment to document the field
COMMENT ON COLUMN user_subdomains.blog_title IS 'Custom title for the user''s blog. Displayed as "[BLOG TITLE] BOOK CLUB" on the blog page.';
