-- Real Prodigi product data (fetched live via /api/prodigi/verify-catalog)
-- showed the classic frame line's "mount"/"mountColor" attributes each have
-- exactly one valid value (2.4mm / Snow white) — there's no "no mount"
-- option, so a customer-facing mat toggle was never a real choice and has
-- been removed from the checkout flow. "color" is the one real per-order
-- attribute (black is the only value used, per the noir-only brand scope),
-- computed once at checkout time (when the product/option row is already
-- loaded) and stored here so order finalization in the Stripe/Strike
-- webhooks can pass it straight through to Prodigi without a second lookup.

ALTER TABLE prodigi_orders
    ADD COLUMN IF NOT EXISTS order_attributes JSONB NOT NULL DEFAULT '{}';
