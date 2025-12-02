-- =====================================================
-- MLM REFERRAL SYSTEM: REWARD POINTS HISTORY TABLE
-- =====================================================
-- Description: Track reward points earning and spending
-- Part: 4/8 - Database Foundation
-- =====================================================

-- Create reward_points_history table
CREATE TABLE IF NOT EXISTS reward_points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who earned/spent points
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  
  -- Transaction details
  points_change INTEGER NOT NULL, -- Positive for earning, negative for spending
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'earned_from_sale',
      'earned_from_mlm',
      'secret_santa_payout',
      'manual_adjustment',
      'bonus',
      'penalty'
    )
  ),
  
  -- Reference details
  sale_id UUID, -- Reference to sale that generated points
  mlm_earning_id UUID REFERENCES mlm_earnings(id),
  secret_santa_year INTEGER,
  
  -- Financial context
  profit_amount DECIMAL(10,2), -- Profit that generated the points
  description TEXT,
  
  -- Balance tracking
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reward_points_affiliate_id 
ON reward_points_history(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_reward_points_type 
ON reward_points_history(transaction_type);

CREATE INDEX IF NOT EXISTS idx_reward_points_created_at 
ON reward_points_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_points_secret_santa 
ON reward_points_history(secret_santa_year) 
WHERE transaction_type = 'secret_santa_payout';

-- Add comments
COMMENT ON TABLE reward_points_history IS 'Tracks reward points earning and spending (1 point per $10 profit, whole numbers only)';
COMMENT ON COLUMN reward_points_history.points_change IS 'Positive for earning, negative for spending';
COMMENT ON COLUMN reward_points_history.profit_amount IS 'Profit amount that generated points (1 point per $10)';
COMMENT ON COLUMN reward_points_history.secret_santa_year IS 'Year of Secret Santa payout (if applicable)';

-- Enable RLS
ALTER TABLE reward_points_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Affiliates can view their own points history"
ON reward_points_history FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM affiliates WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role has full access"
ON reward_points_history FOR ALL
USING (auth.role() = 'service_role');



