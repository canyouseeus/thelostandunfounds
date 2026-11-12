-- Record which provider delivered each newsletter email, so the send path can
-- count Zoho sends in the last rolling hour (Zoho's sending limit) across
-- function calls, and so the admin can see what went by Resend vs Zoho.
--
-- Nullable and additive: older rows and code that doesn't set it keep working.
alter table public.newsletter_send_logs
  add column if not exists provider text
  check (provider is null or provider in ('resend', 'zoho'));

create index if not exists newsletter_send_logs_provider_sent_at_idx
  on public.newsletter_send_logs (provider, sent_at)
  where provider is not null;
