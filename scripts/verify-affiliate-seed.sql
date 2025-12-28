-- Verification Script for Affiliate Seed Data
-- Run this to confirm all 50 affiliates and related data were created

-- ============================================
-- 1. COUNT TOTAL AFFILIATES
-- ============================================
SELECT 
  'Total Affiliates' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 50 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM affiliates 
WHERE code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)';

-- ============================================
-- 2. TOP 10 AFFILIATES BY EARNINGS
-- ============================================
SELECT 
  ROW_NUMBER() OVER (ORDER BY total_earnings DESC) as rank,
  code,
  status,
  commission_rate,
  total_earnings,
  total_conversions,
  total_clicks
FROM affiliates 
WHERE status = 'active'
  AND code ~ '^(KING|PRO|MID|NEW)'
ORDER BY total_earnings DESC 
LIMIT 10;

-- ============================================
-- 3. BREAKDOWN BY TIER
-- ============================================
SELECT 
  CASE 
    WHEN code ~ '^KING' THEN 'Top Tier (KING)'
    WHEN code ~ '^PRO' THEN 'High Tier (PRO)'
    WHEN code ~ '^MID' THEN 'Mid Tier (MID)'
    WHEN code ~ '^NEW' THEN 'New Tier (NEW)'
    ELSE 'Special Cases'
  END as tier,
  COUNT(*) as count,
  SUM(total_earnings) as total_earnings,
  AVG(total_earnings) as avg_earnings,
  SUM(total_conversions) as total_conversions
FROM affiliates
WHERE code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)'
GROUP BY tier
ORDER BY avg_earnings DESC;

-- ============================================
-- 4. CHECK COMMISSIONS CREATED
-- ============================================
SELECT 
  'Total Commissions' as check_name,
  COUNT(*) as count,
  SUM(amount) as total_commission_amount,
  SUM(profit_generated) as total_profit,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
WHERE a.code ~ '^(KING|PRO|MID|NEW)';

-- ============================================
-- 5. CHECK KING MIDAS DAILY STATS FOR TODAY
-- ============================================
SELECT 
  'Today King Midas Rankings' as check_name,
  COUNT(*) as count,
  SUM(profit_generated) as total_profit,
  ROUND(SUM(profit_generated) * 0.08, 2) as king_midas_pot,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '⚠️ WARNING - No data for today' END as status
FROM king_midas_daily_stats kds
JOIN affiliates a ON kds.affiliate_id = a.id
WHERE kds.date = CURRENT_DATE
  AND a.code ~ '^(KING|PRO|MID|NEW)';

-- ============================================
-- 6. TODAY'S TOP 10 KING MIDAS RANKINGS
-- ============================================
SELECT 
  kds.rank,
  a.code,
  ROUND(kds.profit_generated, 2) as profit_generated,
  ROUND(kds.pool_share, 2) as pool_share
FROM king_midas_daily_stats kds
JOIN affiliates a ON kds.affiliate_id = a.id
WHERE kds.date = CURRENT_DATE
ORDER BY kds.rank ASC
LIMIT 10;

-- ============================================
-- 7. CHECK KING MIDAS PAYOUTS
-- ============================================
SELECT 
  'King Midas Payouts' as check_name,
  COUNT(*) as count,
  SUM(pool_amount) as total_payout_amount,
  COUNT(DISTINCT date) as days_with_payouts,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM king_midas_payouts kp
JOIN affiliates a ON kp.affiliate_id = a.id
WHERE a.code ~ '^(KING|PRO|MID|NEW)';

-- ============================================
-- 8. RECENT COMMISSIONS (LAST 10)
-- ============================================
SELECT 
  a.code,
  ROUND(ac.amount, 2) as commission,
  ROUND(ac.profit_generated, 2) as profit,
  ac.status,
  ac.source,
  DATE(ac.created_at) as date
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
WHERE a.code ~ '^(KING|PRO|MID|NEW)'
ORDER BY ac.created_at DESC
LIMIT 10;

-- ============================================
-- 9. SUMMARY STATS
-- ============================================
SELECT 
  COUNT(DISTINCT a.id) as total_affiliates,
  COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.id END) as active_affiliates,
  COUNT(DISTINCT ac.id) as total_commissions,
  ROUND(SUM(ac.amount), 2) as total_commission_amount,
  ROUND(SUM(ac.profit_generated), 2) as total_profit,
  COUNT(DISTINCT kds.date) as days_with_rankings,
  COUNT(DISTINCT kp.id) as total_payouts,
  ROUND(SUM(kp.pool_amount), 2) as total_payout_amount
FROM affiliates a
LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id
LEFT JOIN king_midas_daily_stats kds ON a.id = kds.affiliate_id
LEFT JOIN king_midas_payouts kp ON a.id = kp.affiliate_id
WHERE a.code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)';

-- ============================================
-- 10. CHECK SPECIAL CASES
-- ============================================
SELECT 
  code,
  status,
  total_earnings,
  total_conversions,
  CASE 
    WHEN code = 'INACTIVE' AND status = 'inactive' AND total_earnings = 0 THEN '✅ PASS'
    WHEN code = 'SUSPEND' AND status = 'suspended' AND total_earnings > 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status_check
FROM affiliates
WHERE code IN ('INACTIVE', 'SUSPEND');



