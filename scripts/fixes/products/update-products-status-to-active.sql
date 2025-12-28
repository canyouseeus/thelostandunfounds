-- ============================================
-- Update Products Status to Active
-- ============================================
-- Quick fix: Update all products to status='active' so they show up in the shop
-- Run this in Supabase SQL Editor

UPDATE products 
SET status = 'active', updated_at = NOW()
WHERE status != 'active' OR status IS NULL;

-- Verify update
SELECT 
  handle,
  title,
  status,
  available,
  featured
FROM products
ORDER BY featured DESC, created_at DESC;

