-- shop_orders: one row per Stripe Checkout Session created by
-- /api/checkout/create-session. The webhook (checkout.session.completed)
-- flips status to 'paid' and stores the Stripe customer_id.
--
-- This table is separate from photo_orders because the shop sells physical
-- and bundled items (Mystery Box, merch) keyed by Stripe Price IDs, whereas
-- photo_orders is keyed to specific photo rows + entitlements.

CREATE TABLE IF NOT EXISTS shop_orders (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_session_id    TEXT NOT NULL UNIQUE,
    stripe_customer_id   TEXT,
    stripe_payment_intent TEXT,
    price_id             TEXT NOT NULL,
    product_id           TEXT,
    product_kind         TEXT NOT NULL DEFAULT 'physical'
                            CHECK (product_kind IN ('physical', 'digital')),
    quantity             INTEGER NOT NULL DEFAULT 1,
    amount_total_cents   INTEGER,
    currency             TEXT,
    customer_email       TEXT,
    affiliate_ref        TEXT,
    status               TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded')),
    metadata             JSONB NOT NULL DEFAULT '{}',
    paid_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shop_orders_status_idx        ON shop_orders (status);
CREATE INDEX IF NOT EXISTS shop_orders_customer_email_idx ON shop_orders (customer_email);
CREATE INDEX IF NOT EXISTS shop_orders_customer_id_idx   ON shop_orders (stripe_customer_id);

-- Keep updated_at fresh on row updates.
CREATE OR REPLACE FUNCTION shop_orders_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_orders_updated_at ON shop_orders;
CREATE TRIGGER shop_orders_updated_at
    BEFORE UPDATE ON shop_orders
    FOR EACH ROW EXECUTE FUNCTION shop_orders_set_updated_at();

-- Service role writes; nothing public reads this directly (the success page
-- looks up by session_id through an API route using the service role key).
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
