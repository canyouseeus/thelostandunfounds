-- Add welcome email tracking to user_subdomains table
-- This tracks when welcome emails have been sent to users

-- Add column to track when welcome email was sent
ALTER TABLE user_subdomains 
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_subdomains_welcome_email_sent 
ON user_subdomains(welcome_email_sent_at);

-- Add comment
COMMENT ON COLUMN user_subdomains.welcome_email_sent_at IS 'Timestamp when welcome email with getting started guide was sent to the user. NULL means email has not been sent yet.';
