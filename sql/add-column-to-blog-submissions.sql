-- Add column field to blog_submissions table
-- This tracks which blog column the submission is for
-- Using blog_column instead of column to avoid reserved keyword issues

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_submissions' AND column_name = 'blog_column'
  ) THEN
    ALTER TABLE blog_submissions 
    ADD COLUMN blog_column TEXT CHECK (blog_column IN ('main', 'bookclub', 'gearheads', 'borderlands', 'science', 'newtheory'));
    
    -- Create index for filtering by column
    CREATE INDEX IF NOT EXISTS idx_blog_submissions_blog_column ON blog_submissions(blog_column);
    
    -- Set default for existing rows (they're all bookclub submissions)
    UPDATE blog_submissions SET blog_column = 'bookclub' WHERE blog_column IS NULL;
  END IF;
END $$;
