-- Prodigi print-on-demand catalog + fulfillment orders.
--
-- prodigi_products: our print catalog. Each row is a ready-to-buy SKU
-- (size/variant baked in, matching the single-item checkout UX the shop
-- already uses for STRIPE_PRODUCTS) mapped to a specific Prodigi SKU.
--
-- prodigi_orders: one row per Prodigi fulfillment order. Decoupled from
-- shop_orders because a Prodigi order can originate from either the Stripe
-- checkout flow (shop_orders exists) or the Strike/Lightning flow (no
-- shop_orders row — Strike invoices aren't persisted anywhere today).

CREATE TABLE IF NOT EXISTS prodigi_products (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sku                  TEXT NOT NULL UNIQUE,
    slug                 TEXT NOT NULL UNIQUE,
    title                TEXT NOT NULL,
    description          TEXT,
    category             TEXT NOT NULL DEFAULT 'prints',
    image_url            TEXT,
    mockup_template_url  TEXT,
    mockup_bounds        JSONB,
    base_cost            NUMERIC(10,2) NOT NULL DEFAULT 0,
    price                NUMERIC(10,2) NOT NULL,
    currency             TEXT NOT NULL DEFAULT 'USD',
    attributes           JSONB NOT NULL DEFAULT '{}',
    shipping_method      TEXT NOT NULL DEFAULT 'Standard',
    featured             BOOLEAN NOT NULL DEFAULT false,
    status               TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('active', 'draft')),
    stripe_product_id    TEXT,
    stripe_price_id      TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prodigi_products_status_idx ON prodigi_products (status);

CREATE TABLE IF NOT EXISTS prodigi_orders (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_source       TEXT NOT NULL CHECK (payment_source IN ('stripe', 'strike')),
    payment_ref          TEXT NOT NULL UNIQUE,
    shop_order_id        UUID REFERENCES shop_orders(id),
    product_id           UUID REFERENCES prodigi_products(id),
    sku                  TEXT NOT NULL,
    copies               INTEGER NOT NULL DEFAULT 1,
    unit_cost            NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit_price           NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency             TEXT NOT NULL DEFAULT 'USD',
    customer_email       TEXT,
    recipient             JSONB NOT NULL DEFAULT '{}',
    asset_url            TEXT,
    affiliate_ref        TEXT,
    status               TEXT NOT NULL DEFAULT 'pending_payment'
                            CHECK (status IN (
                                'pending_payment', 'paid', 'submitted', 'in_production',
                                'shipped', 'complete', 'error', 'cancelled'
                            )),
    prodigi_order_id     TEXT,
    prodigi_status       JSONB,
    shipping_carrier     TEXT,
    tracking_number      TEXT,
    tracking_url         TEXT,
    error_message        TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at              TIMESTAMPTZ,
    submitted_at         TIMESTAMPTZ,
    shipped_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS prodigi_orders_status_idx        ON prodigi_orders (status);
CREATE INDEX IF NOT EXISTS prodigi_orders_customer_email_idx ON prodigi_orders (customer_email);
CREATE INDEX IF NOT EXISTS prodigi_orders_prodigi_order_id_idx ON prodigi_orders (prodigi_order_id);

CREATE OR REPLACE FUNCTION prodigi_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prodigi_products_updated_at ON prodigi_products;
CREATE TRIGGER prodigi_products_updated_at
    BEFORE UPDATE ON prodigi_products
    FOR EACH ROW EXECUTE FUNCTION prodigi_set_updated_at();

DROP TRIGGER IF EXISTS prodigi_orders_updated_at ON prodigi_orders;
CREATE TRIGGER prodigi_orders_updated_at
    BEFORE UPDATE ON prodigi_orders
    FOR EACH ROW EXECUTE FUNCTION prodigi_set_updated_at();

-- Service role writes; nothing public reads these directly (same policy
-- shape as shop_orders — API routes use the service role key).
ALTER TABLE prodigi_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE prodigi_orders ENABLE ROW LEVEL SECURITY;

-- ---------- Affiliate commissions: allow 'prodigi_order' as a source ----------
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT constraint_name INTO con_name
  FROM information_schema.table_constraints
  WHERE table_name = 'affiliate_commissions' AND constraint_name LIKE '%source_check%';
  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE affiliate_commissions DROP CONSTRAINT IF EXISTS ' || con_name;
  END IF;
END $$;

ALTER TABLE affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_source_check
    CHECK (source IN ('paypal', 'fourthwall', 'local', 'stripe', 'photo_order', 'booking', 'event_ticket', 'prodigi_order'));
