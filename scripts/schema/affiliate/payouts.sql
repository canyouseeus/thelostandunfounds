-- =====================================================
-- Affiliate Payout Settings & Requests
-- =====================================================
-- Run this script after the base affiliate schema
-- Creates tables used by the payout settings and payout request APIs
-- =====================================================

-- ---------------------------------
-- Affiliate Payout Settings Table
-- ---------------------------------
CREATE TABLE IF NOT EXISTS affiliate_payout_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  paypal_email TEXT NOT NULL,
  payment_threshold DECIMAL(10,2) NOT NULL DEFAULT 10.00 CHECK (payment_threshold >= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payout_settings_affiliate_id
  ON affiliate_payout_settings(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_payout_settings_user_id
  ON affiliate_payout_settings(user_id);

DROP TRIGGER IF EXISTS update_affiliate_payout_settings_updated_at ON affiliate_payout_settings;
CREATE TRIGGER update_affiliate_payout_settings_updated_at
  BEFORE UPDATE ON affiliate_payout_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE affiliate_payout_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their payout settings" ON affiliate_payout_settings;
CREATE POLICY "Users can view their payout settings"
  ON affiliate_payout_settings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their payout settings" ON affiliate_payout_settings;
CREATE POLICY "Users can manage their payout settings"
  ON affiliate_payout_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON affiliate_payout_settings TO anon, authenticated;

COMMENT ON TABLE affiliate_payout_settings IS 'Stores PayPal details and payout thresholds per affiliate user.';

-- ---------------------------------
-- Payout Requests Table
-- ---------------------------------
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_code TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
  paypal_email TEXT NOT NULL,
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_affiliate_id
  ON payout_requests(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_payout_requests_status
  ON payout_requests(status);

DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON payout_requests;
CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view their payout requests" ON payout_requests;
CREATE POLICY "Affiliates can view their payout requests"
  ON payout_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = payout_requests.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages payout requests" ON payout_requests;
CREATE POLICY "Service role manages payout requests"
  ON payout_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON payout_requests TO anon, authenticated;

COMMENT ON TABLE payout_requests IS 'Affiliate initiated payout requests awaiting admin review.';
