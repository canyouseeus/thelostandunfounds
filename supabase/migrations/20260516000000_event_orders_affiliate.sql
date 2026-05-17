-- Event orders: tracks paid ticket purchases routed through Stripe
-- so the webhook can finalize them and attribute affiliate commissions.

CREATE TABLE IF NOT EXISTS event_orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stripe_session_id    TEXT,                        -- stamped after Stripe session is created
  user_id              UUID,                        -- auth.uid() at purchase time (nullable for guest)
  customer_email       TEXT NOT NULL,
  customer_name        TEXT,
  tier_id              TEXT,                        -- ticket_tiers.id, null for flat-price events
  quantity             INT NOT NULL DEFAULT 1,
  amount_cents         INT NOT NULL,                -- total charged (quantity × tier or flat price)
  affiliate_ref        TEXT,                        -- affiliate_code cookie at checkout time
  form_responses       JSONB,                       -- custom-form answers (stored here, copied to tickets)
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','paid','failed','expired')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for webhook lookup by session id
CREATE INDEX IF NOT EXISTS event_orders_stripe_session_idx
  ON event_orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Index for admin/affiliate queries
CREATE INDEX IF NOT EXISTS event_orders_event_id_idx ON event_orders (event_id);
CREATE INDEX IF NOT EXISTS event_orders_affiliate_ref_idx
  ON event_orders (affiliate_ref)
  WHERE affiliate_ref IS NOT NULL;

-- Add affiliate_ref to event_tickets so we can always trace which affiliate
-- was credited for a particular ticket, independent of the order row.
ALTER TABLE event_tickets
  ADD COLUMN IF NOT EXISTS affiliate_ref TEXT,
  ADD COLUMN IF NOT EXISTS event_order_id UUID REFERENCES event_orders(id);

-- Row-level security: service role can do anything; authenticated users can
-- only read their own orders.
ALTER TABLE event_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_event_orders"
  ON event_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_all_event_orders"
  ON event_orders FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_event_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER event_orders_updated_at
  BEFORE UPDATE ON event_orders
  FOR EACH ROW EXECUTE FUNCTION set_event_orders_updated_at();
