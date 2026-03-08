
-- Migration: Add RSVPs and Dynamic Pricing Escalation
-- This adds a table for RSVPs and updates pricing logic to support automatic increases.

-- 1. Create event_rsvps table
CREATE TABLE IF NOT EXISTS event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on rsvps
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own RSVPs
CREATE POLICY "Users can view own rsvps" ON event_rsvps
    FOR SELECT USING (auth.uid() = user_id OR email = auth.jwt()->>'email');

-- Policy: Admin can view all RSVPs
CREATE POLICY "Admin can view all rsvps" ON event_rsvps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_rsvps.event_id
            AND events.owner_id = auth.uid()
        )
    );

-- 2. Add pricing escalation columns to events
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price_scaling_trigger') THEN
        ALTER TABLE events ADD COLUMN price_scaling_trigger INTEGER; -- Increase price every N tickets
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price_increment_percent') THEN
        ALTER TABLE events ADD COLUMN price_increment_percent NUMERIC;
    END IF;
END $$;

-- 3. Function to get current sold count (Tickets + RSVPs)
CREATE OR REPLACE FUNCTION get_event_sold_count(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_tickets INTEGER;
    v_rsvps INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_tickets FROM event_tickets WHERE event_id = p_event_id;
    SELECT COUNT(*)::INTEGER INTO v_rsvps FROM event_rsvps WHERE event_id = p_event_id;
    RETURN v_tickets + v_rsvps;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Updated purchase_ticket RPC with Dynamic Pricing Escalation
CREATE OR REPLACE FUNCTION purchase_ticket(p_event_id UUID, p_tier_id TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_base_price INTEGER;
  v_escalated_price INTEGER;
  v_increment NUMERIC;
  v_trigger INTEGER;
  v_sold_count INTEGER;
  v_multiplier INTEGER;
  v_ticket_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  v_user_email := auth.jwt()->>'email';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get event details and pricing config
  SELECT 
    price_cents,
    price_increment_percent,
    price_scaling_trigger
  INTO 
    v_base_price,
    v_increment,
    v_trigger
  FROM events
  WHERE id = p_event_id AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or not available';
  END IF;

  -- Calculate Escalated Price if applicable
  v_escalated_price := v_base_price;
  
  IF v_increment IS NOT NULL AND v_trigger IS NOT NULL AND v_trigger > 0 THEN
    v_sold_count := get_event_sold_count(p_event_id);
    v_multiplier := v_sold_count / v_trigger;
    
    IF v_multiplier > 0 THEN
      -- Simple compounding: Price = Base * (1 + Increment)^Multiplier
      v_escalated_price := (v_base_price * POWER(1 + (v_increment / 100.0), v_multiplier))::INTEGER;
    END IF;
  END IF;

  -- Handle Tiers (Overwrites escalation if a tier is selected)
  IF p_tier_id IS NOT NULL THEN
    SELECT (elem->>'price_cents')::INTEGER INTO v_escalated_price
    FROM events, jsonb_array_elements(ticket_tiers) AS elem
    WHERE id = p_event_id AND elem->>'id' = p_tier_id;
    
    IF v_escalated_price IS NULL THEN
      RAISE EXCEPTION 'Ticket tier not found';
    END IF;
  END IF;

  -- Insert ticket
  INSERT INTO event_tickets (
    event_id,
    user_id,
    customer_email,
    customer_name,
    purchase_amount_cents,
    tier_id,
    status
  ) VALUES (
    p_event_id,
    v_user_id,
    v_user_email,
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), split_part(v_user_email, '@', 1)),
    v_escalated_price,
    p_tier_id,
    'valid'
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC for RSVP
CREATE OR REPLACE FUNCTION rsvp_event(p_event_id UUID)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_rsvp_id UUID;
BEGIN
    v_user_id := auth.uid();
    v_user_email := auth.jwt()->>'email';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if already RSVP'd
    SELECT id INTO v_rsvp_id FROM event_rsvps WHERE event_id = p_event_id AND user_id = v_user_id;
    IF FOUND THEN
        RETURN v_rsvp_id;
    END IF;

    INSERT INTO event_rsvps (
        event_id,
        user_id,
        email,
        name
    ) VALUES (
        p_event_id,
        v_user_id,
        v_user_email,
        COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), split_part(v_user_email, '@', 1))
    )
    RETURNING id INTO v_rsvp_id;

    RETURN v_rsvp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC to get published events with attendee counts
CREATE OR REPLACE FUNCTION get_published_events_with_counts()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    event_date TIMESTAMPTZ,
    location TEXT,
    price_cents INTEGER,
    capacity INTEGER,
    image_url TEXT,
    settings JSONB,
    sold_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.location,
        e.price_cents,
        e.capacity,
        e.image_url,
        e.settings,
        get_event_sold_count(e.id) as sold_count
    FROM events e
    WHERE e.status = 'published'
    ORDER BY e.event_date ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
