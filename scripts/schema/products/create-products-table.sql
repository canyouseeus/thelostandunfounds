-- ============================================
-- PRODUCTS TABLE
-- ============================================
-- Native products for the shop (not Fourthwall)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handle TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price DECIMAL(10,2) CHECK (compare_at_price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
  available BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  category TEXT,
  featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional product data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available) WHERE available = true;

-- RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products (public)
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  USING (status = 'active');

-- Only authenticated users can insert/update/delete (admin only)
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON products TO anon, authenticated;
GRANT ALL ON products TO authenticated;

-- Add comments
COMMENT ON TABLE products IS 'Native products for the shop (not Fourthwall)';
COMMENT ON COLUMN products.handle IS 'URL-friendly product identifier (e.g., "premium-subscription")';
COMMENT ON COLUMN products.images IS 'JSON array of image URLs: ["https://...", "https://..."]';
COMMENT ON COLUMN products.metadata IS 'Additional product data (variants, options, etc.)';

