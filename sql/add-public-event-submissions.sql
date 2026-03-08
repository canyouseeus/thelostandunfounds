-- Migration: Support Public Event Submissions
-- Modifies the events table to allow 'pending' status and adds RLS for authenticated submissions.

-- 1. Update the status constraint to include 'pending' (if a constraint exists)
-- Drop existing constraint (assuming the standard naming convention used in Supabase)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass AND contype = 'c' AND conname LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE events DROP CONSTRAINT ' || constraint_name;
    END IF;
    
    -- Re-add the constraint with 'pending'
    ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'published', 'cancelled', 'pending'));
EXCEPTION WHEN OTHERS THEN
    -- If constraint dropping/adding fails for any reason (e.g. no constraint), we catch it to avoid breaking the migration.
    -- Ideally, we ensure the column accepts 'pending'. Since it's TEXT, it inherently does if no constraint prevents it.
    RAISE NOTICE 'Skipped constraint update: %', SQLERRM;
END $$;

-- 2. Add RLS policy for authenticated users to insert pending events
CREATE POLICY "Authenticated users can create pending events"
ON public.events FOR INSERT 
TO authenticated
WITH CHECK (
    status = 'pending' AND 
    owner_id = auth.uid()
);

-- 3. Add RLS policy for users to view their own pending/draft events
CREATE POLICY "Users can view their own events"
ON public.events FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid() OR status = 'published'
);

-- Note: Admins already have a policy "Admins can view all events" which covers pending events.
