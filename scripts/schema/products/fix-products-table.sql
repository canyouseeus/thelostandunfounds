-- ============================================
-- FIX PRODUCTS TABLE
-- ============================================
-- Add missing columns if they don't exist
-- Run this in Supabase SQL Editor

-- Add handle column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'handle'
  ) THEN
    ALTER TABLE products ADD COLUMN handle TEXT UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
  END IF;
END $$;

-- Add other missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'compare_at_price'
  ) THEN
    ALTER TABLE products ADD COLUMN compare_at_price DECIMAL(10,2) CHECK (compare_at_price >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'currency'
  ) THEN
    ALTER TABLE products ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'images'
  ) THEN
    ALTER TABLE products ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'available'
  ) THEN
    ALTER TABLE products ADD COLUMN available BOOLEAN DEFAULT true;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'status'
  ) THEN
    ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    ALTER TABLE products ADD COLUMN category TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'featured'
  ) THEN
    ALTER TABLE products ADD COLUMN featured BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE products ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

