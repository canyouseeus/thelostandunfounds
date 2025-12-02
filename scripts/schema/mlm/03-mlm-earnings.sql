-- =====================================================
-- MLM REFERRAL SYSTEM: MLM EARNINGS TABLE
-- =====================================================
-- Description: Track 2-tier MLM bonus earnings
-- Part: 3/8 - Database Foundation
-- =====================================================

-- Create mlm_earnings table
CREATE TABLE IF NOT EXISTS mlm_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who earned the bonus
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  
  -- From which sale
  sale_id UUID, -- Reference to sales/orders table (if exists)
  customer_email TEXT NOT NULL,
  
  -- MLM structure
  referring_affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  mlm_level INTEGER NOT NULL CHECK (mlm_level IN (1, 2)),
  
  -- Financial details
  sale_amount DECIMAL(10,2) NOT NULL,
  base_commission DECIMAL(10,2) NOT NULL, -- The 42% commission
  profit_amount DECIMAL(10,2) NOT NULL, -- Calculated profit (sale - cost)
  mlm_bonus_rate DECIMAL(5,4) NOT NULL, -- 0.02 for level 1, 0.01 for level 2
  mlm_bonus_amount DECIMAL(10,2) NOT NULL, -- Actual bonus earned
  
  -- Secret Santa tracking
  claimed BOOLEAN DEFAULT true, -- False if affiliate doesn't exist yet
  secret_santa_contribution DECIMAL(10,2) DEFAULT 0.00, -- Unclaimed 3% goes here
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure no duplicate earnings for same sale
  UNIQUE(sale_id, affiliate_id, mlm_level)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mlm_earnings_affiliate_id 
ON mlm_earnings(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_mlm_earnings_referring_affiliate 
ON mlm_earnings(referring_affiliate_id);

CREATE INDEX IF NOT EXISTS idx_mlm_earnings_level 
ON mlm_earnings(mlm_level);

CREATE INDEX IF NOT EXISTS idx_mlm_earnings_created_at 
ON mlm_earnings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mlm_earnings_unclaimed 
ON mlm_earnings(claimed) 
WHERE claimed = false;

-- Add comments
COMMENT ON TABLE mlm_earnings IS 'Tracks 2-tier MLM bonus earnings (Level 1: 2%, Level 2: 1% of profit)';
COMMENT ON COLUMN mlm_earnings.mlm_level IS '1 = direct referral, 2 = referral of referral';
COMMENT ON COLUMN mlm_earnings.mlm_bonus_rate IS '0.02 (2%) for level 1, 0.01 (1%) for level 2';
COMMENT ON COLUMN mlm_earnings.claimed IS 'False if affiliate does not exist yet (contribution goes to Secret Santa pot)';
COMMENT ON COLUMN mlm_earnings.secret_santa_contribution IS 'Unclaimed 3% that goes to Secret Santa pot';

-- Enable RLS
ALTER TABLE mlm_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Affiliates can view their own MLM earnings"
ON mlm_earnings FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM affiliates WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role has full access"
ON mlm_earnings FOR ALL
USING (auth.role() = 'service_role');



