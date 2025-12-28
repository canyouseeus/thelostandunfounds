-- Employee discount codes table
-- Auto-generated when affiliate switches to discount mode

CREATE TABLE IF NOT EXISTS affiliate_discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL UNIQUE,
  code TEXT UNIQUE NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 42.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON affiliate_discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_affiliate ON affiliate_discount_codes(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON affiliate_discount_codes(is_active);

-- RLS Policies
ALTER TABLE affiliate_discount_codes ENABLE ROW LEVEL SECURITY;

-- Affiliates can see their own discount code
CREATE POLICY IF NOT EXISTS "Affiliates can view their discount code"
  ON affiliate_discount_codes
  FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid()
    )
  );

-- Anyone can check if a discount code is valid (for checkout)
CREATE POLICY IF NOT EXISTS "Anyone can check discount codes"
  ON affiliate_discount_codes
  FOR SELECT
  USING (is_active = true);

-- Service role has full access
CREATE POLICY IF NOT EXISTS "Service role has full access"
  ON affiliate_discount_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);



