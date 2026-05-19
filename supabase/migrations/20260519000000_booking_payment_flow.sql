-- Booking payment flow: quote → 50% deposit → final invoice → balance.
-- Idempotent — safe to re-run.

-- ── bookings: deposit tracking + 'deposit_paid' status ───────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deposit_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS deposit_paid_at      TIMESTAMPTZ;

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
    CHECK (status IN ('pending','confirmed','deposit_paid','declined','cancelled','completed','paid'));

-- ── invoices: quote/final typing + Stripe payment link ───────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type            TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS amount_due              NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS stripe_payment_link_id  TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_token               TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'invoices' AND constraint_name = 'invoices_invoice_type_check'
  ) THEN
    EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT invoices_invoice_type_check';
  END IF;
END $$;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_invoice_type_check
    CHECK (invoice_type IN ('standard','quote','final'));

-- Webhook matches a paid Stripe session back to its invoice via this column.
CREATE INDEX IF NOT EXISTS invoices_payment_link_id_idx
  ON invoices (stripe_payment_link_id);

COMMENT ON COLUMN invoices.invoice_type IS 'standard = legacy/manual; quote = deposit request; final = balance request';
COMMENT ON COLUMN invoices.amount_due IS 'What this invoice''s payment link actually charges (deposit or balance), vs total = full project price';
COMMENT ON COLUMN invoices.pdf_token IS 'Random token guarding the public /api/invoices/pdf endpoint';
