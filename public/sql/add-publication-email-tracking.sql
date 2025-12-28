-- Add publication email tracking to blog_submissions table
-- This tracks when publication notification emails have been sent

-- Add column to track when publication email was sent
ALTER TABLE blog_submissions 
ADD COLUMN IF NOT EXISTS publication_email_sent_at TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_submissions_publication_email_sent 
ON blog_submissions(publication_email_sent_at);

-- Add comment
COMMENT ON COLUMN blog_submissions.publication_email_sent_at IS 'Timestamp when publication notification email was sent to the author. NULL means email has not been sent yet.';
