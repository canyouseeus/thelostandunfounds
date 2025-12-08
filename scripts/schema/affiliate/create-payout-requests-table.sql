-- ============================================
-- PAYOUT REQUESTS TABLE
-- ============================================
-- Tracks affiliate payout requests and processing
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  paypal_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  paypal_payout_batch_id TEXT, -- PayPal batch payout ID
  paypal_payout_item_id TEXT, -- PayPal individual payout item ID
  error_message TEXT, -- Error details if payout failed
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id), -- Admin who processed (if manual)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payout_requests_affiliate_id ON payout_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created_at ON payout_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_payout_requests_paypal_batch_id ON payout_requests(paypal_payout_batch_id);

-- RLS Policies
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- Affiliates can view their own payout requests
DROP POLICY IF EXISTS "Affiliates can view their own payout requests" ON payout_requests;
CREATE POLICY "Affiliates can view their own payout requests"
  ON payout_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = payout_requests.affiliate_id
        AND affiliates.user_id = auth.uid()
    )
  );

-- Admins can view all payout requests
DROP POLICY IF EXISTS "Admins can view all payout requests" ON payout_requests;
CREATE POLICY "Admins can view all payout requests"
  ON payout_requests
  FOR SELECT
  USING (auth.role() = 'authenticated'); -- TODO: Add admin check

-- Admins can insert/update payout requests (for processing)
DROP POLICY IF EXISTS "Admins can manage payout requests" ON payout_requests;
CREATE POLICY "Admins can manage payout requests"
  ON payout_requests
  FOR ALL
  USING (auth.role() = 'authenticated') -- TODO: Add admin check
  WITH CHECK (auth.role() = 'authenticated'); -- TODO: Add admin check

-- Grant permissions
GRANT SELECT ON payout_requests TO anon, authenticated;
GRANT ALL ON payout_requests TO authenticated;

-- Add comments
COMMENT ON TABLE payout_requests IS 'Tracks affiliate payout requests and PayPal payout processing';
COMMENT ON COLUMN payout_requests.paypal_payout_batch_id IS 'PayPal batch payout ID from Payouts API';
COMMENT ON COLUMN payout_requests.paypal_payout_item_id IS 'PayPal individual payout item ID';
COMMENT ON COLUMN payout_requests.processed_by IS 'Admin user who manually processed the payout (if applicable)';

