-- Prodigi bills the owner's card when an order is created, so a paid print
-- order now waits (status = 'paid') until the customer's payment settles.
-- The hourly /api/cron/prodigi-orders run submits it after funds_available_at.
ALTER TABLE public.prodigi_orders ADD COLUMN IF NOT EXISTS funds_available_at TIMESTAMPTZ;
COMMENT ON COLUMN public.prodigi_orders.funds_available_at IS 'When the customer payment settles (Stripe balance_transaction.available_on; payment time for Strike). Orders stay status=paid until then and the hourly prodigi-orders cron submits them to Prodigi.';
