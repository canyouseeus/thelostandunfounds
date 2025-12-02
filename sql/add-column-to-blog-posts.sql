-- Add column field to blog_posts table
-- This tracks which blog column the post belongs to
-- Note: Using "blog_column" instead of "column" because "column" is a reserved keyword

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'blog_column'
  ) THEN
    ALTER TABLE blog_posts 
    ADD COLUMN blog_column TEXT CHECK (blog_column IN ('main', 'bookclub', 'gearheads', 'borderlands', 'science', 'newtheory'));
    
    -- Create index for filtering by column
    CREATE INDEX IF NOT EXISTS idx_blog_posts_blog_column ON blog_posts(blog_column);
    
    -- Set default for existing rows based on subdomain
    -- Posts with subdomain are bookclub, posts without are main
    UPDATE blog_posts SET blog_column = 'bookclub' WHERE subdomain IS NOT NULL AND blog_column IS NULL;
    UPDATE blog_posts SET blog_column = 'main' WHERE subdomain IS NULL AND blog_column IS NULL;
  END IF;
END $$;
