-- =====================================================
-- MLM REFERRAL SYSTEM: AFFILIATE CUSTOMERS TABLE
-- =====================================================
-- Description: Track lifetime customer-to-affiliate relationships
-- Part: 2/8 - Database Foundation
-- =====================================================

-- Create affiliate_customers table for lifetime tracking
CREATE TABLE IF NOT EXISTS affiliate_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  
  -- Tracking
  first_purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  total_purchases INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  total_commission_earned DECIMAL(10,2) DEFAULT 0.00,
  last_purchase_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  source TEXT, -- 'direct_link', 'discount_code', 'referral', etc.
  referral_code TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one customer can only be tied to one affiliate
  UNIQUE(customer_email)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_customers_affiliate_id 
ON affiliate_customers(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_customers_email 
ON affiliate_customers(customer_email);

CREATE INDEX IF NOT EXISTS idx_affiliate_customers_total_spent 
ON affiliate_customers(total_spent DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_customers_first_purchase 
ON affiliate_customers(first_purchase_date DESC);

-- Add comments
COMMENT ON TABLE affiliate_customers IS 'Tracks lifetime customer-to-affiliate relationships (42% commission forever)';
COMMENT ON COLUMN affiliate_customers.customer_email IS 'Customer email (unique - customer tied to ONE affiliate forever)';
COMMENT ON COLUMN affiliate_customers.total_commission_earned IS 'Total 42% commission earned from this customer';
COMMENT ON COLUMN affiliate_customers.source IS 'How customer was acquired (direct_link, discount_code, referral, etc.)';

-- Enable RLS
ALTER TABLE affiliate_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Affiliates can view their own customers"
ON affiliate_customers FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM affiliates WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role has full access"
ON affiliate_customers FOR ALL
USING (auth.role() = 'service_role');



