-- Add column field to blog_submissions table
-- This tracks which blog column the submission is for

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_submissions' AND column_name = 'column'
  ) THEN
    ALTER TABLE blog_submissions 
    ADD COLUMN column TEXT CHECK (column IN ('main', 'bookclub', 'gearheads', 'borderlands', 'science', 'newtheory'));
    
    -- Create index for filtering by column
    CREATE INDEX IF NOT EXISTS idx_blog_submissions_column ON blog_submissions(column);
    
    -- Set default for existing rows (they're all bookclub submissions)
    UPDATE blog_submissions SET column = 'bookclub' WHERE column IS NULL;
  END IF;
END $$;
