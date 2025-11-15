-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR RIGHT NOW
-- This will immediately delete all newsletter subscribers

DELETE FROM public.newsletter_subscribers;

-- Verify it worked (should return 0)
SELECT COUNT(*) as remaining_subscribers FROM public.newsletter_subscribers;
