-- =====================================================
-- Street nights — field sales recorded once per night
-- =====================================================
-- Owner decisions, 2026-10-20:
--   * A street night (bar, event) is one entry at the end of the night:
--     totals by how people paid — Cash App, Venmo, Apple Pay, cash.
--   * Walk-up customers are plain business revenue: no affiliate split, no
--     King Midas or Secret Santa share.
--   * The owner's pay is 10% of the night, sent to his Stripe Connect
--     account (an `owner_pay` admin job). The business keeps 90%.
--
-- The money itself moves outside the app: the owner transfers the night's
-- Cash App / Venmo balance to the Business financial account (••0515).
-- =====================================================

CREATE TABLE IF NOT EXISTS field_sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  night            DATE NOT NULL,
  location         TEXT,
  cash_app         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cash_app >= 0),
  venmo            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (venmo >= 0),
  apple_pay        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (apple_pay >= 0),
  cash             NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cash >= 0),
  total            NUMERIC(12,2) GENERATED ALWAYS AS (cash_app + venmo + apple_pay + cash) STORED,
  sale_count       INTEGER CHECK (sale_count IS NULL OR sale_count >= 0),
  owner_pay        NUMERIC(12,2) NOT NULL CHECK (owner_pay >= 0),
  owner_pay_job_id UUID REFERENCES admin_jobs(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS field_sales_night_idx ON field_sales (night DESC);

ALTER TABLE field_sales ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'field_sales' AND policyname = 'field_sales_admin_all') THEN
    CREATE POLICY field_sales_admin_all ON field_sales FOR ALL USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'field_sales' AND policyname = 'field_sales_service_role_all') THEN
    CREATE POLICY field_sales_service_role_all ON field_sales FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
