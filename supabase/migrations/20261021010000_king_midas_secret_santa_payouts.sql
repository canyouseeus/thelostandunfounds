-- =====================================================
-- King Midas daily payouts + Secret Santa points-weighted payout
-- =====================================================
-- Owner decisions, 2026-10-20:
--   * King Midas stays DAILY. The owner's own affiliate competes.
--   * A day's pot is 8% of that day's summed profit_generated (Central day).
--     1st 50%, 2nd 30%, 3rd 10%, everyone else splits 10%.
--   * The share nobody qualifies for (fewer than 4 on the board, cent
--     rounding) goes to that year's Secret Santa pot.
--   * Secret Santa pays out on Dec 25, WEIGHTED BY REWARD POINTS earned that
--     year (Central). The old code split it evenly and wrote text into a uuid
--     column, so it could never have run.
--
-- Winnings are written as approved affiliate_commissions rows
-- (source 'local', source_table 'king_midas' / 'secret_santa'), so they show
-- in balances and are paid through the same payout path as commissions.
--
-- Both functions are idempotent (a day / a year pays once) and run in one
-- transaction. EXECUTE is for service_role only.
-- =====================================================

SET LOCAL lock_timeout = '10s';

CREATE OR REPLACE FUNCTION distribute_king_midas(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today     DATE := (NOW() AT TIME ZONE 'America/Chicago')::DATE;
  v_total     NUMERIC(12,2);
  v_pot       NUMERIC(12,2);
  v_n         INTEGER;
  v_others    NUMERIC(12,2) := 0;
  v_assigned  NUMERIC(12,2) := 0;
  v_leftover  NUMERIC(12,2);
  v_amount    NUMERIC(12,2);
  v_ss_pot    UUID;
  v_year      INTEGER := EXTRACT(YEAR FROM p_date)::INTEGER;
  r           RECORD;
  v_winners   JSONB := '[]'::jsonb;
BEGIN
  IF p_date IS NULL THEN
    RAISE EXCEPTION 'date is required';
  END IF;
  IF p_date >= v_today THEN
    RAISE EXCEPTION 'King Midas day % has not ended (Central today is %)', p_date, v_today;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('king_midas:' || p_date::TEXT));

  IF EXISTS (SELECT 1 FROM king_midas_payouts WHERE date = p_date) THEN
    RETURN jsonb_build_object('date', p_date, 'status', 'already_distributed');
  END IF;

  SELECT COALESCE(SUM(profit_generated), 0), COUNT(*) INTO v_total, v_n
  FROM king_midas_daily_stats WHERE date = p_date AND profit_generated > 0;

  v_pot := ROUND(v_total * 0.08, 2);
  IF v_pot <= 0 OR v_n = 0 THEN
    RETURN jsonb_build_object('date', p_date, 'status', 'empty', 'profit', v_total);
  END IF;

  IF v_n > 3 THEN
    -- Rounded down to the cent; the remainder goes to Secret Santa below.
    v_others := FLOOR(v_pot * 0.10 * 100 / (v_n - 3)) / 100;
  END IF;

  FOR r IN
    SELECT s.id, s.affiliate_id, s.profit_generated,
           ROW_NUMBER() OVER (ORDER BY s.profit_generated DESC, s.affiliate_id) AS rnk
    FROM king_midas_daily_stats s
    WHERE s.date = p_date AND s.profit_generated > 0
  LOOP
    v_amount := CASE r.rnk
      WHEN 1 THEN ROUND(v_pot * 0.50, 2)
      WHEN 2 THEN ROUND(v_pot * 0.30, 2)
      WHEN 3 THEN ROUND(v_pot * 0.10, 2)
      ELSE v_others END;

    UPDATE king_midas_daily_stats SET rank = r.rnk, pool_share = v_amount, updated_at = NOW()
    WHERE id = r.id;

    IF v_amount > 0 THEN
      INSERT INTO king_midas_payouts (affiliate_id, date, rank, pool_amount, status)
      VALUES (r.affiliate_id, p_date, r.rnk, v_amount, 'pending');
      INSERT INTO affiliate_commissions (
        affiliate_id, order_id, amount, source, source_table, status, available_date, created_at
      ) VALUES (
        r.affiliate_id, NULL, v_amount, 'local', 'king_midas', 'approved', NOW(), NOW()
      );
      v_assigned := v_assigned + v_amount;
      v_winners := v_winners || jsonb_build_object('affiliate_id', r.affiliate_id, 'rank', r.rnk, 'amount', v_amount);
    END IF;
  END LOOP;

  v_leftover := v_pot - v_assigned;
  IF v_leftover > 0 THEN
    SELECT s.id INTO v_ss_pot FROM secret_santa_pot s WHERE s.year = v_year;
    IF v_ss_pot IS NULL THEN
      BEGIN
        INSERT INTO secret_santa_pot (year, total_amount) VALUES (v_year, 0) RETURNING id INTO v_ss_pot;
      EXCEPTION WHEN unique_violation THEN
        SELECT s.id INTO v_ss_pot FROM secret_santa_pot s WHERE s.year = v_year;
      END;
    END IF;
    INSERT INTO secret_santa_contributions (pot_id, commission_id, amount, reason)
    VALUES (v_ss_pot, NULL, v_leftover, 'king_midas_unassigned ' || p_date::TEXT);
    UPDATE secret_santa_pot SET total_amount = COALESCE(total_amount, 0) + v_leftover WHERE id = v_ss_pot;
  END IF;

  RETURN jsonb_build_object(
    'date', p_date, 'status', 'distributed', 'profit', v_total, 'pot', v_pot,
    'winners', v_winners, 'to_secret_santa', v_leftover
  );
END;
$$;

CREATE OR REPLACE FUNCTION distribute_secret_santa(p_year INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today       DATE := (NOW() AT TIME ZONE 'America/Chicago')::DATE;
  v_pot         RECORD;
  v_total_pts   BIGINT;
  v_amount      NUMERIC(12,2);
  v_assigned    NUMERIC(12,2) := 0;
  v_leftover    NUMERIC(12,2);
  v_next_pot    UUID;
  r             RECORD;
  v_paid        JSONB := '[]'::jsonb;
BEGIN
  IF p_year IS NULL THEN
    RAISE EXCEPTION 'year is required';
  END IF;
  IF v_today < MAKE_DATE(p_year, 12, 25) THEN
    RAISE EXCEPTION 'Secret Santa % pays on Dec 25 (Central today is %)', p_year, v_today;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('secret_santa:' || p_year::TEXT));

  SELECT * INTO v_pot FROM secret_santa_pot WHERE year = p_year FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('year', p_year, 'status', 'no_pot');
  END IF;
  IF v_pot.distributed THEN
    RETURN jsonb_build_object('year', p_year, 'status', 'already_distributed',
                              'distribution_date', v_pot.distribution_date);
  END IF;
  IF COALESCE(v_pot.total_amount, 0) <= 0 THEN
    RETURN jsonb_build_object('year', p_year, 'status', 'empty');
  END IF;

  -- Reward points earned during the year (Central), active affiliates only.
  CREATE TEMP TABLE _ss_points ON COMMIT DROP AS
    SELECT h.affiliate_id, SUM(h.points)::BIGINT AS pts
    FROM reward_points_history h
    JOIN affiliates a ON a.id = h.affiliate_id AND a.status = 'active'
    WHERE EXTRACT(YEAR FROM ((h.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')) = p_year
    GROUP BY h.affiliate_id
    HAVING SUM(h.points) > 0;

  SELECT COALESCE(SUM(pts), 0) INTO v_total_pts FROM _ss_points;
  IF v_total_pts = 0 THEN
    RETURN jsonb_build_object('year', p_year, 'status', 'no_eligible_affiliates',
                              'pot', v_pot.total_amount);
  END IF;

  FOR r IN SELECT * FROM _ss_points ORDER BY pts DESC, affiliate_id LOOP
    -- Rounded down to the cent; remainder carries into next year's pot.
    v_amount := FLOOR(v_pot.total_amount * r.pts * 100 / v_total_pts) / 100;
    IF v_amount > 0 THEN
      INSERT INTO affiliate_commissions (
        affiliate_id, order_id, amount, source, source_table, status, available_date, created_at
      ) VALUES (
        r.affiliate_id, NULL, v_amount, 'local', 'secret_santa', 'approved', NOW(), NOW()
      );
      v_assigned := v_assigned + v_amount;
      v_paid := v_paid || jsonb_build_object('affiliate_id', r.affiliate_id, 'points', r.pts, 'amount', v_amount);
    END IF;
  END LOOP;

  v_leftover := v_pot.total_amount - v_assigned;
  IF v_leftover > 0 THEN
    SELECT s.id INTO v_next_pot FROM secret_santa_pot s WHERE s.year = p_year + 1;
    IF v_next_pot IS NULL THEN
      INSERT INTO secret_santa_pot (year, total_amount) VALUES (p_year + 1, 0) RETURNING id INTO v_next_pot;
    END IF;
    INSERT INTO secret_santa_contributions (pot_id, commission_id, amount, reason)
    VALUES (v_next_pot, NULL, v_leftover, 'carryover from ' || p_year::TEXT);
    UPDATE secret_santa_pot SET total_amount = COALESCE(total_amount, 0) + v_leftover WHERE id = v_next_pot;
  END IF;

  UPDATE secret_santa_pot SET distributed = TRUE, distribution_date = v_today WHERE id = v_pot.id;

  RETURN jsonb_build_object(
    'year', p_year, 'status', 'distributed', 'pot', v_pot.total_amount,
    'total_points', v_total_pts, 'paid', v_paid, 'carried_to_next_year', v_leftover
  );
END;
$$;

REVOKE ALL ON FUNCTION distribute_king_midas(DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION distribute_secret_santa(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION distribute_king_midas(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION distribute_secret_santa(INTEGER) TO service_role;
