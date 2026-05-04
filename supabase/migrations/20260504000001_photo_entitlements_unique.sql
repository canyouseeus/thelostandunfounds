-- Make (order_id, photo_id) unique on photo_entitlements so the Stripe
-- webhook can safely upsert when finalizing photo orders. Webhook replays
-- (Stripe retries on 5xx) would otherwise grant duplicate entitlement rows.
ALTER TABLE photo_entitlements
  ADD CONSTRAINT photo_entitlements_order_photo_unique
  UNIQUE (order_id, photo_id);
