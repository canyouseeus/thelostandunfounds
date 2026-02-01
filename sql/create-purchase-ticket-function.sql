
-- Function to purchase a ticket
CREATE OR REPLACE FUNCTION purchase_ticket(p_event_id UUID)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_price INTEGER;
  v_ticket_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  v_user_email := auth.jwt()->>'email';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get event details
  SELECT price_cents INTO v_price
  FROM events
  WHERE id = p_event_id AND status = 'published';

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
    status
  ) VALUES (
    p_event_id,
    v_user_id,
    v_user_email,
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), split_part(v_user_email, '@', 1)),
    v_price,
    'valid'
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
