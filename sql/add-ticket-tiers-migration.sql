
-- Migration: Add Advanced Ticketing & Pricing
-- This adds support for multiple ticket tiers and advanced event settings.

-- 1. Add columns to events table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ticket_tiers') THEN
        ALTER TABLE events ADD COLUMN ticket_tiers JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'settings') THEN
        ALTER TABLE events ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Add tier_id to event_tickets table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tickets' AND column_name = 'tier_id') THEN
        ALTER TABLE event_tickets ADD COLUMN tier_id TEXT;
    END IF;
END $$;

-- 3. Update purchase_ticket RPC to support tiers
CREATE OR REPLACE FUNCTION purchase_ticket(p_event_id UUID, p_tier_id TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_price INTEGER;
  v_ticket_id UUID;
  v_tier RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  v_user_email := auth.jwt()->>'email';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get event details
  IF p_tier_id IS NOT NULL THEN
    -- Try to find the tier in the JSONB array
    SELECT (elem->>'price_cents')::INTEGER INTO v_price
    FROM events, jsonb_array_elements(ticket_tiers) AS elem
    WHERE id = p_event_id AND elem->>'id' = p_tier_id AND status = 'published';
    
    IF v_price IS NULL THEN
      RAISE EXCEPTION 'Ticket tier not found or not available';
    END IF;
  ELSE
    -- Default to basic price
    SELECT price_cents INTO v_price
    FROM events
    WHERE id = p_event_id AND status = 'published';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or not available';
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
    v_price,
    p_tier_id,
    'valid'
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
