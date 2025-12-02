-- Update schema for employee discount usage tracking
-- Affiliates stay in cash mode, but can use discount code once per 30 days

-- Rename column to track discount usage instead of mode switching
ALTER TABLE affiliates 
DROP COLUMN IF EXISTS last_mode_change_date,
ADD COLUMN IF NOT EXISTS last_discount_use_date DATE;

-- All affiliates stay in cash mode (remove discount mode)
UPDATE affiliates 
SET commission_mode = 'cash'
WHERE commission_mode = 'discount';

-- Create index for discount usage queries
CREATE INDEX IF NOT EXISTS idx_affiliates_discount_use ON affiliates(last_discount_use_date);



