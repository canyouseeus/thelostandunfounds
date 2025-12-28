-- Migration: Add scheduled_for column to newsletter_campaigns table
-- This column stores the scheduled send time for newsletter campaigns

-- Add the scheduled_for column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter_campaigns' 
        AND column_name = 'scheduled_for'
    ) THEN
        ALTER TABLE newsletter_campaigns 
        ADD COLUMN scheduled_for TIMESTAMPTZ DEFAULT NULL;
        
        RAISE NOTICE 'Column scheduled_for added to newsletter_campaigns table';
    ELSE
        RAISE NOTICE 'Column scheduled_for already exists';
    END IF;
END $$;

-- Add a comment to describe the column
COMMENT ON COLUMN newsletter_campaigns.scheduled_for IS 'Timestamp when the newsletter is scheduled to be sent (null for immediate send)';

-- Create an index for efficient querying of scheduled campaigns
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_scheduled_for 
ON newsletter_campaigns (scheduled_for) 
WHERE scheduled_for IS NOT NULL AND status = 'scheduled';
