-- Add MLM and rewards columns to existing affiliates table
-- DO NOT run this if columns already exist

ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES affiliates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_mlm_earnings DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_mode TEXT DEFAULT 'cash' CHECK (commission_mode IN ('cash', 'discount')),
ADD COLUMN IF NOT EXISTS last_mode_change_date DATE,
ADD COLUMN IF NOT EXISTS discount_credit_balance DECIMAL(10,2) DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_affiliates_referred_by ON affiliates(referred_by);
CREATE INDEX IF NOT EXISTS idx_affiliates_reward_points ON affiliates(reward_points);
CREATE INDEX IF NOT EXISTS idx_affiliates_commission_mode ON affiliates(commission_mode);

-- Update existing affiliates to have default values
UPDATE affiliates 
SET 
  reward_points = COALESCE(reward_points, 0),
  total_mlm_earnings = COALESCE(total_mlm_earnings, 0),
  commission_mode = COALESCE(commission_mode, 'cash'),
  discount_credit_balance = COALESCE(discount_credit_balance, 0)
WHERE 
  reward_points IS NULL 
  OR total_mlm_earnings IS NULL 
  OR commission_mode IS NULL 
  OR discount_credit_balance IS NULL;



