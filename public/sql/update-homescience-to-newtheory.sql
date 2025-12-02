-- Update Home Science column references to NEW THEORY
-- Run this if you already have the blog_column field with 'homescience' values

-- First, update any existing submissions
UPDATE blog_submissions 
SET blog_column = 'newtheory' 
WHERE blog_column = 'homescience';

-- Drop the old constraint
ALTER TABLE blog_submissions 
DROP CONSTRAINT IF EXISTS blog_submissions_blog_column_check;

-- Add the new constraint with 'newtheory' instead of 'homescience'
ALTER TABLE blog_submissions 
ADD CONSTRAINT blog_submissions_blog_column_check 
CHECK (blog_column IN ('main', 'bookclub', 'gearheads', 'borderlands', 'science', 'newtheory'));
