
-- Banner Marketplace Tables

-- 1. Campaigns
CREATE TABLE IF NOT EXISTS banner_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    is_enterprise BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Public Slots (8-second increments)
-- Slot index is calculated as: floor(extract(epoch from time) / 8)
CREATE TABLE IF NOT EXISTS banner_public_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES banner_campaigns(id) ON DELETE CASCADE,
    slot_index BIGINT NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(slot_index)
);

-- 3. Enterprise Reservations
CREATE TABLE IF NOT EXISTS banner_enterprise_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES banner_campaigns(id) ON DELETE CASCADE,
    surface TEXT NOT NULL CHECK (surface IN ('gallery', 'shop', 'blog', 'all')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    CHECK (start_time < end_time)
);

-- 4. Notification Log
CREATE TABLE IF NOT EXISTS banner_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES banner_campaigns(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('live', 'expired_idle', 'replaced')),
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_banner_public_slots_index ON banner_public_slots(slot_index);
CREATE INDEX IF NOT EXISTS idx_banner_enterprise_active ON banner_enterprise_reservations(start_time, end_time);

-- RPC to get the current banner for a surface
CREATE OR REPLACE FUNCTION get_current_banner(target_surface TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_time TIMESTAMPTZ := NOW();
    current_slot_index BIGINT := floor(extract(epoch from NOW()) / 8);
    result JSONB;
BEGIN
    -- Layer 1: Check Enterprise Reservations
    SELECT jsonb_build_object(
        'campaign_id', bc.id,
        'title', bc.title,
        'image_url', bc.image_url,
        'link_url', bc.link_url,
        'is_enterprise', true,
        'layer', 'enterprise'
    ) INTO result
    FROM banner_enterprise_reservations ber
    JOIN banner_campaigns bc ON ber.campaign_id = bc.id
    WHERE (ber.surface = target_surface OR ber.surface = 'all')
      AND current_time >= ber.start_time
      AND current_time < ber.end_time
    LIMIT 1;

    IF result IS NOT NULL THEN
        RETURN result;
    END IF;

    -- Layer 2: Check Public Queue (Current Slot)
    SELECT jsonb_build_object(
        'campaign_id', bc.id,
        'title', bc.title,
        'image_url', bc.image_url,
        'link_url', bc.link_url,
        'is_enterprise', false,
        'layer', 'public_queue'
    ) INTO result
    FROM banner_public_slots bps
    JOIN banner_campaigns bc ON bps.campaign_id = bc.id
    WHERE bps.slot_index = current_slot_index
    LIMIT 1;

    IF result IS NOT NULL THEN
        RETURN result;
    END IF;

    -- Layer 3: Idle Fallback (Get the latest public slot that has passed)
    SELECT jsonb_build_object(
        'campaign_id', bc.id,
        'title', bc.title,
        'image_url', bc.image_url,
        'link_url', bc.link_url,
        'is_enterprise', false,
        'layer', 'public_idle'
    ) INTO result
    FROM banner_public_slots bps
    JOIN banner_campaigns bc ON bps.campaign_id = bc.id
    WHERE bps.slot_index < current_slot_index
    ORDER BY bps.slot_index DESC
    LIMIT 1;

    RETURN result;
END;
$$;
