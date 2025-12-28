-- ============================================
-- Seed 50 Affiliate Test Data
-- ============================================
-- Run this AFTER affiliate schema is set up
-- This creates 50 test affiliates with realistic data

-- Clear existing test data (optional - uncomment if needed)
-- DELETE FROM king_midas_payouts WHERE affiliate_id IN (SELECT id FROM affiliates WHERE code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)');
-- DELETE FROM king_midas_daily_stats WHERE affiliate_id IN (SELECT id FROM affiliates WHERE code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)');
-- DELETE FROM affiliate_commissions WHERE affiliate_id IN (SELECT id FROM affiliates WHERE code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)');
-- DELETE FROM affiliates WHERE code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)';

-- ============================================
-- STEP 1: Make user_id nullable for testing
-- ============================================
ALTER TABLE affiliates ALTER COLUMN user_id DROP NOT NULL;

-- ============================================
-- STEP 2: Create 50 test affiliates
-- ============================================
INSERT INTO affiliates (user_id, code, status, commission_rate, total_earnings, total_clicks, total_conversions) VALUES
-- Top Tier (5)
(NULL, 'KING01', 'active', 42.00, 2850.00, 1520, 98),
(NULL, 'KING02', 'active', 42.00, 2620.00, 1380, 89),
(NULL, 'KING03', 'active', 42.00, 2280.00, 1240, 82),
(NULL, 'KING04', 'active', 42.00, 1950.00, 1080, 74),
(NULL, 'KING05', 'active', 42.00, 1720.00, 920, 68),

-- High Tier (10)
(NULL, 'PRO01', 'active', 42.00, 1450.00, 820, 62),
(NULL, 'PRO02', 'active', 42.00, 1320.00, 760, 58),
(NULL, 'PRO03', 'active', 42.00, 1200.00, 680, 54),
(NULL, 'PRO04', 'active', 42.00, 1120.00, 640, 51),
(NULL, 'PRO05', 'active', 42.00, 1050.00, 600, 48),
(NULL, 'PRO06', 'active', 42.00, 980.00, 560, 45),
(NULL, 'PRO07', 'active', 42.00, 920.00, 520, 42),
(NULL, 'PRO08', 'active', 42.00, 870.00, 490, 39),
(NULL, 'PRO09', 'active', 42.00, 830.00, 470, 37),
(NULL, 'PRO10', 'active', 42.00, 800.00, 450, 35),

-- Mid Tier (15)
(NULL, 'MID01', 'active', 42.00, 760.00, 420, 32),
(NULL, 'MID02', 'active', 42.00, 720.00, 400, 30),
(NULL, 'MID03', 'active', 42.00, 680.00, 380, 28),
(NULL, 'MID04', 'active', 42.00, 640.00, 360, 26),
(NULL, 'MID05', 'active', 42.00, 600.00, 340, 24),
(NULL, 'MID06', 'active', 42.00, 570.00, 320, 23),
(NULL, 'MID07', 'active', 42.00, 540.00, 310, 22),
(NULL, 'MID08', 'active', 42.00, 510.00, 290, 21),
(NULL, 'MID09', 'active', 42.00, 480.00, 280, 20),
(NULL, 'MID10', 'active', 42.00, 460.00, 270, 19),
(NULL, 'MID11', 'active', 42.00, 440.00, 260, 18),
(NULL, 'MID12', 'active', 42.00, 420.00, 250, 17),
(NULL, 'MID13', 'active', 42.00, 400.00, 240, 16),
(NULL, 'MID14', 'active', 42.00, 380.00, 230, 15),
(NULL, 'MID15', 'active', 42.00, 360.00, 220, 14),

-- New Tier (18)
(NULL, 'NEW01', 'active', 42.00, 340.00, 210, 13),
(NULL, 'NEW02', 'active', 42.00, 320.00, 200, 12),
(NULL, 'NEW03', 'active', 42.00, 300.00, 190, 11),
(NULL, 'NEW04', 'active', 42.00, 280.00, 180, 10),
(NULL, 'NEW05', 'active', 42.00, 260.00, 170, 9),
(NULL, 'NEW06', 'active', 42.00, 240.00, 160, 8),
(NULL, 'NEW07', 'active', 42.00, 220.00, 150, 8),
(NULL, 'NEW08', 'active', 42.00, 200.00, 140, 7),
(NULL, 'NEW09', 'active', 42.00, 185.00, 130, 7),
(NULL, 'NEW10', 'active', 42.00, 170.00, 120, 6),
(NULL, 'NEW11', 'active', 42.00, 155.00, 110, 6),
(NULL, 'NEW12', 'active', 42.00, 140.00, 100, 5),
(NULL, 'NEW13', 'active', 42.00, 125.00, 90, 5),
(NULL, 'NEW14', 'active', 42.00, 110.00, 80, 4),
(NULL, 'NEW15', 'active', 42.00, 95.00, 70, 4),
(NULL, 'NEW16', 'active', 42.00, 80.00, 60, 3),
(NULL, 'NEW17', 'active', 42.00, 65.00, 50, 3),
(NULL, 'NEW18', 'active', 42.00, 50.00, 40, 2),

-- Special Cases (2)
(NULL, 'INACTIVE', 'inactive', 42.00, 0, 0, 0),
(NULL, 'SUSPEND', 'suspended', 42.00, 180.00, 140, 9);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that all 50 affiliates were created
SELECT 
  'Affiliates Created' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 50 THEN 'PASS' ELSE 'FAIL' END as status
FROM affiliates 
WHERE code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)';

-- Show top 10
SELECT 
  ROW_NUMBER() OVER (ORDER BY total_earnings DESC) as rank,
  code,
  status,
  commission_rate,
  total_earnings,
  total_conversions
FROM affiliates 
WHERE status = 'active'
  AND code ~ '^(KING|PRO|MID|NEW)'
ORDER BY total_earnings DESC 
LIMIT 10;

