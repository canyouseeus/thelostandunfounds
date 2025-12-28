-- ============================================
-- Commission Safeguards Migration
-- ============================================
-- Adds holding periods, chargeback handling, and audit logging
-- for safe automated affiliate payouts
-- ============================================

-- 1) Add columns to affiliate_commissions for holding period tracking
ALTER TABLE affiliate_commissions
  ADD COLUMN IF NOT EXISTS available_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paypal_batch_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_item_id TEXT;

-- 2) Add product_type to product_costs (physical = 30d hold, digital = 7d hold)
DO $$
BEGIN
  -- Add product_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_costs' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE product_costs ADD COLUMN product_type TEXT DEFAULT 'physical';
  END IF;
END $$;

-- 3) Create commission status audit log table
CREATE TABLE IF NOT EXISTS commission_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES affiliate_commissions(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by commission_id
CREATE INDEX IF NOT EXISTS idx_commission_status_log_commission_id 
  ON commission_status_log(commission_id);

-- Index for finding cancelled commissions quickly  
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status 
  ON affiliate_commissions(status);

-- Index for finding available commissions by date
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_available_date 
  ON affiliate_commissions(available_date) 
  WHERE status = 'pending' AND available_date IS NOT NULL;

-- 4) Set default available_date for existing pending commissions
-- (Use 30-day hold as default for existing records without available_date)
UPDATE affiliate_commissions
SET available_date = created_at + INTERVAL '30 days'
WHERE status = 'pending' 
  AND available_date IS NULL;

-- 5) Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_status 
  ON affiliate_commissions(affiliate_id, status);

-- 6) Create helper function to calculate available balance
CREATE OR REPLACE FUNCTION get_affiliate_available_balance(p_affiliate_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM affiliate_commissions
  WHERE affiliate_id = p_affiliate_id
    AND status = 'pending'
    AND available_date IS NOT NULL
    AND available_date <= NOW();
$$ LANGUAGE SQL STABLE;

-- 7) Create helper function to calculate pending balance
CREATE OR REPLACE FUNCTION get_affiliate_pending_balance(p_affiliate_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM affiliate_commissions
  WHERE affiliate_id = p_affiliate_id
    AND status = 'pending'
    AND (available_date IS NULL OR available_date > NOW());
$$ LANGUAGE SQL STABLE;

-- 8) RLS policies for commission_status_log
ALTER TABLE commission_status_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY IF NOT EXISTS "Service role full access to commission_status_log"
  ON commission_status_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Affiliates can view their own commission status log
CREATE POLICY IF NOT EXISTS "Affiliates can view own commission status log"
  ON commission_status_log
  FOR SELECT
  USING (
    commission_id IN (
      SELECT id FROM affiliate_commissions ac
      JOIN affiliates a ON ac.affiliate_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- 9) Grant necessary permissions
GRANT SELECT, INSERT ON commission_status_log TO authenticated;
GRANT SELECT, INSERT ON commission_status_log TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:

-- Check affiliate_commissions has new columns:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'affiliate_commissions' 
--   AND column_name IN ('available_date', 'cancelled_reason', 'cancelled_at');

-- Check product_costs has product_type:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'product_costs' AND column_name = 'product_type';

-- Check commission_status_log table exists:
-- SELECT * FROM commission_status_log LIMIT 1;

-- Check helper functions exist:
-- SELECT get_affiliate_available_balance('00000000-0000-0000-0000-000000000000');
-- SELECT get_affiliate_pending_balance('00000000-0000-0000-0000-000000000000');
