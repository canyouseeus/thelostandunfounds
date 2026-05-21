-- Adds a second Stripe payment link so invoices can offer both
-- "pay deposit" and "pay full amount" options side-by-side.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_full_payment_link_url TEXT;

COMMENT ON COLUMN invoices.stripe_full_payment_link_url IS
  'Optional Stripe payment link URL that charges the full project total (vs stripe_payment_link_url which may charge only a deposit)';
