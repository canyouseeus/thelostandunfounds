-- FR33DOM INC. paid chapters pay the affiliate split like every other product
-- (owner decision 2026-11-12). register_referral_conversion writes p_source
-- straight into affiliate_commissions.source, for the referrer's row and the
-- recruit rows alike, so 'game' has to be an allowed source.
-- No data changes; the constraint only widens.

ALTER TABLE affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_source_check;

ALTER TABLE affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_source_check
  CHECK (source IN (
    'paypal', 'fourthwall', 'local', 'stripe', 'photo_order', 'booking',
    'event_ticket', 'prodigi_order', 'game'
  ));
