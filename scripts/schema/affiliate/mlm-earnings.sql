-- MLM earnings tracking table
-- Records Level 1 (2%) and Level 2 (1%) bonuses

CREATE TABLE IF NOT EXISTS mlm_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  from_affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  commission_id UUID REFERENCES affiliate_commissions(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (1, 2)),
  amount DECIMAL(10,2) NOT NULL,
  profit_source DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mlm_earnings_affiliate ON mlm_earnings(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_mlm_earnings_from_affiliate ON mlm_earnings(from_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_mlm_earnings_commission ON mlm_earnings(commission_id);
CREATE INDEX IF NOT EXISTS idx_mlm_earnings_created ON mlm_earnings(created_at DESC);

-- RLS Policies
ALTER TABLE mlm_earnings ENABLE ROW LEVEL SECURITY;

-- Affiliates can see their own MLM earnings
CREATE POLICY IF NOT EXISTS "Affiliates can view their MLM earnings"
  ON mlm_earnings
  FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY IF NOT EXISTS "Service role has full access"
  ON mlm_earnings
  FOR ALL
  USING (true)
  WITH CHECK (true);



