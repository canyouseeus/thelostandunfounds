-- Products table for custom product listings
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  currency TEXT NOT NULL DEFAULT 'USD',
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
  handle TEXT UNIQUE NOT NULL, -- URL-friendly slug
  available BOOLEAN DEFAULT true,
  fourthwall_product_id TEXT, -- Link to Fourthwall product if synced
  fourthwall_url TEXT, -- Link to product on Fourthwall
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Expose table via PostgREST API
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS products;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Grant permissions
GRANT ALL ON products TO anon, authenticated;

-- Row Level Security (RLS) Policies

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view available products" ON products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON products;
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Users can delete their own products" ON products;

-- Anyone can view available products
CREATE POLICY "Anyone can view available products"
  ON products
  FOR SELECT
  USING (available = true);

-- Authenticated users can create products
CREATE POLICY "Authenticated users can create products"
  ON products
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own products
CREATE POLICY "Users can update their own products"
  ON products
  FOR UPDATE
  USING (auth.uid() = created_by OR created_by IS NULL);

-- Users can delete their own products
CREATE POLICY "Users can delete their own products"
  ON products
  FOR DELETE
  USING (auth.uid() = created_by OR created_by IS NULL);

-- Trigger for updated_at timestamp
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
