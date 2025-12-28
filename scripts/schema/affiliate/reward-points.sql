-- Reward points history table
-- Tracks point awards: 1 point per $10 profit generated

CREATE TABLE IF NOT EXISTS reward_points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  profit_amount DECIMAL(10,2) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('sale', 'self_purchase', 'bonus', 'adjustment')),
  commission_id UUID REFERENCES affiliate_commissions(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reward_points_affiliate ON reward_points_history(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_reward_points_created ON reward_points_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_points_source ON reward_points_history(source);

-- RLS Policies
ALTER TABLE reward_points_history ENABLE ROW LEVEL SECURITY;

-- Affiliates can see their own points history
CREATE POLICY IF NOT EXISTS "Affiliates can view their points history"
  ON reward_points_history
  FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY IF NOT EXISTS "Service role has full access"
  ON reward_points_history
  FOR ALL
  USING (true)
  WITH CHECK (true);



