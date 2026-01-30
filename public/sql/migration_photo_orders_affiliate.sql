-- Migration: Add Affiliate Columns to Photo Orders
-- Description: Adds affiliate_id and affiliate_code to track which affiliate referred a gallery purchase.

ALTER TABLE photo_orders 
ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id),
ADD COLUMN IF NOT EXISTS affiliate_code TEXT;

CREATE INDEX IF NOT EXISTS idx_photo_orders_affiliate_id ON photo_orders(affiliate_id);
