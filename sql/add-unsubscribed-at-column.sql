-- Migration: Add unsubscribed_at column to newsletter_subscribers table
-- This column tracks when a user unsubscribes from the newsletter

-- Add the unsubscribed_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter_subscribers' 
        AND column_name = 'unsubscribed_at'
    ) THEN
        ALTER TABLE newsletter_subscribers 
        ADD COLUMN unsubscribed_at TIMESTAMPTZ DEFAULT NULL;
        
        RAISE NOTICE 'Column unsubscribed_at added to newsletter_subscribers table';
    ELSE
        RAISE NOTICE 'Column unsubscribed_at already exists';
    END IF;
END $$;

-- Add a comment to describe the column
COMMENT ON COLUMN newsletter_subscribers.unsubscribed_at IS 'Timestamp when the user unsubscribed from the newsletter';

-- Update existing unsubscribed users to have a placeholder date (their created_at date)
-- This is only for existing records that don't have an unsubscribed_at value
UPDATE newsletter_subscribers
SET unsubscribed_at = created_at
WHERE verified = false AND unsubscribed_at IS NULL;
