-- ============================================
-- CREATE CLICK TRACKING FUNCTION
-- ============================================
-- Creates the increment_affiliate_clicks function if it doesn't exist
-- Run this in Supabase SQL Editor

-- Function to increment affiliate clicks
CREATE OR REPLACE FUNCTION increment_affiliate_clicks(affiliate_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE affiliates
  SET total_clicks = COALESCE(total_clicks, 0) + 1,
      updated_at = NOW()
  WHERE id = affiliate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_affiliate_clicks(UUID) TO anon, authenticated;

-- Verify function was created
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'increment_affiliate_clicks';

