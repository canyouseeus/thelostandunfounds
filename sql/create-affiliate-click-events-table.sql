-- Create table for tracking individual affiliate clicks/events with metadata (Sub-IDs)
create table if not exists affiliate_click_events (
  id uuid default gen_random_uuid() primary key,
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  clicked_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text 
);

-- Optimize for time-series queries and dashboard lookups
create index if not exists idx_affiliate_click_events_affiliate_id on affiliate_click_events(affiliate_id);
create index if not exists idx_affiliate_click_events_clicked_at on affiliate_click_events(clicked_at);
