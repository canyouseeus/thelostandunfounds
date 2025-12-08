-- ============================================
-- ADD ALL MISSING COLUMNS TO PRODUCTS TABLE
-- ============================================
-- This script adds ALL required columns if they don't exist
-- Run this in Supabase SQL Editor

-- Add title column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'title'
  ) THEN
    ALTER TABLE products ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add description column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'description'
  ) THEN
    ALTER TABLE products ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add price column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'price'
  ) THEN
    ALTER TABLE products ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0);
  END IF;
END $$;

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

-- Add compare_at_price column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'compare_at_price'
  ) THEN
    ALTER TABLE products ADD COLUMN compare_at_price DECIMAL(10,2) CHECK (compare_at_price >= 0);
  END IF;
END $$;

-- Add currency column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'currency'
  ) THEN
    ALTER TABLE products ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
  END IF;
END $$;

-- Add images column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'images'
  ) THEN
    ALTER TABLE products ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add available column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'available'
  ) THEN
    ALTER TABLE products ADD COLUMN available BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'status'
  ) THEN
    ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived'));
  END IF;
END $$;

-- Add category column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    ALTER TABLE products ADD COLUMN category TEXT;
  END IF;
END $$;

-- Add featured column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'featured'
  ) THEN
    ALTER TABLE products ADD COLUMN featured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE products ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE products ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE products ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available) WHERE available = true;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

