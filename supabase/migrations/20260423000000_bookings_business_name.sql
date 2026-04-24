-- Add an optional business / organization name to booking inquiries.
-- Some clients are individuals, some are brands/businesses — keeping this
-- as a separate column so it surfaces cleanly in the notification email
-- and admin view instead of being buried in the free-form notes.

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS business_name TEXT;
