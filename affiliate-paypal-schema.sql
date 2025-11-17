-- PayPal Integration & Affiliate Tracking Schema
-- Run this in Supabase SQL Editor
-- Adds profit tracking, product costs, and KING MIDAS tables

-- ============================================
-- AFFILIATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  total_earnings DECIMAL(10,2) DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AFFILIATE COMMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  order_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  profit_generated DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (profit_generated >= 0),
  product_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (product_cost >= 0),
  source TEXT NOT NULL CHECK (source IN ('paypal', 'fourthwall', 'local')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(affiliate_id, order_id, source)
);

-- ============================================
-- PRODUCT COSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL,
  variant_id TEXT,
  source TEXT NOT NULL CHECK (source IN ('local', 'fourthwall', 'paypal')),
  cost DECIMAL(10,2) NOT NULL CHECK (cost >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, variant_id, source)
);

-- ============================================
-- KING MIDAS DAILY STATS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS king_midas_daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  profit_generated DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (profit_generated >= 0),
  rank INTEGER,
  pool_share DECIMAL(10,2) DEFAULT 0 CHECK (pool_share >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(affiliate_id, date)
);

-- ============================================
-- KING MIDAS PAYOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS king_midas_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  rank INTEGER,
  pool_amount DECIMAL(10,2) NOT NULL CHECK (pool_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_order_id ON affiliate_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_product_costs_product_id ON product_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_costs_source ON product_costs(source);
CREATE INDEX IF NOT EXISTS idx_king_midas_daily_stats_affiliate_id ON king_midas_daily_stats(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_king_midas_daily_stats_date ON king_midas_daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_king_midas_daily_stats_rank ON king_midas_daily_stats(rank);
CREATE INDEX IF NOT EXISTS idx_king_midas_payouts_affiliate_id ON king_midas_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_king_midas_payouts_date ON king_midas_payouts(date);
CREATE INDEX IF NOT EXISTS idx_king_midas_payouts_status ON king_midas_payouts(status);

-- ============================================
-- SQL FUNCTIONS
-- ============================================

-- Function to increment affiliate clicks
CREATE OR REPLACE FUNCTION increment_affiliate_clicks(affiliate_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE affiliates
  SET total_clicks = total_clicks + 1,
      updated_at = NOW()
  WHERE id = affiliate_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_affiliates_updated_at ON affiliates;
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_affiliate_commissions_updated_at ON affiliate_commissions;
CREATE TRIGGER update_affiliate_commissions_updated_at
  BEFORE UPDATE ON affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_costs_updated_at ON product_costs;
CREATE TRIGGER update_product_costs_updated_at
  BEFORE UPDATE ON product_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_king_midas_daily_stats_updated_at ON king_midas_daily_stats;
CREATE TRIGGER update_king_midas_daily_stats_updated_at
  BEFORE UPDATE ON king_midas_daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_king_midas_payouts_updated_at ON king_midas_payouts;
CREATE TRIGGER update_king_midas_payouts_updated_at
  BEFORE UPDATE ON king_midas_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Affiliates: Users can view their own affiliate record
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own affiliate" ON affiliates;
CREATE POLICY "Users can view their own affiliate"
  ON affiliates
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own affiliate" ON affiliates;
CREATE POLICY "Users can update their own affiliate"
  ON affiliates
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Affiliate Commissions: Users can view their own commissions
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own commissions" ON affiliate_commissions;
CREATE POLICY "Users can view their own commissions"
  ON affiliate_commissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = affiliate_commissions.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Product Costs: Admin only (no RLS for now, handled in API)
ALTER TABLE product_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view product costs" ON product_costs;
CREATE POLICY "Anyone can view product costs"
  ON product_costs
  FOR SELECT
  USING (true);

-- KING MIDAS Daily Stats: Users can view their own stats
ALTER TABLE king_midas_daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own daily stats" ON king_midas_daily_stats;
CREATE POLICY "Users can view their own daily stats"
  ON king_midas_daily_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = king_midas_daily_stats.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- KING MIDAS Payouts: Users can view their own payouts
ALTER TABLE king_midas_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payouts" ON king_midas_payouts;
CREATE POLICY "Users can view their own payouts"
  ON king_midas_payouts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = king_midas_payouts.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON affiliates TO anon, authenticated;
GRANT ALL ON affiliate_commissions TO anon, authenticated;
GRANT ALL ON product_costs TO anon, authenticated;
GRANT ALL ON king_midas_daily_stats TO anon, authenticated;
GRANT ALL ON king_midas_payouts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_affiliate_clicks(UUID) TO anon, authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE affiliates IS 'Affiliate accounts with tracking codes and commission rates';
COMMENT ON TABLE affiliate_commissions IS 'Commission records with profit tracking for each order';
COMMENT ON TABLE product_costs IS 'Product cost tracking for profit calculation';
COMMENT ON TABLE king_midas_daily_stats IS 'Daily profit stats for KING MIDAS ranking system';
COMMENT ON TABLE king_midas_payouts IS 'KING MIDAS pool payouts to top affiliates';

