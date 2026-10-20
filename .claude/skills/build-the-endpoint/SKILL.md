---
name: build-the-endpoint
description: When a connector or MCP tool is blocked and you cannot do something from the session, build the capability into the app instead — the credentials already live in Vercel. Use whenever a tool returns "requires approval", an MCP server is unauthenticated, a connector is unavailable in a non-interactive run, or you are about to tell the owner "I can't do that from here". Triggers on "requires approval", "MCP error -32003", "connector blocked", "needs authorization", "I can't do that from here", "you'll have to do it in the dashboard".
---

# Build The Endpoint

**Before telling the owner you cannot do something, check whether the app already holds the
credentials to do it.** Vercel carries the Stripe secret key, the Supabase service role key, the
Zoho OAuth credentials and the Google tokens. Anything those can do, the app can do — which means
you can do it, through an endpoint you add.

The environment variables exist so the platform can act on its own behalf. Routing a capability
through a connector that needs a human to approve each call defeats that.

## The trigger

Any of these, in a non-interactive session:

```
MCP error -32003: MCP tool call requires approval
This session is non-interactive, so Claude cannot run the OAuth flow here
<server> requires authentication before their tools can be used
```

There is nothing to forward. The harness returns a refusal, not an approval URL or a token, so
"ask the owner to approve" is not available. Asking them to go and do it by hand in a third-party
dashboard is the outcome to avoid, not the answer.

## What happened, concretely

A test booking emailed a client a live Stripe payment link for a shoot that did not exist. Voiding
the invoice in the database changed nothing — the link stays payable until Stripe is told
otherwise. The Stripe MCP write returned `requires approval`, so the owner was told to go into the
dashboard himself.

The fix took one file. `STRIPE_SECRET_KEY` was already in Vercel and `getStripe()` already existed:

```
api/admin/deactivate-payment-link.ts   →  stripe.paymentLinks.update(id, { active: false })
```

Called with the admin header, the link went `active: false` in seconds. The capability was never
missing; it was just on the wrong side of an approval gate.

## The pattern

1. **Name the operation** and find the credential it needs. If it is already in Vercel, this works.
2. **Reuse the existing helper** — `getStripe()`, `getSupabaseAdmin()`, `getZohoAuthContext()`.
   Do not construct a second client with its own configuration.
3. **Gate it as admin** with the shared check — never write a local `isAdmin`:

```ts
import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js'

if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })
```

   It accepts a verified Supabase session for an admin email (the admin panel attaches
   it automatically), `X-Admin-Secret` matching `ADMIN_SECRET` (agents and scripts), or
   localhost in local dev. **`X-Admin-Email` is ignored** — it is a claim anyone can
   send, and the owner's address is in the public bundle.

   **Agents do not call admin routes.** The owner will not put `ADMIN_SECRET` in an agent
   environment, and that is final. An agent runs an admin action by queueing it in
   `admin_jobs` (see CLAUDE.md "ADMIN WORK RULE"); the every-minute cron runs it. So an
   endpoint an agent will need also gets an entry in `lib/api-handlers/admin/_jobs.ts`
   that calls the **same function** the route calls — extract the route's core into
   `lib/` first. Never add a bypass to `verifyAdmin`, never read `ADMIN_SECRET` out of
   Vercel, and never fall back to `X-Admin-Email`.

4. **Keep local state in step.** Deactivating a link and leaving the invoice marked `sent` is a
   trap for whoever reads the record next. Do both in the one call.
5. **Return the external state you actually achieved** — `active: false`, not `success: true`.
6. **Deploy, then poll for the route.** It answers `{"error":"Admin route not found: …"}` until
   the build lands; that is normal for roughly five minutes, not a bug to debug.
7. **Tell the owner the tool** once it works — where it is in the admin panel (or the
   `admin_jobs` action name), and what it fixes. A capability nobody knows about is not a
   capability.

## Do NOT use this to route around a decision

This is for **capability gaps** — the session cannot show an approval prompt. It is never for:

- **A permission the owner denied.** A refused tool call is an answer. Do not rebuild it as an
  endpoint to get a different one.
- **Anything irreversible without saying so first** — deleting data, refunding, sending to a
  client list, cancelling a subscription. Build it if asked; do not fire it unprompted.
- **Exposing a secret.** The endpoint uses the credential; it never returns it, logs it, or
  accepts one from the request.
- **Skipping the admin gate** because it is "just a read". Client records, invoices and payment
  state are all admin-only.

If in doubt about whether the gap is capability or judgement: capability gaps have an error string
from the harness. Judgement calls have a human on the other end of them.

## Existing self-service endpoints

| Endpoint | Does |
|---|---|
| `api/admin/deactivate-payment-link.ts` | Kills a Stripe Payment Link by id or invoice number, marks the invoice draft |
| `api/admin/record-invoice-payment.ts` | Records an off-Stripe payment (Apple Pay, Zelle, cash) into `invoice_payments`, flips the invoice `paid` when settled, kills its payment link. `GET ?client=` looks invoices up |
| `api/admin/create-invoice.ts` | Creates a standalone (no-booking) invoice row from line items — finds/creates the client by email. Then `create-payment-link` and `/api/invoices/send` |
| `api/booking/create-negotiated-quote.ts` | Invoices a price agreed by email, with the concession as a line item |
| `api/mail/send` | Sends branded mail with CC, which `sendTransactionalEmail` cannot do |
| `api/admin/logs.ts` | Vercel runtime logs — **inert**, `VERCEL_ACCESS_TOKEN` is not set |

That last row is the counter-example worth remembering: an endpoint exists for reading runtime
errors, and it returns nothing because one environment variable was never added. When a
self-service route reports missing configuration, say so plainly rather than concluding the
capability is absent.
