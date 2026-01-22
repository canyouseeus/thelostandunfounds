-- Migration: Add last_discount_use_date column to affiliates table
-- This column tracks when an affiliate last used their employee discount
-- They can only use the discount once every 30 days

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'affiliates' AND column_name = 'last_discount_use_date'
    ) THEN
        ALTER TABLE affiliates ADD COLUMN last_discount_use_date DATE;
        COMMENT ON COLUMN affiliates.last_discount_use_date IS 'Date when affiliate last used their 42% employee discount (can use once per 30 days)';
    END IF;
END $$;
