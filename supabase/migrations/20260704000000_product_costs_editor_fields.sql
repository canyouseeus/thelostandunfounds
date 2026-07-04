-- Extend product_costs to back the Shopify-style product editor in
-- ProductCostManagement.tsx. product_costs is already the per-product_id
-- override row (unique per product_id/variant_id/source), so it doubles as
-- the persisted "product details" record — NULL columns fall back to the
-- SERVICE_PRODUCTS default at read time.
ALTER TABLE product_costs ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE product_costs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE product_costs ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) CHECK (price IS NULL OR price >= 0);
ALTER TABLE product_costs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE product_costs ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE product_costs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft'));
