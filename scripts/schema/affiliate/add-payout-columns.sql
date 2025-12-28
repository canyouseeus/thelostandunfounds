-- ============================================
-- ADD PAYOUT COLUMNS TO AFFILIATES TABLE
-- ============================================
-- Adds paypal_email and payment_threshold columns
-- Run this in Supabase SQL Editor

-- Add paypal_email column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliates' AND column_name = 'paypal_email'
  ) THEN
    ALTER TABLE affiliates ADD COLUMN paypal_email TEXT;
    COMMENT ON COLUMN affiliates.paypal_email IS 'PayPal email address for receiving payouts';
  END IF;
END $$;

-- Add payment_threshold column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliates' AND column_name = 'payment_threshold'
  ) THEN
    ALTER TABLE affiliates ADD COLUMN payment_threshold DECIMAL(10,2) DEFAULT 50.00 CHECK (payment_threshold >= 0);
    COMMENT ON COLUMN affiliates.payment_threshold IS 'Minimum earnings amount before payout can be requested (default: $50.00)';
  END IF;
END $$;

-- Handle code vs affiliate_code column name inconsistency
DO $$ 
BEGIN
  -- If affiliate_code exists but code doesn't, add code column and sync data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliates' AND column_name = 'affiliate_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliates' AND column_name = 'code'
  ) THEN
    -- Add 'code' column
    ALTER TABLE affiliates ADD COLUMN code TEXT;
    -- Copy data from affiliate_code to code
    UPDATE affiliates SET code = affiliate_code WHERE code IS NULL;
    -- Make code unique (if not already)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_code_unique ON affiliates(code) WHERE code IS NOT NULL;
  END IF;
  
  -- If code exists but affiliate_code doesn't, add affiliate_code column and sync data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliates' AND column_name = 'code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliates' AND column_name = 'affiliate_code'
  ) THEN
    -- Add 'affiliate_code' column
    ALTER TABLE affiliates ADD COLUMN affiliate_code TEXT;
    -- Copy data from code to affiliate_code
    UPDATE affiliates SET affiliate_code = code WHERE affiliate_code IS NULL;
    -- Make affiliate_code unique (if not already)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_affiliate_code_unique ON affiliates(affiliate_code) WHERE affiliate_code IS NOT NULL;
  END IF;
END $$;

-- Verify columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'affiliates'
  AND column_name IN ('paypal_email', 'payment_threshold', 'code', 'affiliate_code')
ORDER BY column_name;

