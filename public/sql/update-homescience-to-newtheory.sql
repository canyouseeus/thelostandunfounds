-- Update Home Science column references to NEW THEORY
-- Run this if you already have the column field with 'homescience' values

-- First, update any existing submissions
UPDATE blog_submissions 
SET column = 'newtheory' 
WHERE column = 'homescience';

-- Drop the old constraint
ALTER TABLE blog_submissions 
DROP CONSTRAINT IF EXISTS blog_submissions_column_check;

-- Add the new constraint with 'newtheory' instead of 'homescience'
ALTER TABLE blog_submissions 
ADD CONSTRAINT blog_submissions_column_check 
CHECK (column IN ('main', 'bookclub', 'gearheads', 'borderlands', 'science', 'newtheory'));
