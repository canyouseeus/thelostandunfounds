# WHITE-LABEL PROGRAM — EXECUTION PLAN

How THE LOST+UNFOUNDS platform gets rebranded and deployed for outside clients, and how
that work gets paid for.

**Status:** planning. Client #1 is the pilot: **Four5 Culture** (Eric), a photography
business. Currently has no owned domain and effectively no online presence, so the site is
a new lead channel rather than a replacement for an existing one.

---

## 1. The deal

| Term | Value |
|---|---|
| Build fee | **$0** for Four5 Culture only. Pilot pricing — the build is the R&D. |
| Revenue share | **5%** of platform-processed volume |
| Step-down | Drops to **3%** after **$50,000 cumulative** platform volume |
| Collection | Stripe Connect application fee — taken automatically at payment |
| Client owns | His domain, his Stripe account, his Supabase data, his customers |

### Why $50,000

$50K at 5% is ~$2,500 — approximately the build fee being waived. The step-down therefore
has a clean justification: the 5% is paying off the build, and once the build is paid for
the rate drops permanently. $10K would trigger the step-down before the free build is
recouped; $100K is unreachable for a solo photographer and so isn't a real concession.

### What "platform volume" means

Only money that flows through the platform's own payment path — bookings that came in via
`api/booking`, invoices issued from `api/invoices`, gallery and print sales through
`api/checkout`. Cash a client collects off-platform is not counted, does not owe a
percentage, and does not advance the $50K threshold.

This is the only definition that is measurable without auditing anyone's books, and it is
the honest one: the fee applies to revenue the tooling actually handled.

### Non-negotiables to put in writing before launch

- Cumulative volume, not annual. The threshold is crossed once and stays crossed.
- What happens if the client leaves: he keeps the code and the data, the Connect fee stops.
- Whether ongoing updates are included or billed separately (see Phase 5).

---

## 2. Architecture decision

**Fork-per-client, not multi-tenant.**

The platform is ~118,000 lines across 75 pages, 93 API functions and 118 lib modules,
written throughout as single-tenant. There is no `tenant_id` anywhere, and one Supabase
project, one Vercel project, one Stripe account and one Zoho mailbox are wired in as
singletons. Retrofitting tenancy is a rewrite, and it would make us liable for strangers'
uptime and customer data.

Each client instead gets: their own GitHub repo (fork), Vercel project, Supabase project,
Stripe account, and domain. Nothing shared. A client outage cannot touch production, and
each client owns their own payment liability and customer records.

**Revisit only at client #3.** Two forks are maintainable by hand. At three, the
configuration layer will have been proven twice and we will know which knobs actually
matter — that is the point at which a real generator is worth building.

---

## 3. Phases

### Phase 1 — Site config extraction

**This is the whole product.** Everything else is deployment mechanics.

Today a rebrand means hand-editing the 140 source files that hardcode
`thelostandunfounds` — including `SEOHead.tsx`, `EmailSignup.tsx`, `Layout.tsx`, and every
referral-link generator. There is no central config module (`src/config/` does not exist;
`BrandName.tsx` is a display component, not a config source).

Create `src/config/site.ts` as the single source of truth:

- **Identity** — brand name, legal entity, tagline, domain, logo, favicon
- **Contact** — public email, business/CC address, phone, social handles
- **Commerce** — currency, deposit percentage, Stripe Connect account, application-fee bps
- **Features** — one boolean per optional surface (see Phase 2)
- **Theme** — accent color and any client-specific design tokens

Then sweep the 140 files to read from it. This is mechanical but it is not small; scope it
as real work. **Do this on production first** — the config module is overdue at this size
and benefits us regardless of whether the white-label program goes anywhere.

Definition of done: `grep -ri "thelostandunfounds" src lib api` returns hits only inside
`src/config/site.ts`.

### Phase 2 — Feature flags

The page set splits cleanly:

- **Photographer core** (every client gets this) — `Gallery`, `GalleryAccess`,
  `DownloadPortal`, `BookingPage`, `ClientUpload`, `PhotographerDashboard`, `Pay`,
  `AdminInvoices`, `Contact`, `Shop`
- **LOST+UNFOUNDS editorial** (ours, off by default) — `BookClub`, `Kattitude`,
  `KingMidasLeaderboard`, `Borderlands`, `SageMode`, `Marty`, `NewTheory`, `Science`,
  `GearHeads`, the MLM affiliate tiers

Flags in `site.ts` gate routes, nav entries and admin panels. **Never delete these from a
client fork** — a fork with deletions can no longer merge upstream updates.

### Phase 3 — Stripe Connect application fees

This is how the 5% gets collected without ever sending an invoice or auditing anyone.

The money path already exists end to end: `api/booking/index.ts` → `create-quote.ts` →
`create-negotiated-quote.ts` → `send-contract.ts` → `create-final-invoice.ts` →
`api/webhooks/stripe.ts`. Client payments land in the client's own Stripe account; the
application fee routes our percentage at the moment of capture.

Work required:
- Add `applicationFeeBps` + connected-account ID to `site.ts`
- Thread the application fee through `api/checkout/create-session.ts` and the invoice
  payment path
- Implement the step-down: track cumulative platform volume, switch 500bps → 300bps at
  $50K. Store the running total server-side; do not compute it from Stripe on every call.
- Handle refunds — a refunded payment should reverse its application fee and decrement
  the cumulative total.

### Phase 4 — Attribution layer

Currently absent. A grep for `utm_`, `lead_source`, `referral_source` and `attribution`
across `src`, `lib` and `api` returns two hits, both false positives (a newsletter comment
in `Admin.tsx`, the OpenStreetMap copyright string in `PhotoMap.tsx`).

Not required for client #1 — with one client, "everything through the booking form counts"
is a sufficient rule. It becomes necessary at client #2–3, because a client-facing report
showing *what the site earned them this month* is what makes the percentage feel like a
partnership instead of a levy.

Scope: `utm_*` capture on landing, persisted to a `lead_source` column on bookings and
orders, surfaced as an attributed-revenue panel in the admin dashboard.

### Phase 5 — Provisioning runbook

A checklist doc so client #2 takes half a day instead of a week of remembering:

1. Fork repo, set `upstream` remote
2. Create Supabase project, run migrations, verify RLS
3. Create Vercel project, set the ~30 env vars (`npm run validate-env:vercel`)
4. Fill in `src/config/site.ts`, set feature flags
5. Client creates own Stripe account → Connect onboarding → capture account ID
6. Zoho or Resend sending domain, SPF/DKIM, verify a live send
7. DNS, SSL, deploy, verify per `.agent/workflows/deploy-and-verify.md`
8. Smoke test: booking → quote → contract → deposit → gallery delivery

### Phase 6 — The update story

Client forks and production will diverge. Decide before launch, in writing:

- **(a) Maintained** — client keeps `upstream`, we merge our improvements into their fork
  as part of the ongoing relationship
- **(b) Handover** — they own it outright and maintain it themselves

Option (a) is the better fit for a revenue-share deal: we are financially exposed to their
site continuing to work, so we should be the ones keeping it working. Whichever is chosen,
it must be explicit — an unstated expectation here is the single most likely thing to sour
the relationship a year in.

---

## 4. Sequencing

Phase 1 → 2 → 5 → 3 gets Eric live. Phase 4 before client #2. Phase 6 decided before
Eric's site takes its first real payment, not after.

Phase 1 is the long pole and the only part that is genuinely hard. Everything downstream
is straightforward once the brand is a variable instead of a string literal in 140 files.
