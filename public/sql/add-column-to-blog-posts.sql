-- Add column field to blog_posts table
-- This tracks which blog column the post belongs to

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'column'
  ) THEN
    ALTER TABLE blog_posts 
    ADD COLUMN column TEXT CHECK (column IN ('main', 'bookclub', 'gearheads', 'borderlands', 'science', 'newtheory'));
    
    -- Create index for filtering by column
    CREATE INDEX IF NOT EXISTS idx_blog_posts_column ON blog_posts(column);
    
    -- Set default for existing rows based on subdomain
    -- Posts with subdomain are bookclub, posts without are main
    UPDATE blog_posts SET column = 'bookclub' WHERE subdomain IS NOT NULL AND column IS NULL;
    UPDATE blog_posts SET column = 'main' WHERE subdomain IS NULL AND column IS NULL;
  END IF;
END $$;
