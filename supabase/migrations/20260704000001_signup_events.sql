-- Track signup attempts (success and failure) end-to-end so a report like
-- "I tried to sign up and it didn't work" is diagnosable after the fact,
-- instead of relying on Vercel's short-lived runtime logs or Supabase's
-- own auth logs (which have limited retention and aren't queryable from
-- the app). Written exclusively by backend endpoints using the service
-- role key — RLS is enabled with no policies, so anon/authenticated
-- clients can neither read nor write this table directly.

create table if not exists signup_events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  stage text not null,           -- e.g. 'email_signup', 'email_autosignin', 'google_oauth_start',
                                  -- 'google_oauth_callback', 'affiliate_setup'
  method text,                   -- 'email' | 'google'
  success boolean not null,
  email text,                    -- best-effort, may be unknown for early OAuth failures
  intent text,                   -- e.g. 'affiliate' — carried through from the signup CTA
  path text,                     -- page the attempt originated from
  error_message text,
  user_agent text,
  ip_address text
);

create index if not exists idx_signup_events_created_at on signup_events(created_at desc);
create index if not exists idx_signup_events_success on signup_events(success) where success = false;
create index if not exists idx_signup_events_email on signup_events(email);

alter table signup_events enable row level security;
