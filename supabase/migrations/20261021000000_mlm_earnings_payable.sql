-- =====================================================
-- Upline (MLM) earnings become payable
-- =====================================================
-- register_referral_conversion recorded MLM L1/L2 shares only in
-- mlm_earnings, which has no paid state and which no balance, dashboard or
-- payout code reads. The money was recorded and stranded.
--
-- Each upline share now also writes an affiliate_commissions row for the
-- upline (source_table = mlm_level1 / mlm_level2), payable on the same terms
-- as the sale. The "already recorded" check now matches only the seller's own
-- row. mlm_earnings stays as the record of who earned what from whom.
--
-- Back-fills the one existing MLM earning: $5.60 L1 to THELOSTANDUNFOUNDS
-- from Sonni's INV-013 sale.
-- =====================================================

SET LOCAL lock_timeout = '10s';

CREATE OR REPLACE FUNCTION register_referral_conversion(
  p_email TEXT,
  p_source TEXT,
  p_source_id TEXT,
  p_gross_amount NUMERIC,
  p_user_id UUID DEFAULT NULL,
  p_cost NUMERIC DEFAULT NULL,
  p_sale_at TIMESTAMPTZ DEFAULT NULL,
  p_adopt_commission_id UUID DEFAULT NULL
)
RETURNS TABLE (
  affiliate_id UUID,
  commission_id UUID,
  commission_amount NUMERIC,
  is_new BOOLEAN,
  profit NUMERIC,
  mlm_level1 NUMERIC,
  mlm_level2 NUMERIC,
  king_midas NUMERIC,
  secret_santa NUMERIC,
  points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_sale_at   TIMESTAMPTZ := COALESCE(p_sale_at, NOW());
  v_cost      NUMERIC(10,2);
  v_order     UUID;
  v_profit    NUMERIC(10,2);
  v_aff       UUID;
  v_existing  UUID;
  v_comm      UUID;
  v_amount    NUMERIC(10,2);
  v_available TIMESTAMPTZ;
  v_adopt     RECORD;
  v_l1        UUID;
  v_l2        UUID;
  v_l1_amt    NUMERIC(10,2) := 0;
  v_l2_amt    NUMERIC(10,2) := 0;
  v_km        NUMERIC(10,2);
  v_ss        NUMERIC(10,2);
  v_points    INTEGER;
  v_day       DATE;
  v_year      INTEGER;
  v_pot       UUID;
BEGIN
  IF p_email IS NULL OR p_source IS NULL OR p_source_id IS NULL THEN
    RAISE EXCEPTION 'email, source, source_id are required';
  END IF;
  v_order := p_source_id::uuid;

  -- No cost passed: a service job's cost is on its invoice(s) — job_cost,
  -- else the contractor's payout. source_id is the booking id, or the invoice
  -- id for a standalone job. Callers that know the cost pass it; this keeps a
  -- caller that doesn't from splitting on gross.
  IF p_cost IS NOT NULL THEN
    v_cost := GREATEST(p_cost, 0);
  ELSIF p_source = 'booking' THEN
    SELECT COALESCE(MAX(COALESCE(i.job_cost, i.contractor_payout, 0)), 0) INTO v_cost
    FROM invoices i
    WHERE (i.id = v_order OR i.booking_id = v_order)
      AND i.status <> 'superseded';
  ELSE
    v_cost := 0;
  END IF;

  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RETURN;
  END IF;

  v_profit := ROUND(GREATEST(p_gross_amount - v_cost, 0), 2);
  IF v_profit <= 0 THEN
    RETURN;
  END IF;

  SELECT ac.referred_by_affiliate_id INTO v_aff
  FROM affiliate_customers ac
  WHERE LOWER(ac.email) = LOWER(p_email)
  LIMIT 1;

  IF v_aff IS NULL THEN
    RETURN;
  END IF;

  -- Two deliveries of one webhook must not both pass the existence check.
  PERFORM pg_advisory_xact_lock(hashtext('referral:' || p_source || ':' || p_source_id));

  -- The seller's own commission for this sale. Upline rows for the same sale
  -- (source_table mlm_level1/2) must not count as "already recorded".
  SELECT c.id INTO v_existing
  FROM affiliate_commissions c
  WHERE c.source = p_source AND c.order_id = v_order
    AND c.affiliate_id = v_aff
    AND COALESCE(c.source_table, '') NOT LIKE 'mlm_level%'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_aff, v_existing, NULL::NUMERIC, FALSE, v_profit,
      NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::INTEGER;
    RETURN;
  END IF;

  v_amount := ROUND(v_profit * 0.42, 2);
  v_available := CASE WHEN p_source = 'prodigi_order'
                      THEN v_sale_at + INTERVAL '30 days'
                      ELSE v_sale_at END;

  IF p_adopt_commission_id IS NOT NULL THEN
    SELECT * INTO v_adopt FROM affiliate_commissions c
    WHERE c.id = p_adopt_commission_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'commission % not found', p_adopt_commission_id;
    END IF;
    IF v_adopt.affiliate_id <> v_aff THEN
      RAISE EXCEPTION 'commission % belongs to another affiliate', p_adopt_commission_id;
    END IF;
    IF v_adopt.order_id IS NOT NULL THEN
      RAISE EXCEPTION 'commission % is already attached to order %', p_adopt_commission_id, v_adopt.order_id;
    END IF;
    IF v_adopt.amount <> v_amount THEN
      RAISE EXCEPTION 'commission % is % but this sale computes %', p_adopt_commission_id, v_adopt.amount, v_amount;
    END IF;
    -- Status, available_date and payout fields are left alone: the row may
    -- already be queued or paid.
    UPDATE affiliate_commissions
    SET order_id = v_order,
        source = p_source,
        source_table = p_source,
        gross_amount = p_gross_amount,
        profit_generated = v_profit,
        product_cost = v_cost,
        updated_at = NOW()
    WHERE id = p_adopt_commission_id;
    v_comm := p_adopt_commission_id;
  ELSE
    INSERT INTO affiliate_commissions (
      affiliate_id, order_id, amount, gross_amount,
      profit_generated, product_cost, source, source_table, status,
      available_date, created_at
    ) VALUES (
      v_aff, v_order, v_amount, p_gross_amount,
      v_profit, v_cost, p_source, p_source, 'approved',
      v_available, v_sale_at
    )
    RETURNING id INTO v_comm;
  END IF;

  UPDATE affiliates
  SET total_conversions = COALESCE(total_conversions, 0) + 1,
      total_earnings = COALESCE(total_earnings, 0) + v_amount,
      updated_at = NOW()
  WHERE id = v_aff;

  UPDATE affiliate_customers
  SET total_purchases = COALESCE(total_purchases, 0) + 1,
      total_profit_generated = COALESCE(total_profit_generated, 0) + v_profit,
      first_purchase_date = COALESCE(first_purchase_date, v_sale_at::timestamp)
  WHERE LOWER(email) = LOWER(p_email);

  -- Reward points: 1 per $10 profit
  v_points := FLOOR(v_profit / 10)::INTEGER;
  IF v_points > 0 THEN
    INSERT INTO reward_points_history (affiliate_id, points, profit_amount, source, commission_id, description)
    VALUES (v_aff, v_points, v_profit, 'sale', v_comm, 'Sale: $' || v_profit::TEXT || ' profit');
    UPDATE affiliates SET reward_points = COALESCE(reward_points, 0) + v_points WHERE id = v_aff;
  END IF;

  -- MLM on profit: L1 2%, L2 1%
  SELECT a.referred_by INTO v_l1 FROM affiliates a WHERE a.id = v_aff;
  IF v_l1 IS NOT NULL AND v_l1 <> v_aff THEN
    v_l1_amt := ROUND(v_profit * 0.02, 2);
    INSERT INTO mlm_earnings (affiliate_id, from_affiliate_id, commission_id, level, amount, profit_source)
    VALUES (v_l1, v_aff, v_comm, 1, v_l1_amt, v_profit);
    UPDATE affiliates SET total_mlm_earnings = COALESCE(total_mlm_earnings, 0) + v_l1_amt WHERE id = v_l1;
    -- Payable: balances and payouts read affiliate_commissions, not mlm_earnings.
    IF v_l1_amt > 0 THEN
      INSERT INTO affiliate_commissions (
        affiliate_id, order_id, amount, gross_amount, profit_generated, product_cost,
        source, source_table, status, available_date, created_at
      ) VALUES (
        v_l1, v_order, v_l1_amt, p_gross_amount, v_profit, v_cost,
        p_source, 'mlm_level1', 'approved', v_available, v_sale_at
      );
    END IF;

    SELECT a.referred_by INTO v_l2 FROM affiliates a WHERE a.id = v_l1;
    IF v_l2 IS NOT NULL AND v_l2 <> v_l1 AND v_l2 <> v_aff THEN
      v_l2_amt := ROUND(v_profit * 0.01, 2);
      INSERT INTO mlm_earnings (affiliate_id, from_affiliate_id, commission_id, level, amount, profit_source)
      VALUES (v_l2, v_aff, v_comm, 2, v_l2_amt, v_profit);
      UPDATE affiliates SET total_mlm_earnings = COALESCE(total_mlm_earnings, 0) + v_l2_amt WHERE id = v_l2;
      IF v_l2_amt > 0 THEN
        INSERT INTO affiliate_commissions (
          affiliate_id, order_id, amount, gross_amount, profit_generated, product_cost,
          source, source_table, status, available_date, created_at
        ) VALUES (
          v_l2, v_order, v_l2_amt, p_gross_amount, v_profit, v_cost,
          p_source, 'mlm_level2', 'approved', v_available, v_sale_at
        );
      END IF;
    END IF;
  END IF;

  -- King Midas: the pot is 8% of the day's summed profit_generated
  -- (_king-midas-distribute-handler.ts), on the Central-time day.
  v_km := ROUND(v_profit * 0.08, 2);
  v_day := (v_sale_at AT TIME ZONE 'America/Chicago')::DATE;
  UPDATE king_midas_daily_stats
  SET profit_generated = profit_generated + v_profit, updated_at = NOW()
  WHERE affiliate_id = v_aff AND date = v_day;
  IF NOT FOUND THEN
    BEGIN
      INSERT INTO king_midas_daily_stats (affiliate_id, date, profit_generated)
      VALUES (v_aff, v_day, v_profit);
    EXCEPTION WHEN unique_violation THEN
      UPDATE king_midas_daily_stats
      SET profit_generated = profit_generated + v_profit, updated_at = NOW()
      WHERE affiliate_id = v_aff AND date = v_day;
    END;
  END IF;

  -- Secret Santa: 3% into the sale year's pot, created on first use
  v_ss := ROUND(v_profit * 0.03, 2);
  v_year := EXTRACT(YEAR FROM (v_sale_at AT TIME ZONE 'America/Chicago'))::INTEGER;
  SELECT s.id INTO v_pot FROM secret_santa_pot s WHERE s.year = v_year;
  IF v_pot IS NULL THEN
    BEGIN
      INSERT INTO secret_santa_pot (year, total_amount) VALUES (v_year, 0) RETURNING id INTO v_pot;
    EXCEPTION WHEN unique_violation THEN
      SELECT s.id INTO v_pot FROM secret_santa_pot s WHERE s.year = v_year;
    END;
  END IF;
  INSERT INTO secret_santa_contributions (pot_id, commission_id, amount, reason)
  VALUES (v_pot, v_comm, v_ss, 'profit_allocation');
  UPDATE secret_santa_pot SET total_amount = COALESCE(total_amount, 0) + v_ss WHERE id = v_pot;

  RETURN QUERY SELECT v_aff, v_comm, v_amount, TRUE, v_profit,
    v_l1_amt, v_l2_amt, v_km, v_ss, v_points;
END;
$$;

-- Back-fill: a payable row for every existing mlm_earnings entry that has none.
DO $$
DECLARE m RECORD; base RECORD; existing_id UUID;
BEGIN
  FOR m IN SELECT * FROM mlm_earnings LOOP
    SELECT * INTO base FROM affiliate_commissions WHERE id = m.commission_id;
    IF base.id IS NULL THEN CONTINUE; END IF;
    SELECT id INTO existing_id FROM affiliate_commissions
     WHERE affiliate_id = m.affiliate_id AND order_id = base.order_id
       AND source = base.source AND source_table = 'mlm_level' || m.level
     LIMIT 1;
    IF existing_id IS NULL THEN
      INSERT INTO affiliate_commissions (
        affiliate_id, order_id, amount, gross_amount, profit_generated, product_cost,
        source, source_table, status, available_date, created_at
      ) VALUES (
        m.affiliate_id, base.order_id, m.amount, base.gross_amount, base.profit_generated, base.product_cost,
        base.source, 'mlm_level' || m.level, 'approved',
        COALESCE(base.available_date, base.created_at), base.created_at
      );
    END IF;
  END LOOP;
END $$;
