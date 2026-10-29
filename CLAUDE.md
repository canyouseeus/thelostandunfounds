# THE LOST+UNFOUNDS — Agent Guide

> **This is the single canonical rules file for all agents (Claude Code and otherwise).**
> Cursor is no longer used — there is no separate Cursor rule set to keep in sync.

## What This Project Is

A content platform and creative community at [thelostandunfounds.com](https://www.thelostandunfounds.com). Features include: blog/book club, photo gallery, newsletter, merch shop (Fourthwall), affiliate program, admin dashboard, and QR tools. Solo-operated by one person with AI agents.

## Architecture Overview

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full codebase map.

| Layer | Location | Tech |
|---|---|---|
| Frontend | `src/` | React 18, TypeScript, Vite |
| API | `api/` | Vercel Serverless Functions |
| Shared Logic | `lib/` | TypeScript handlers & utilities |
| Database | Supabase (`cxpyqjxhbvuygnxyukli`) | PostgreSQL + RLS |
| Deployment | Vercel | Auto-deploy from `main` branch |
| Email | Zoho Mail | OAuth2 integration |
| Payments | Stripe | Checkout Sessions + webhooks; Connect for affiliate payouts |
| Shop | Fourthwall | External platform |

## Where to Find Things

| What you need | Where to look |
|---|---|
| Agent skills (domain-specific guides) | `.claude/skills/*/SKILL.md` — the single canonical location |
| Step-by-step workflows | `.agent/workflows/*.md` |
| Blog publishing rules | Blog Publishing Rule section below |
| Email branding rules | `.claude/skills/brand-email-manager/SKILL.md` |
| Design system & styling | `.claude/skills/noir-design/SKILL.md`, `.claude/skills/no-border-design/SKILL.md` |
| Database schema & migrations | Supabase MCP (`apply_migration`) — see `supabase-mcp` skill. `sql/` is a dead archive |
| Which Supabase project is live | `cxpyqjxhbvuygnxyukli` — see Database Project Rule below |
| Environment variables | `.env.local` (local), Vercel dashboard (prod) |
| Deployment verification | `.agent/workflows/deploy-and-verify.md` |
| Setup & onboarding docs | `docs/setup/` |
| Feature documentation | `docs/features/` |
| Security docs | `docs/security/` |
| Archived/completed docs | `docs/archive/` |

## DATABASE PROJECT RULE

**Production runs on Supabase project `cxpyqjxhbvuygnxyukli` ("SCOT33 BACK-UP").** The site was
switched to this backup to escape an egress overage on the original project,
`nonaqhllakrckbtbawrb`. The old project is no longer the live database — do not apply migrations
to it, and do not treat data there as current.

**The local `.env` is stale and still names the old project.** It is not evidence of anything.
When you need to know which database is live, read it off the deployed bundle rather than the
repo:

```bash
JS=$(curl -sS https://www.thelostandunfounds.com | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)
curl -sS "https://www.thelostandunfounds.com$JS" | grep -o 'https://[a-z0-9]*\.supabase\.co' | sort -u
```

Vercel's environment variables are the source of truth for production; `.env` only affects local
runs. If a Supabase MCP call returns "You do not have permission to perform this action", you are
almost certainly pointed at the retired project — check the ref before concluding you lack access.

**Check which project the Supabase connector reaches before trusting it.** Run `list_projects`
first. It has reached an unrelated project (`supabase-blue-cave`) in some sessions; when it does
not list `cxpyqjxhbvuygnxyukli`, say so and stop — never apply a migration to whatever it does list.

**Test money-path SQL before applying it.** Run it inside `DO $$ … RAISE EXCEPTION … $$` so the
transaction always rolls back, with `SET LOCAL lock_timeout = '5s'`. Then confirm production is
unchanged.

**No `DROP` of any kind in `apply_migration` or `execute_sql`** — not `DROP POLICY IF EXISTS`, not
`DROP FUNCTION`, not `DROP TABLE`. The Supabase connector treats any `DROP` as destructive and asks
for a confirmation that **no one ever sees** (the owner gets no prompt, even with tools set to
"always allow"), so the call hangs and fails after 60s with *"The server asked the user a question,
and no answer came"*. It is not a permission or cost problem; do not ask the owner to approve
anything. Write migrations so they never need a `DROP`:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 't' AND policyname = 't_owner_select') THEN
    CREATE POLICY t_owner_select ON public.t FOR SELECT TO authenticated USING (owner_id = auth.uid());
  END IF;
END $$;
```

To change an existing policy, `ALTER POLICY … USING (…)`. To replace a function, `CREATE OR REPLACE
FUNCTION`, or rename the old one aside (`ALTER FUNCTION … RENAME TO …_old`). If you see that 60s
"asked the user a question" error, look for a `DROP` in your SQL first. (First hit: the
`halftone_films_history` migration, 2026-10-29.)

## EVIDENCE RULE — every task, no exceptions

Statements about your own process are reconstructions, not logs — they come out confident whether
or not they're true. Produce artifacts instead.

**Before writing code:**
1. Name the files you will read, then read them.
2. **Quote** the specific line from each that governs this task. A summary is not a quote. If you
   can't quote it, you didn't read it.
3. If any doc conflicts with a skill, say so out loud, state which you followed and why. The skill
   wins. Never reconcile a conflict silently.

**Before saying it's done:**
4. Show the artifact — rendered page, screenshot, command output. Not a description of one.
5. Every check must be able to fail. A command that passes when its inputs are missing is not a
   check. Verify the failure path before trusting the pass.
6. Look at the whole output, not just the part you changed. Bugs hide in what you didn't inspect.

**Styling work:** run `git log --oneline -3` first. If `noir-design` still says *"rigid, thin
borders"*, you're on a stale base and every rule you read is wrong.

## SKILL UTILIZATION RULE — HIGHEST PRIORITY

**Before starting ANY task, read the relevant SKILL.md files.**

Skills live in **`.claude/skills/<name>/SKILL.md`** — this is the single canonical location.
(`.agent/skills/` and `skills/` were duplicate forks and have been deleted. Do not recreate them.)

| Keywords / Domain | Required Skill(s) |
|---|---|
| email, send, transactional, Zoho, Resend | `email-delivery` (authority), `brand-email-manager` |
| newsletter, campaign, subscribers, outreach | `outreach-ops`, `brand-email-manager`, `email-delivery` |
| admin, dashboard, analytics | `admin-ops` |
| affiliate, commission, tracking, Amazon links, King Midas, Secret Santa, MLM | `affiliate-ops`, `affiliate-program` |
| booked by phone, booked directly, direct booking, referral for an off-site job | `email-billing`, `affiliate-program` |
| send an invoice, payment link, pay an affiliate, any admin action from an agent session | ADMIN WORK RULE below, `build-the-endpoint` |
| photographer assignment, crew, payout, 80/20 split, "does he know" | `crew-assignment` |
| blog, publish, post | `blog-publishing`, `supabase-mcp` |
| invoice, proposal, quote, estimate, client document | `client-documents` |
| billing, deposit, payment link, promo code, discount code, checkout | `email-billing` |
| blocked connector, "requires approval", can't do it from here | `build-the-endpoint` |
| CRM, leads, pipeline, contacts, Shadow Board | `noir-design`, `no-border-design`, `bento-design` |
| shop, product, checkout, order, payment, Stripe | `commerce-engine` |
| gallery, photos, upload, sync, Google Drive | `gallery-ops`, `gallery-sync-troubleshooting` |
| UI, design, components, styling, CSS | `noir-design`, `bento-design`, `no-border-design` |
| modal, overlay, z-index, popup | `modal-z-index-manager` |
| database, migration, RLS, schema, Supabase, SQL | `supabase-mcp`, `infra-ops`, `verify-schema` |
| environment variables, secrets, .env | `secure-env-manager`, `verify-env` |
| deploy, production, dev server, build | `dev-parity-guard`, `fix-dev-server` |
| refactor, cleanup, technical debt | `code-refactor` |
| npm audit, dependencies, CVE, vulnerability | `dep-security` |
| revenue, earnings, transactions | `revenue-data-validator` |
| browser, testing, UI verification | `smart-browsing`, `browser-ops-guard`, `verify-ui-changes` |
| Google Auth, OAuth, login | `fix-google-auth` |
| clock, stopwatch, timer widget | `dashboard-clock-interaction` |
| Google service account, photographer | `gallery-agent-management` |
| deployment verification, Vercel status | `dev-parity-guard` (see Deployment Verification Rule below) |
| page titles, h1, heading case | Page Title Style Rule below |
| new admin feature, tutorial, walkthrough, tour, onboarding | ADMIN TUTORIAL RULE below, `admin-ops` |
| public form, contact, signup, ticket, submission, spam, bot, Turnstile, CAPTCHA | TURNSTILE RULE below |

**Rules:** Read FIRST, code SECOND. Multiple skills may apply. Skills override assumptions.

## WORKFLOWS

| Command | When | File |
|---|---|---|
| `/ralph-loop` | After any change — self-verify | `.agent/workflows/ralph-loop.md` |
| `/preflight-check` | Before committing | `.agent/workflows/preflight-check.md` |
| `/deploy-and-verify` | Deploying to production | `.agent/workflows/deploy-and-verify.md` |
| `/cleanup` | Monthly maintenance | `.agent/workflows/cleanup.md` |
| `/send-email` | Sending emails | `.agent/workflows/send-email.md` |

## CAPABILITY RULE — build it before reporting you can't

The Vercel environment holds the Stripe, Supabase, Zoho and Google credentials so the platform can
act on its own behalf. When a connector or MCP tool is blocked in a non-interactive session
(`requires approval`, unauthenticated server), **do not stop at "I can't do that from here" and do
not send the owner into a third-party dashboard.** Check whether the app already holds the
credential and add an admin-gated endpoint that does the job.

Read `build-the-endpoint` first. It has the pattern, the admin gate, and the cases where this must
NOT be used — chiefly, never rebuild a capability the owner deliberately denied.

## ADMIN WORK RULE — how an agent does admin-dashboard work

Admin routes (`/api/admin/*`, `/api/invoices/send`, `/api/mail/*`, the booking quote routes)
accept only proof: the owner's logged-in session, or `ADMIN_SECRET`. **The owner will not put
`ADMIN_SECRET` in an agent environment.** That is a standing decision, not a gap to work around.

**Never** send `X-Admin-Email` (anyone can, and the owner's address is public), never read
`ADMIN_SECRET` out of Vercel, and never add a bypass to `verifyAdmin`. Each of these reopens the
hole closed in #290.

**To do admin work, queue it.** Insert a row into `admin_jobs` through the Supabase connector
(itself authenticated as the owner). `/api/cron/admin-jobs` runs it within a minute on Vercel's
`CRON_SECRET`:

```sql
insert into admin_jobs (action, payload, requested_by, note, idempotency_key)
values ('send_invoice', '{"invoice_number":"INV-014","to_email":"thelostandunfounds@gmail.com","test":true}',
        'claude', 'test send before the real one', 'inv-014-test-1')
returning id;
-- then read the outcome back:
select status, http_status, result, error from admin_jobs where id = '<id>';
```

| action | payload |
|---|---|
| `stripe_balance` | `{}` — read-only |
| `create_invoice` | `{clientName, clientEmail, clientPhone?, description, eventDate?, lineItems[]}` |
| `create_payment_link` | `{invoiceNumber}` |
| `send_invoice` | `{invoice_number \| invoice_id, to_email?, message?, test?}` — a real send CCs media@; `test:true` goes to `to_email` only, no CC |
| `direct_booking` | `{action: "create" \| "attach" \| "invite", …}` — see `email-billing` |
| `affiliate_payout` | `{affiliateCode, amount, notes?}` — checks the **available** Stripe balance first; short → `waiting_funds`, retried hourly for 3 days |
| `move_funds` | `{to: "business" \| "king_midas" \| "secret_santa" \| "affiliate_pay", amount, note?}` — Payments balance → that Stripe financial account; short balance → `failed`, not retried |
| `record_field_sale` | `{night, location?, cashApp?, venmo?, applePay?, cash?, saleCount?, notes?}` — a street night as revenue (no affiliate split); queues `owner_pay` for 10% |
| `owner_pay` | `{fieldSaleId?, amount}` — transfer to the owner's Stripe Connect account; checks the **available** balance, short → `waiting_funds`, retried hourly for 3 days |
| `send_newsletter` | `{issue, testEmail?, confirm?}` — an issue whose copy is in `lib/newsletters/`; `testEmail` sends one copy, otherwise `confirm: true` sends to every verified subscriber |
| `crew_announcement` | `{campaign, testEmail?, dryRun?, confirm?, emails?}` — a roster email from `lib/api-handlers/crew/announcements.ts`, from joshua@, CC media@; `testEmail` (owner addresses only) gets one copy per variant; without `confirm: true` it only reports who would get it; each person gets a campaign once |

- Only these actions exist; the list lives in `lib/api-handlers/admin/_jobs.ts` and grows by PR.
  Each calls the same function as the admin-panel route.
- A job runs **at most once**. One stuck in `running` is marked failed, not retried. Check whether
  it took effect (Sent folder, Stripe) before queueing it again.
- Give every send or payment an `idempotency_key`, so a second insert of the same job is refused.
- The usual rules still apply on top: test client and affiliate emails to
  `thelostandunfounds@gmail.com` first, verify the CC landed, confirm the money in Stripe.
- Read-only checks need no job: query the database directly, and use the Stripe connector for
  balances.

## AFFILIATE MONEY RULE

Owner-confirmed 2026-10-20. Full detail in `affiliate-program`.

- Every share is a percentage of **profit** (price − cost), never gross: affiliate 42%, MLM L1 2%,
  L2 1%, King Midas pot 8%, Secret Santa 3%, the company keeps the rest. Cost =
  `invoices.job_cost`, else the photographer's `contractor_payout`.
- **Photographer gallery sales** (owner-confirmed 2026-10-26): a sale from a gallery a crew
  photographer owns pays them **97%** less their part of Stripe's fee; the house keeps **3%**, and
  every affiliate share above comes out of that 3% (the photographer's share is the sale's cost).
  The house's own galleries are excluded. `accruePhotoSalePayouts` → `crew_payouts`, paid by the
  hourly crew-payouts cron. Card sales only — Strike (bitcoin) photo sales never reach Stripe.
- **Hold:** physical products only (30 days). Services and digital goods pay once the client's
  payment settles. Never transfer before checking the platform's **available** balance.
- **King Midas days are Central time** (`America/Chicago`), not UTC.
- One writer: `register_referral_conversion` via `triggerReferralCommission()`. Never add another.
- A job booked by phone or email goes through **Direct Booking** (`email-billing`), so it splits
  exactly like a website booking.
- The owner's own affiliate (`THELOSTANDUNFOUNDS`) is paid like any other, to his Stripe Connect
  account.
- Times to the owner are in **Central**.

## MODEL SELECTION RULE

Match the model to the task's difficulty. Use the cheapest model that can do the job.

- **Haiku**: mechanical work with a known path — git operations, file moves/renames, running an existing script, status checks, applying a known migration, sending an already-drafted email. Also all scheduled monitor tasks.
- **Sonnet**: the default for ordinary coding — bug fixes, UI changes, copy updates, component work.
- **Opus**: reserved for genuinely hard problems — system architecture, multi-service builds, or debugging that already defeated a cheaper model.

Escalate to a stronger model only after a cheaper one demonstrably fails.

## SEVEN CRITICAL INVARIANTS

These rules are **non-negotiable**. Violating them will break production.

### 1. Blog text = `text-left`
Never `text-center` or `text-justify` on body text. Applies to: BlogPost.tsx, BlogAnalysis.tsx, all blog components.

### 2. Emails use branded templates
Use `generateNewsletterEmail()`, `generateTransactionalEmail()`, or `wrapEmailContent()` from `lib/email-template.ts`. Never `processEmailContent` alone. Never raw HTML. Read `brand-email-manager` skill first.

### 3. Migrations are idempotent check-and-insert
Never `ON CONFLICT (slug)`. Always: `SELECT id INTO existing_post_id ... LIMIT 1` → `IF/ELSE` insert/update. Applies to every migration sent through `apply_migration`.

### 4. Client documents are generated, never authored
An invoice is a row in the `invoices` table; the PDF renders via `generateInvoicePdf`. Never hand-write invoice HTML or build a one-off PDF. Proposals are copied forward from the most recent one, never written from a blank file. See `client-documents`.

### 5. Deploy = merge to `main` + push + verify live URL
Follow `.agent/workflows/deploy-and-verify.md`. Never mark deployment complete without verification (see Deployment Verification Rule below).

### 6. Read the relevant skill BEFORE writing code
Use the keyword table above.

### 7. Produce evidence, not claims
Quote the rule you followed, show the rendered output, and make sure every check you run is capable of failing. See the Evidence Rule above.

## BLOG POST PUBLISHING RULE

Publishing a post is a **database write via the Supabase MCP server**. Read `supabase-mcp` and
`blog-publishing` first.

1. **Apply via MCP** — `apply_migration`, named `publish_blog_post_[slug]`
   - Use check-and-insert pattern (invariant #3)
   - Include title, slug, content, excerpt, SEO fields, published=true, status='published'
2. **Verify the write** — query the row back with `execute_sql`
3. **Verify the rendered post** at `https://www.thelostandunfounds.com/thelostarchives/[slug]`

**Never** write SQL files to `sql/` or `public/sql/`, and never hand SQL to the user to paste into
the Supabase dashboard. The `/sql` page, `src/pages/SQL.tsx` and the `SQL_FILES` endpoint were
removed — do not recreate them.

## EMAIL SENDING RULE
- Never claim you can't send email — use Zoho Mail integrations
- Test sends from an agent session go through the ADMIN WORK RULE queue (`send_invoice` with
  `test: true`, `direct_booking` invite with `testEmail`). The admin routes themselves need the
  owner's session.
- Required env vars: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_FROM_EMAIL`
- **Always CC `media@thelostandunfounds.com`** on media-related outbound mail — client and booking
  correspondence, invoices, quotes, proposals, shoot confirmations, photographer coordination. It is
  the business address of record, so the thread stays on file even when a reply goes to one person.
  Use the CC field, not BCC — recipients should see it. Never substitute a personal address for it.
  Bulk sends (newsletters, campaigns) are exempt: one CC per subscriber is not a business record.
  Verify the CC actually landed before treating a send as done — a dropped CC fails silently.

## TURNSTILE RULE

Owner rule, 2026-10-29: **every form someone can submit without signing in has Cloudflare
Turnstile.** That covers contact, support tickets, signups, bookings, submissions, applications,
and any endpoint that sends email to an address the visitor typed. Without it a bot can make the
platform mail strangers from our domain, which burns the sending reputation every client email
depends on. (It happened: SUP-0002, a bot through /contact, 2026-10-28.)

1. **Server:** call `verifyTurnstile(token, clientIp(req.headers), ['<action>'])` from
   `lib/api-handlers/_turnstile.ts` before doing anything else, and return its `status`/`error`
   when it fails. Never write another inline siteverify call. It follows Cloudflare's canonical
   check: `success`, the form's **action**, and a **hostname** we own (`www.` and the apex).
2. **Every form has its own action**, set on the widget (`action="…"`) and listed in the
   `TurnstileAction` type: `support`, `contact`, `newsletter`, `booking`. A token from one form
   is refused at another. On the client use `src/components/TurnstileField.tsx`.
3. **It fails closed in production.** A missing `TURNSTILE_SECRET_KEY` is a refusal, not a pass.
   Never add a "skip if the secret is unset" branch. That branch is how the newsletter check
   silently never ran.
4. **Client:** render `react-turnstile` with `VITE_TURNSTILE_SITE_KEY`, send the token as
   `turnstileToken`, remount the widget after each submit (tokens are single-use). Match
   `SupportRequestForm.tsx`: production host only, never on `localhost` or `*.vercel.app`.
5. **Signed-in users may skip it**, but only when the server verified their token
   (`verifyTurnstileUnlessSignedIn`). A client-side "logged in" flag is not proof. A form that
   *only* signed-in people can use needs no widget, but its endpoint must check the sign-in
   itself: the page requiring login protects nothing if the API doesn't.
6. **An endpoint that emails an address from the request** must either pass Turnstile, send only
   to the verified signed-in user's own address, or be admin-only. Never trust an `email` field
   alone.
7. A honeypot field is fine as an extra; it is never a substitute. Bots fill only visible fields.
8. Verify it in production: a submission with no token must come back `403`.

Widget site key `0x4AAAAAACAOHJSfRl-nikjS` (`VITE_TURNSTILE_SITE_KEY`). The server needs the
widget's **Secret Key** as `TURNSTILE_SECRET_KEY` in Vercel (production). The site key alone
only draws the checkbox; without the secret nothing checks it.

Covered (2026-10-29): Turnstile on support tickets and contact (`/api/support/tickets`), newsletter
signup, and booking requests (`/api/booking?action=request`: booking page and Express Booking).
Sign-in required on Submit Article's confirmation (sent only to the author's own address) and on
Submit Event's "submitted" notice (event owner only). Admin-only: the blog review emails
(published/approved/rejected/unpublished) and event approved/rejected emails.

## NEWSLETTER RESEND RULE
1. Query `newsletter_campaigns` (ordered by `created_at` desc, limit 1) using `.env.local` credentials
2. Inject Getting Started CTA before footer if not present
3. `/api/newsletter/send` is admin-only (owner session or `ADMIN_SECRET`). From an agent session,
   put the issue in `lib/newsletters/` and queue `send_newsletter`: `testEmail` first, then `confirm: true`

## ADMIN TUTORIAL RULE

Owner request, 2026-10-26, widened 2026-10-29: **every dashboard has walkthroughs, and every new
dashboard feature ships with one** — admin (`/admin`), member (`/dashboard`) and photographer
(`/photographer-dashboard`). Set the tour's `dashboard`. Admin tours live in SAGE MODE; the member
and photographer dashboards have a **?** button (bottom left) and a WELCOME pop-up on a person's
first visit, running the tour marked `intro`. A new dashboard gets a `data-tour-root`, a
`WhatsNewModal`, a `TourHelpButton` and an intro tour.

1. Add a tour to `src/components/admin/tour/tours.ts` with `group: 'new'` and `announce` set to
   the ship date. The dashboard then shows a NEW FEATURE pop-up once; **GO** starts the walkthrough
   (dimmed screen, white outline on each step's target).
2. **One step per control**, and walk into the feature: a step with `action: 'click'` waits for the
   owner to tap the outlined button (NEXT taps it for them), so the tour follows into the panel,
   tab, form or pop-up it opens. Never describe a screen the tour has not opened. Put
   `data-tour="<id>"` on each element a step points at. A step can first `route` to a page or open
   a console `panel`. Copy: name the thing, say what to do, stop.
3. If the feature has no way in from the dashboard, add one. A tour cannot point at a page you can
   only reach by typing its URL.
4. Changing an existing tool? Update its tour so the steps still match what is on screen. All tours
   are listed under TUTORIALS (SAGE MODE on → TUTORIALS, or the `/sagemode` page).

## DASHBOARD CLOCK RULE
Clock face click → cycles formats (Analog → Digital 12h → 24h). Top label click → cycles modes (Clock → Stopwatch → Timer). Use `e.stopPropagation()` on clock face clicks.

## BROWSER USAGE RULE

Applies to ANY tool that interacts with a web browser, or when asked to "browse", "check online", "verify url", or "search".

1. **Read first** — `.claude/skills/smart-browsing/SKILL.md` before the first browser action of a session.
2. **Single tab policy** — never open multiple tabs; reuse the existing tab/session.
3. **Page load protocol** — wait for visible UI elements or 15 seconds (whichever comes first) before calling a page "failed." Don't fail on an initial blank screen before that window elapses.

## DEPLOYMENT VERIFICATION RULE

After creating any deployment (Vercel or otherwise), you MUST before calling the task done:

1. **Check deployment status** — state is `READY`/`SUCCESS`, not an intermediate state (`BUILDING`, `QUEUED`) or a failure (`ERROR`, `CANCELED`)
2. **Review build logs** — check for errors/warnings/failures
3. **Verify the deployment URL** — fetch it and confirm it's accessible
4. **Confirm functionality** — exercise the key feature that changed

**Builds currently take about 5 minutes.** Do not treat `BUILDING` at the 30-second or 1-minute mark as a problem, and do not poll every 15s — that just burns calls on a build that was never going to be done. Wait ~5 minutes before the first status check, then poll every ~30–60s up to a 10-minute timeout. Report it's still building rather than guessing success. Never mark a deployment complete based on creation alone or on logs you didn't check.

**Never verify against production before the deploy carrying your change is `READY`.** Fetching a page or hitting an endpoint mid-build exercises the *previous* deployment, so a fix looks broken and an unfixed bug looks fixed. Both have happened. Confirm `READY` first, then verify.

## GRAPH STYLE RULE

Every chart on the platform draws in the hero revenue chart's dialect — see
`CHART_ACCENTS` and the `Sparkline` primitive in `src/components/ui/viz.tsx`:
monotone-smoothed 2px line, flat ~12% fill, r=2 data dots; bars are the accent at
10% for the track with a solid accent fill. Categories differ by **accent color
only** (revenue green-400, newsletter/analytics blue-400, affiliates purple-400,
bookings amber-500), never by dialect. Never introduce a new chart style.

## PAGE TITLE STYLE RULE

Main page titles (h1 headings — page titles, navigation/landing titles, major section titles) are **UPPERCASE**. Does NOT apply to error messages, loading states, success toasts, subheadings (h2+), body text, button labels, or form labels.

## SECURITY

- **Dependency security**: `npm audit` on request or via `dep-security` skill — check for CVEs, recommend updates.
- **Auth security**: review Supabase Auth config, Google OAuth setup, session management, RLS policies when asked about authentication.
- **API/DB security**: audit Supabase RLS policies, check for injection vectors when asked about API or database security.
- **Infra security**: check Vercel config, env vars, SSL/TLS, Cloudflare Turnstile when asked about infrastructure or deployment security.
- **Frontend security**: scan for XSS, exposed secrets, CSP headers when asked about frontend security.
- **Severity response** — critical (exposed secrets, active breach): treat as urgent, remediate immediately. High (SQL injection, RLS bypass): fix promptly, don't defer. Medium (missing headers, outdated deps): note and batch into normal work. There is no automated schedule — these run when asked or when something looks wrong, not on a timer.

## ENVIRONMENT VARIABLES

Use the script generator system instead of hand-writing setup scripts:

```bash
npm run generate-env-script <service>   # supabase | turnstile | telegram | openai
npm run validate-env                     # validate local + Vercel
npm run validate-env:local
npm run validate-env:vercel
```

See `secure-env-manager` skill for details.
