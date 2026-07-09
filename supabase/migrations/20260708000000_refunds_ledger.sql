-- refunds: append-only ledger of Stripe charge.refunded events.
-- The webhook previously logged refunds to the console and discarded them,
-- so admins had no way to see money going back out. This table is the
-- single place all refunds (shop, gallery, booking, event) land, matched
-- best-effort back to the originating order via the Checkout Session.
--
-- We deliberately don't overwrite existing order-table status columns for
-- gallery/booking rows here (their CHECK constraints aren't guaranteed to
-- allow 'refunded'); shop_orders already supports it and is updated in the
-- webhook handler directly.

CREATE TABLE IF NOT EXISTS refunds (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_charge_id      TEXT NOT NULL,
    stripe_payment_intent TEXT,
    source                TEXT NOT NULL DEFAULT 'unknown'
                            CHECK (source IN ('shop', 'gallery', 'booking', 'event', 'unknown')),
    source_id             TEXT,
    amount_cents          INTEGER NOT NULL,
    currency              TEXT NOT NULL DEFAULT 'usd',
    reason                TEXT,
    customer_email        TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS refunds_charge_id_idx ON refunds (stripe_charge_id);
CREATE INDEX IF NOT EXISTS refunds_source_idx ON refunds (source, source_id);
CREATE INDEX IF NOT EXISTS refunds_created_at_idx ON refunds (created_at);
