---
name: crew-assignment
description: Where a photographer's assignment to a shoot actually lives, how their 80% payout is calculated and released, and why "the photographer has not been told" is a claim you almost never have the evidence to make. Use when assigning or paying a photographer, when asked whether someone knows about a shoot, when a payout is pending or has not arrived, or when reading contractor fields on an invoice. Triggers on "assign", "photographer", "contractor", "Eric", "payout", "crew", "80%", "did he get notified", "does he know".
---

# Crew Assignment & Payouts

## RULE 1: Assignment lives on the INVOICE, not the booking

`bookings` has **no** photographer column. None. Checking there and finding
nothing means you looked in the wrong place, not that nobody is assigned.

The assignment is:

```sql
select invoice_number, contractor_name, contractor_payout
  from invoices where invoice_number = 'QUO-003';
-- Eric Alvarado | 120.00
```

Corroborated by a row in `crew_payouts` pointing at that invoice.

This was gotten wrong in front of the owner: the booking record was read, no
photographer field was found, and he was told the photographer "still doesn't
know about Thursday": twice. The photographer was assigned the whole time.

```sql
-- What "is this shoot assigned?" actually looks like
select i.invoice_number, i.contractor_name, i.contractor_payout,
       cp.amount, cp.status, cp.available_at
  from invoices i
  left join crew_payouts cp on cp.invoice_id = i.id
 where i.booking_id = '<booking-id>';
```

## RULE 2: Nothing records whether the photographer was NOTIFIED

There is no email log for crew notifications. Not in `activity_logs`, not in
`admin_notifications`: that was checked; the tables exist for other things.

So the honest answer to "does he know?" is one of:

- **"Yes: here is the sent email"**, having found it in Zoho's Sent folder, or
- **"I can't tell from here."**

**Never** assert that someone has not been notified. Absence of a record is not
evidence of absence when nothing writes a record in the first place. The owner
sends messages by phone and text constantly; the platform sees none of it.

To look for a notification:

```bash
# Sent folder id comes from /api/mail/folders
curl -sS "$SITE/api/mail/messages?folderId=<sent-id>&limit=60" \
  -H 'X-Admin-Email: thelostandunfounds@gmail.com'
# then filter on the photographer's address in to/cc
```

Bear in mind the list view does **not** reliably populate `ccAddress`, so a
notification sent as a CC can be invisible here. Not finding it proves nothing.

## RULE 3: Which endpoints notify, and which do not

| Path | Creates booking | Assigns contractor | Emails photographer |
|---|---|---|---|
| Website booking (`api/booking/index.ts`) | yes | yes | **yes** |
| `create-negotiated-quote` | yes | yes (via quote) | **no** |
| `create-final-invoice` | no | carries forward | no |

A negotiated quote produces a fully assigned, fully payable job with no email
to the person shooting it. That is worth saying out loud when raising one,
but say it as "this path does not send one", not as "he has not been told".

## RULE 4: The split is 80/20, and the deposit pays out proportionally

The house takes **20%** for booking the session; the photographer keeps **80%**.
This applies to every photography subcontractor, not just one.

A deposit releases the photographer's share **of that deposit**, not the whole
job:

```
Job $150 → photographer $120 (80%)
Deposit $75 collected → payout row $60 (80% of 75)
Balance $75 collected → payout row $60
```

`invoices.contractor_payout` holds the **whole job's** figure ($120). The
`crew_payouts` rows hold what is actually being moved now ($60). They are
different numbers on purpose; do not "correct" one to match the other.

## RULE 5: A pending payout is usually Stripe settlement, not a bug

`crew_payouts.available_at` is the settlement hold, roughly two days after the
charge. The cron at `/api/cron/crew-payouts` runs **hourly** and pays anything
whose hold has passed. Nobody needs to press anything.

Diagnose with a dry run before touching it:

```bash
curl -sS -X POST "$SITE/api/admin/crew-payouts" \
  -H 'Content-Type: application/json' -H 'X-Admin-Email: thelostandunfounds@gmail.com' \
  -d '{"action":"send","payoutId":"<id>","dryRun":true}'
```

Reading the result:

| `skipped` | Meaning |
|---|---|
| `insufficient_balance` | The client's money has not settled yet. Wait. Not a fault. |
| `no_connected_account` | The photographer has no Stripe Connect account. Real blocker. |
| `payouts_not_enabled` | Connect account exists but is not cleared to receive. Real blocker. |

Passing `payoutId` **overrides the hold**: an admin choosing to release early.
It cannot conjure funds: if the balance is short it still skips.

## RULE 6: Quote times and payout times in CENTRAL, always

The owner operates in Austin. `available_at` is stored UTC and reporting it
that way has been explicitly rejected. Convert before it reaches him:

```bash
python3 -c "
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
u = datetime(2026,8,16,1,25,42, tzinfo=timezone.utc)
print(u.astimezone(ZoneInfo('America/Chicago')).strftime('%a %b %d %Y %I:%M %p %Z'))
"   # Sat Aug 15 2026 08:25 PM CDT
```

Same for shoot times: a booking stored as `19:00` is 7:00 PM to everyone
involved, and an AM/PM ambiguity in a request is worth one question rather
than a wrong photographer call time.

## RULE 7: Zoho's mail API rate-limits, and then nothing works

Repeated calls earn `You have made too many requests continuously`, and the
token refresh itself starts failing, so mail reads AND sends break together.
Poll it once, not in a loop. If it is already limited, stop calling and say so;
it clears on its own.
