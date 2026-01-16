-- Add metadata column to photo_orders to store extra details like commercial usage info
ALTER TABLE photo_orders 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
