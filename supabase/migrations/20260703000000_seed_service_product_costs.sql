-- Seed product_costs for the real service catalog (photography, web dev,
-- bundles, kiosk builds) so affiliate commissions can be calculated on
-- actual profit instead of gross price. Service businesses run high margins
-- (most of the price is labor), so costs are modest estimates covering
-- software licenses, equipment wear, stock assets, and misc supplies.
-- Source 'local' = sold directly by us (not paypal/fourthwall).
-- product_type 'digital' = no physical shipping/chargeback risk, 7-day hold.

-- product_type may not exist yet depending on whether
-- scripts/schema/affiliate/add-commission-safeguards.sql has been applied.
ALTER TABLE product_costs ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'physical';

-- variant_id is nullable and NULLs are never equal under a UNIQUE constraint,
-- so ON CONFLICT (product_id, variant_id, source) would never match these
-- rows on rerun. Use NOT EXISTS instead for real idempotency.
INSERT INTO product_costs (product_id, variant_id, source, cost, product_type)
SELECT v.product_id, NULL, 'local', v.cost, 'digital'
FROM (VALUES
  -- Photography (~10% cost — memory cards, editing software allocation, gear wear)
  ('photo-portrait',      25),
  ('photo-event',         60),
  ('photo-halfday',       80),
  ('photo-fullday',       140),

  -- Web development (~15% cost — template/stock licenses, hosting setup)
  ('webdev-starter',      225),
  ('webdev-professional', 525),
  ('webdev-agency',       900),
  ('webdev-maintenance',  30),

  -- Bundles (~10% cost, blended across the web + photo components)
  ('bundle-launch',       250),
  ('bundle-brand',        500),

  -- Kiosk build (~15% cost — software licensing, misc supplies; hardware billed separately)
  ('kiosk-build',         375)
) AS v(product_id, cost)
WHERE NOT EXISTS (
  SELECT 1 FROM product_costs pc
  WHERE pc.product_id = v.product_id
    AND pc.source = 'local'
    AND pc.variant_id IS NULL
);
