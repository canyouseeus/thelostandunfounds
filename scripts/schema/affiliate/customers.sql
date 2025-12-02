-- Customer lifetime tracking table
-- Links customers to the affiliate who first referred them (FOREVER)

CREATE TABLE IF NOT EXISTS affiliate_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  referred_by_affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL NOT NULL,
  first_purchase_date TIMESTAMP,
  total_purchases INTEGER DEFAULT 0,
  total_profit_generated DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_affiliate ON affiliate_customers(referred_by_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON affiliate_customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_user ON affiliate_customers(user_id);

-- RLS Policies
ALTER TABLE affiliate_customers ENABLE ROW LEVEL SECURITY;

-- Affiliates can see their own customers
CREATE POLICY IF NOT EXISTS "Affiliates can view their customers"
  ON affiliate_customers
  FOR SELECT
  USING (
    referred_by_affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY IF NOT EXISTS "Service role has full access"
  ON affiliate_customers
  FOR ALL
  USING (true)
  WITH CHECK (true);



