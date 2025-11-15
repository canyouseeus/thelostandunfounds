-- Affiliate Program Database Schema
-- Run this in Supabase SQL Editor after the main database-schema.sql

-- Affiliates table (users who are affiliates)
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE, -- Unique referral code (e.g., "AFF123")
  paypal_email TEXT, -- PayPal email for payouts
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 50.00, -- Percentage (50% default)
  total_earnings DECIMAL(10, 2) DEFAULT 0.00, -- Total earned (before payouts)
  total_paid DECIMAL(10, 2) DEFAULT 0.00, -- Total paid out
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Referrals table (tracks signups via affiliate links)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  signup_date TIMESTAMP DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE, -- Whether they became a paying customer
  conversion_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(affiliate_id, referred_user_id)
);

-- Commissions table (tracks individual commission earnings)
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES platform_subscriptions(id) ON DELETE SET NULL,
  revenue DECIMAL(10, 2) NOT NULL, -- Subscription revenue
  costs DECIMAL(10, 2) DEFAULT 0.00, -- Associated costs
  profit DECIMAL(10, 2) NOT NULL, -- revenue - costs
  commission_rate DECIMAL(5, 2) NOT NULL, -- Percentage at time of commission
  commission_amount DECIMAL(10, 2) NOT NULL, -- profit * commission_rate / 100
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP,
  payout_id TEXT, -- PayPal payout transaction ID
  period_start TIMESTAMP NOT NULL, -- Subscription period start
  period_end TIMESTAMP NOT NULL, -- Subscription period end
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Costs table (tracks operational costs for commission calculations)
CREATE TABLE IF NOT EXISTS subscription_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES platform_subscriptions(id) ON DELETE CASCADE NOT NULL,
  cost_type TEXT NOT NULL, -- 'payment_processing', 'infrastructure', 'support', etc.
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subscription_id, cost_type, period_start, period_end)
);

-- Marketing materials table (affiliate resources)
CREATE TABLE IF NOT EXISTS marketing_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL CHECK (material_type IN ('banner', 'email_template', 'social_post', 'landing_page', 'other')),
  content TEXT, -- HTML content, text, or JSON
  file_url TEXT, -- URL to file if applicable
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expose tables via PostgREST API
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS affiliates;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS referrals;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS commissions;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS subscription_costs;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS marketing_materials;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON affiliates TO anon, authenticated;
GRANT ALL ON referrals TO anon, authenticated;
GRANT ALL ON commissions TO anon, authenticated;
GRANT ALL ON subscription_costs TO anon, authenticated;
GRANT ALL ON marketing_materials TO anon, authenticated;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id ON commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_referral_id ON commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_subscription_costs_subscription_id ON subscription_costs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_marketing_materials_type ON marketing_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_marketing_materials_active ON marketing_materials(is_active);

-- Row Level Security (RLS) Policies

-- Affiliates: Users can only see their own affiliate record
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own affiliate record" ON affiliates;
DROP POLICY IF EXISTS "Users can insert their own affiliate record" ON affiliates;
DROP POLICY IF EXISTS "Users can update their own affiliate record" ON affiliates;
DROP POLICY IF EXISTS "Public can view referral codes" ON affiliates;

CREATE POLICY "Users can view their own affiliate record"
  ON affiliates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own affiliate record"
  ON affiliates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate record"
  ON affiliates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view referral codes"
  ON affiliates
  FOR SELECT
  USING (status = 'active');

-- Referrals: Affiliates can see their referrals, users can see if they were referred
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view their referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view their referral info" ON referrals;
DROP POLICY IF EXISTS "Public can insert referrals" ON referrals;

CREATE POLICY "Affiliates can view their referrals"
  ON referrals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates 
      WHERE affiliates.id = referrals.affiliate_id 
      AND affiliates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their referral info"
  ON referrals
  FOR SELECT
  USING (auth.uid() = referred_user_id);

CREATE POLICY "Public can insert referrals"
  ON referrals
  FOR INSERT
  WITH CHECK (true); -- Allow signup tracking

-- Commissions: Affiliates can see their commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view their commissions" ON commissions;

CREATE POLICY "Affiliates can view their commissions"
  ON commissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates 
      WHERE affiliates.id = commissions.affiliate_id 
      AND affiliates.user_id = auth.uid()
    )
  );

-- Subscription costs: Admin only (no RLS for now, can add admin check later)
ALTER TABLE subscription_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view subscription costs" ON subscription_costs;

CREATE POLICY "Anyone can view subscription costs"
  ON subscription_costs
  FOR SELECT
  USING (true);

-- Marketing materials: Public read access
ALTER TABLE marketing_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active marketing materials" ON marketing_materials;

CREATE POLICY "Anyone can view active marketing materials"
  ON marketing_materials
  FOR SELECT
  USING (is_active = TRUE);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random code: AFF + 6 random alphanumeric characters
    code := 'AFF' || upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM affiliates WHERE referral_code = code) INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate commission
CREATE OR REPLACE FUNCTION calculate_commission(
  p_revenue DECIMAL,
  p_costs DECIMAL,
  p_commission_rate DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  -- Commission = (revenue - costs) * commission_rate / 100
  RETURN GREATEST(0, (p_revenue - COALESCE(p_costs, 0)) * p_commission_rate / 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update affiliates.updated_at
DROP TRIGGER IF EXISTS update_affiliates_updated_at ON affiliates;
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update commissions.updated_at
DROP TRIGGER IF EXISTS update_commissions_updated_at ON commissions;
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update marketing_materials.updated_at
DROP TRIGGER IF EXISTS update_marketing_materials_updated_at ON marketing_materials;
CREATE TRIGGER update_marketing_materials_updated_at
  BEFORE UPDATE ON marketing_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update affiliate total_earnings when commission is created
CREATE OR REPLACE FUNCTION update_affiliate_earnings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE affiliates
    SET total_earnings = total_earnings + NEW.commission_amount
    WHERE id = NEW.affiliate_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'paid' THEN
    -- Commission was paid
    UPDATE affiliates
    SET total_paid = total_paid + NEW.commission_amount
    WHERE id = NEW.affiliate_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment affiliate paid amount (for manual payouts)
CREATE OR REPLACE FUNCTION increment_affiliate_paid(
  p_affiliate_id UUID,
  p_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliates
  SET total_paid = total_paid + p_amount
  WHERE id = p_affiliate_id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_affiliate_earnings ON commissions;
CREATE TRIGGER trigger_update_affiliate_earnings
  AFTER INSERT OR UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_earnings();
