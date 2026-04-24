CREATE TABLE gallery_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  total_claimed INTEGER NOT NULL DEFAULT 0,
  last_claim_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX gallery_credits_email_idx ON gallery_credits (LOWER(email));

ALTER TABLE gallery_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages credits" ON gallery_credits
  USING (true) WITH CHECK (true);

-- Atomic credit deduction to prevent race conditions
CREATE OR REPLACE FUNCTION deduct_gallery_credits(p_email TEXT, p_count INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining INTEGER;
  v_new_remaining INTEGER;
BEGIN
  SELECT credits_remaining INTO v_remaining
  FROM gallery_credits
  WHERE email = LOWER(p_email)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'credits_remaining', 0, 'error', 'Email not found');
  END IF;

  IF v_remaining < p_count THEN
    RETURN json_build_object('success', false, 'credits_remaining', v_remaining);
  END IF;

  v_new_remaining := v_remaining - p_count;

  UPDATE gallery_credits
  SET credits_remaining = v_new_remaining, updated_at = NOW()
  WHERE email = LOWER(p_email);

  RETURN json_build_object('success', true, 'credits_remaining', v_new_remaining);
END;
$$;
