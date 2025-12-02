-- =====================================================
-- MLM REFERRAL SYSTEM: AFFILIATES TABLE UPDATE
-- =====================================================
-- Description: Add reward_points, is_employee, and tracking columns
-- Part: 1/8 - Database Foundation
-- =====================================================

-- Add new columns to affiliates table
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS employee_mode_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_mode_switch_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_mlm_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS lifetime_customers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for employee lookups
CREATE INDEX IF NOT EXISTS idx_affiliates_is_employee 
ON affiliates(is_employee) 
WHERE is_employee = true;

-- Create index for reward points (for Secret Santa distribution)
CREATE INDEX IF NOT EXISTS idx_affiliates_reward_points 
ON affiliates(reward_points DESC);

-- Add comment
COMMENT ON COLUMN affiliates.reward_points IS 'Reward points earned from profit (1 point per $10 profit, whole numbers only)';
COMMENT ON COLUMN affiliates.is_employee IS 'Whether this affiliate is an employee (can toggle employee discount mode)';
COMMENT ON COLUMN affiliates.employee_mode_active IS 'Whether employee discount mode is currently active (42% discount)';
COMMENT ON COLUMN affiliates.last_mode_switch_date IS 'Last time employee mode was toggled (can only switch once per month)';
COMMENT ON COLUMN affiliates.total_mlm_earnings IS 'Total MLM bonuses earned (Level 1: 2%, Level 2: 1%)';
COMMENT ON COLUMN affiliates.lifetime_customers_count IS 'Number of customers permanently tied to this affiliate';



