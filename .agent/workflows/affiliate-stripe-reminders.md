# Workflow: Affiliate Stripe onboarding reminders

An affiliate who signs up but never completes Stripe Connect cannot be paid — commissions
accrue and sit there with nowhere to land. This workflow finds those affiliates and nudges
them, automatically, with a one-click link that starts Stripe onboarding straight from the
email.

## The moving parts

| Piece | File |
|---|---|
| Daily cron | `api/cron/affiliate-stripe-reminder.ts` → `/api/cron/affiliate-stripe-reminder`, `0 16 * * *` in `vercel.json` |
| Sweep + cadence logic | `lib/api-handlers/affiliates/stripe-reminders.ts` |
| Email template (`stripe_reminder`) | `lib/api-handlers/affiliates/_emails.ts` |
| One-click resume endpoint | `lib/api-handlers/affiliates/stripe-resume.ts` → `/api/affiliates/stripe-resume?token=…` |
| Signed link tokens | `lib/api-handlers/affiliates/_onboarding-token.ts` |
| Shared Connect account helpers | `lib/api-handlers/affiliates/_connect-account.ts` |

## Who gets a reminder

An affiliate is a candidate when **all** of these hold:

- `status = 'active'`
- not flagged (`is_flagged` null or false)
- `stripe_payouts_enabled` is null or false — i.e. Stripe cannot pay them yet

Cadence guards, enforced per affiliate off `affiliate_email_log`:

- **24h grace** after signup — never nag someone who is still mid-signup
- **7-day cooldown** between reminders
- **4 reminders maximum**, then we stop permanently

Each send is logged with `email_type = 'stripe_reminder'` and
`reference_id = 'stripe_reminder_<n>'`. That log is what enforces the cap and the cooldown,
so a double-fired cron cannot double-send. If the log lookup errors, the affiliate is
**skipped**, not mailed — failing open here would mean mailing everyone on every DB blip.

## The one-click link

Stripe Account Links expire in minutes, so one can never be baked into an email. Instead the
email carries a signed token; `/api/affiliates/stripe-resume` verifies it, creates the Express
account if needed, mints a **fresh** Account Link and 302s to Stripe.

- Signed HMAC-SHA256, 30-day expiry, constant-time comparison.
- Secret: `AFFILIATE_LINK_SECRET`, falling back to `CRON_SECRET`, then the service role key.
  Rotating that secret invalidates outstanding links — the affiliate then sees a "link no
  longer valid" page pointing at the dashboard button, which does the same thing.
- The token authorises exactly one action: open Stripe's own KYC flow for one affiliate. It
  grants no session and reads no data.

Account creation lives in `_connect-account.ts` and is shared with the dashboard's
`connect-onboarding` path, so an affiliate can never end up with two Express accounts.

## Running it by hand

All calls need `CRON_SECRET` (`Authorization: Bearer …`, `x-cron-secret`, or `?secret=`).

```bash
# Who is due? Sends nothing.
curl -X POST https://www.thelostandunfounds.com/api/affiliates/stripe-reminders \
  -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' \
  -d '{"dryRun":true}'

# Preview the real template to yourself (no cap, no cooldown, not a real nudge)
curl -X POST … -d '{"testEmail":"thelostandunfounds@gmail.com"}'

# Nudge one affiliate now, ignoring grace/cooldown (cap still applies)
curl -X POST … -d '{"affiliateId":"<uuid>","force":true}'
```

**Always send yourself the `testEmail` preview before a first real send.** Rendering is not
evidence of delivery.

## Verifying a change

1. `dryRun` and read the `results[]` — every entry states a reason.
2. `testEmail` to yourself; open it and click CONNECT STRIPE. It must land on Stripe's
   onboarding, not an error page.
3. After a real send, confirm the row: `select * from affiliate_email_log where email_type =
   'stripe_reminder' order by sent_at desc;`
