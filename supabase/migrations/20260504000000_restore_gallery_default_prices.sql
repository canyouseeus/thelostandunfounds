-- Re-enable per-gallery pricing.
--
-- A previous migration (20260417000000_set_gallery_prices_free.sql) zeroed
-- every gallery's price as part of the free-credits experiment. Now that the
-- credits flow is being removed in favor of charging per photo through Stripe
-- (fiat) or Strike (BTC), we need a sensible non-zero default so the admin
-- doesn't have to seed each gallery from scratch and so checkout never falls
-- through to a $0 path.
--
-- $5/photo across the board is the historical default (matches AdminGalleryView
-- defaults for new galleries and pricing options). Admins can override per
-- gallery from the dashboard.
UPDATE photo_libraries
SET price = 5.00
WHERE price IS NULL OR price = 0;

UPDATE gallery_pricing_options
SET price = 5.00
WHERE (price IS NULL OR price = 0)
  AND photo_count = 1;
