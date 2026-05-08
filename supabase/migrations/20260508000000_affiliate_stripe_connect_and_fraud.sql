-- =====================================================
-- Affiliate program: Stripe Connect payouts + fraud protection
-- =====================================================
-- 1. Adds Stripe Connect account fields to affiliates + payout_settings
-- 2. Updates affiliate_commissions.source CHECK to include 'stripe',
--    'photo_order', 'booking'
-- 3. Adds fraud_score / blocked flags to clicks + affiliates
-- 4. Adds payout_requests fields for stripe transfer ids
-- 5. Adds an idempotent "register a referral conversion" RPC used by the
--    photo_order + booking completion handlers
-- =====================================================

-- ---------- AFFILIATES: Stripe Connect ----------
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT
    CHECK (stripe_account_status IN ('pending', 'restricted', 'active', 'rejected'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_stripe_account_id
  ON affiliates(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- ---------- PAYOUT SETTINGS: Stripe Connect ----------
ALTER TABLE affiliate_payout_settings
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_method TEXT
    DEFAULT 'stripe' CHECK (payout_method IN ('stripe', 'paypal'));

-- paypal_email is no longer required (kept for legacy data); allow null going forward
ALTER TABLE affiliate_payout_settings
  ALTER COLUMN paypal_email DROP NOT NULL;

-- ---------- PAYOUT REQUESTS: stripe transfer fields ----------
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_method TEXT
    DEFAULT 'stripe' CHECK (payout_method IN ('stripe', 'paypal')),
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE payout_requests
  ALTER COLUMN paypal_email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payout_requests_stripe_transfer_id
  ON payout_requests(stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;

-- ---------- COMMISSIONS: relax source CHECK + add tracking fields ----------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'affiliate_commissions' AND constraint_name LIKE '%source_check%'
  ) THEN
    EXECUTE 'ALTER TABLE affiliate_commissions DROP CONSTRAINT IF EXISTS affiliate_commissions_source_check';
  END IF;
END $$;

ALTER TABLE affiliate_commissions
  ADD COLUMN IF NOT EXISTS available_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS source_table TEXT,
  ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10,2);

ALTER TABLE affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_source_check;
ALTER TABLE affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_source_check
    CHECK (source IN ('paypal', 'fourthwall', 'local', 'stripe', 'photo_order', 'booking'));

ALTER TABLE affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_status_check;
ALTER TABLE affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_status_check
    CHECK (status IN ('pending', 'approved', 'confirmed', 'paid', 'cancelled', 'failed', 'reversed'));

-- ---------- CLICK EVENTS: fraud fields + indexes ----------
CREATE TABLE IF NOT EXISTS affiliate_click_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE affiliate_click_events
  ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dedup_hash TEXT,
  ADD COLUMN IF NOT EXISTS rate_limited BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_affiliate_click_events_ip_affiliate_time
  ON affiliate_click_events(affiliate_id, ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_click_events_dedup_hash
  ON affiliate_click_events(dedup_hash);

-- ---------- AFFILIATE FRAUD LOG ----------
CREATE TABLE IF NOT EXISTS affiliate_fraud_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity INTEGER DEFAULT 1,
  ip_address TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_fraud_events_affiliate
  ON affiliate_fraud_events(affiliate_id, created_at DESC);

-- ---------- EMAIL LOG (so we don't double-send) ----------
CREATE TABLE IF NOT EXISTS affiliate_email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  reference_id TEXT,
  resend_id TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_email_log_dedup
  ON affiliate_email_log(affiliate_id, email_type, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_email_log_type
  ON affiliate_email_log(email_type, sent_at DESC);

-- ---------- RPC: register a referral conversion (idempotent) ----------
-- Used by checkout webhooks + booking completion to insert a pending
-- commission keyed by (source, source_id) so replays are safe.
CREATE OR REPLACE FUNCTION register_referral_conversion(
  p_email TEXT,
  p_source TEXT,
  p_source_id TEXT,
  p_gross_amount NUMERIC,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  affiliate_id UUID,
  commission_id UUID,
  commission_amount NUMERIC,
  is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate_id UUID;
  v_commission_id UUID;
  v_commission DECIMAL(10,2);
  v_existing UUID;
  v_l1 UUID;
  v_l2 UUID;
  v_available_date TIMESTAMPTZ;
BEGIN
  IF p_email IS NULL OR p_source IS NULL OR p_source_id IS NULL THEN
    RAISE EXCEPTION 'email, source, source_id are required';
  END IF;

  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RETURN;
  END IF;

  -- Find referring affiliate
  SELECT ac.referred_by_affiliate_id INTO v_affiliate_id
  FROM affiliate_customers ac
  WHERE LOWER(ac.email) = LOWER(p_email)
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    RETURN;
  END IF;

  -- Idempotency: skip if a commission already exists for this source+source_id
  SELECT c.id INTO v_existing
  FROM affiliate_commissions c
  WHERE c.source = p_source AND c.order_id = p_source_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_affiliate_id, v_existing, NULL::NUMERIC, FALSE;
    RETURN;
  END IF;

  -- 42% base commission. 30 day holding period
  v_commission := ROUND((p_gross_amount * 0.42)::numeric, 2);
  v_available_date := NOW() + INTERVAL '30 days';

  INSERT INTO affiliate_commissions (
    affiliate_id, order_id, amount, gross_amount,
    profit_generated, product_cost, source, source_table, status,
    available_date
  ) VALUES (
    v_affiliate_id, p_source_id, v_commission, p_gross_amount,
    p_gross_amount, 0, p_source, p_source, 'pending',
    v_available_date
  )
  RETURNING id INTO v_commission_id;

  -- Update affiliate counters
  UPDATE affiliates
  SET total_conversions = COALESCE(total_conversions, 0) + 1,
      total_earnings = COALESCE(total_earnings, 0) + v_commission,
      updated_at = NOW()
  WHERE id = v_affiliate_id;

  -- Update customer ledger
  UPDATE affiliate_customers
  SET total_purchases = COALESCE(total_purchases, 0) + 1,
      total_profit_generated = COALESCE(total_profit_generated, 0) + p_gross_amount,
      first_purchase_date = COALESCE(first_purchase_date, NOW())
  WHERE LOWER(email) = LOWER(p_email);

  -- MLM Level 1 (2% of gross)
  SELECT referred_by INTO v_l1 FROM affiliates WHERE id = v_affiliate_id;
  IF v_l1 IS NOT NULL THEN
    INSERT INTO mlm_earnings (
      affiliate_id, from_affiliate_id, commission_id,
      level, amount, profit_source
    ) VALUES (
      v_l1, v_affiliate_id, v_commission_id,
      1, ROUND((p_gross_amount * 0.02)::numeric, 2), p_gross_amount
    );
    UPDATE affiliates
    SET total_mlm_earnings = COALESCE(total_mlm_earnings, 0) + ROUND((p_gross_amount * 0.02)::numeric, 2)
    WHERE id = v_l1;

    -- MLM Level 2 (1% of gross)
    SELECT referred_by INTO v_l2 FROM affiliates WHERE id = v_l1;
    IF v_l2 IS NOT NULL THEN
      INSERT INTO mlm_earnings (
        affiliate_id, from_affiliate_id, commission_id,
        level, amount, profit_source
      ) VALUES (
        v_l2, v_affiliate_id, v_commission_id,
        2, ROUND((p_gross_amount * 0.01)::numeric, 2), p_gross_amount
      );
      UPDATE affiliates
      SET total_mlm_earnings = COALESCE(total_mlm_earnings, 0) + ROUND((p_gross_amount * 0.01)::numeric, 2)
      WHERE id = v_l2;
    END IF;
  END IF;

  RETURN QUERY SELECT v_affiliate_id, v_commission_id, v_commission, TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION register_referral_conversion(TEXT, TEXT, TEXT, NUMERIC, UUID) TO service_role;

-- ---------- BOOKINGS: amount + completion status for commission triggers ----------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT;

-- Allow 'completed' / 'paid' on the existing CHECK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bookings' AND constraint_name = 'bookings_status_check'
  ) THEN
    EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT bookings_status_check';
  END IF;
END $$;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed', 'paid'));

-- ---------- COMMENTS ----------
COMMENT ON COLUMN affiliates.stripe_account_id IS 'Stripe Connect Express account id (acct_...)';
COMMENT ON COLUMN affiliates.fraud_score IS 'Cumulative fraud score; >=10 should freeze payouts';
COMMENT ON FUNCTION register_referral_conversion IS 'Idempotent referral conversion writer — used by photo_order + booking completion paths';
