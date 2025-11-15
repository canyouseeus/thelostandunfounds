-- Reset Newsletter Subscribers List
-- Run this in Supabase SQL Editor to clear all subscribers
-- WARNING: This will delete ALL newsletter subscribers!

-- Delete all subscribers
DELETE FROM public.newsletter_subscribers;

-- Verify deletion (should return 0 rows)
SELECT COUNT(*) as remaining_subscribers FROM public.newsletter_subscribers;

-- Optional: Show recent deletions for confirmation
-- SELECT * FROM public.newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 10;
