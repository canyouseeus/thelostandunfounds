-- ============================================
-- VERIFY PAYMENT SUCCESS & COMMISSION TRACKING
-- ============================================
-- Run this after a successful payment to verify everything worked

-- 1. Check if commission was created
SELECT 
  ac.id,
  ac.order_id,
  ac.amount as commission_amount,
  ac.profit_generated,
  ac.product_cost,
  ac.status,
  ac.source,
  ac.created_at,
  a.code as affiliate_code,
  a.commission_rate
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
ORDER BY ac.created_at DESC
LIMIT 5;

-- 2. Check affiliate totals were updated
SELECT 
  code,
  total_earnings,
  total_conversions,
  total_clicks,
  reward_points,
  paypal_email,
  payment_threshold,
  CASE 
    WHEN total_earnings >= payment_threshold THEN '✅ Eligible for Payout'
    ELSE CONCAT('❌ Need $', (payment_threshold - total_earnings)::text, ' more')
  END as payout_status
FROM affiliates
WHERE code IN (SELECT DISTINCT a.code FROM affiliate_commissions ac JOIN affiliates a ON ac.affiliate_id = a.id ORDER BY ac.created_at DESC LIMIT 1)
ORDER BY total_earnings DESC;

-- 3. Check if customer was tied to affiliate
SELECT 
  ac.email,
  a.code as affiliate_code,
  ac.total_purchases,
  ac.total_profit_generated,
  ac.first_purchase_date,
  ac.last_purchase_date
FROM affiliate_customers ac
JOIN affiliates a ON ac.referred_by_affiliate_id = a.id
ORDER BY ac.last_purchase_date DESC
LIMIT 5;

-- 4. Check MLM earnings (if applicable)
SELECT 
  me.level,
  me.amount,
  a.code as affiliate_code,
  me.created_at
FROM mlm_earnings me
JOIN affiliates a ON me.affiliate_id = a.id
ORDER BY me.created_at DESC
LIMIT 10;

-- 5. Check reward points history
SELECT 
  rph.points,
  rph.profit_amount,
  rph.source,
  rph.description,
  a.code as affiliate_code,
  rph.created_at
FROM reward_points_history rph
JOIN affiliates a ON rph.affiliate_id = a.id
ORDER BY rph.created_at DESC
LIMIT 10;

-- 6. Summary: All commissions by status
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM affiliate_commissions
GROUP BY status
ORDER BY status;

