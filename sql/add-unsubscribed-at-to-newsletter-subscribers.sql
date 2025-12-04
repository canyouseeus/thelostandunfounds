-- Add unsubscribed_at column to newsletter_subscribers table
-- This tracks when a subscriber unsubscribed

-- Add column to track when unsubscribe occurred
ALTER TABLE newsletter_subscribers 
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribed_at 
ON newsletter_subscribers(unsubscribed_at);

-- Add comment
COMMENT ON COLUMN newsletter_subscribers.unsubscribed_at IS 'Timestamp when the subscriber unsubscribed. NULL means still subscribed.';
