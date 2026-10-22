---
name: affiliate-program
description: Context and instructions for the Affiliate Program and King Midas Gamification system. Use when working on commission logic, MLM tiers, King Midas pot distribution, affiliate onboarding, or leaderboard features.
---

# Affiliate Program & King Midas

This skill provides context on "The Lost+Unfounds" Affiliate Program, which includes a standard commission system and the "King Midas" gamification layer.

## Core Concepts

1.  **Affiliate Program**: 
    -   **Commission**: 42% lifetime commission on referred customer sales — **42% of PROFIT**
        (price − cost), never of gross. Cost for a service job is `invoices.job_cost`, else the
        photographer's `contractor_payout` (e.g. Eric's 80% on Airbnb shoots).
    -   **MLM**: 2-tier bonus system (Level 1: 2%, Level 2: 1%), also of profit. Every new
        affiliate's upline defaults to the owner's code `THELOSTANDUNFOUNDS`.
        **Payable** since #296: each upline share writes an `affiliate_commissions` row
        (`source_table` `mlm_level1` / `mlm_level2`) on the sale's terms, paid through the
        normal payout path. `mlm_earnings` stays as the who-earned-from-whom record
        (`supabase/migrations/20261021000000_mlm_earnings_payable.sql`).
        Craigslist bans MLM in job ads — leave the upline bonus out of Craigslist posts.
    -   **Identifiers**: Affiliates are identified by a unique `code`.
    -   **Tracking**: Cookie (`affiliate_ref`) and URL param (`?ref=CODE`).

2.  **King Midas (Gamification)**:
    -   **Concept**: A daily profit-sharing competition.
    -   **Pot**: **8%** of the site's total daily profit is allocated to the "King Midas Pot".
    -   **Days are Central time** (`America/Chicago`) everywhere — the RPC that writes
        `king_midas_daily_stats` and every reader. Never `toISOString().split('T')[0]`.
    -   **Distribution** (`distribute_king_midas(date)` SQL function, ranked by the day's
        `profit_generated`; the owner's own affiliate competes):
        -   Rank 1: 50% of pot
        -   Rank 2: 30% of pot
        -   Rank 3: 10% of pot
        -   Rank 4+: split the remaining 10% evenly, rounded down to the cent
        -   Whatever nobody qualifies for (fewer than 4 on the board, cent rounding) goes to
            that year's Secret Santa pot.
    -   **Payout**: winnings are written as `approved` `affiliate_commissions` rows
        (`source_table` `king_midas`), so they show in balances and pay like commissions. One
        transaction; a day pays at most once; a day that hasn't ended is refused.
    -   **Schedule** (`vercel.json`, since #297): `/api/shop/king-midas/distribute` daily at
        `15 6 * * *` UTC (just after midnight Central) for the Central day that just ended.
    -   **Hourly rankings are NOT scheduled.** `api/cron/update-hourly-rankings.ts` exists
        (rank-change snapshots) but is not in `vercel.json`. The daily payout doesn't need it:
        the SQL function ranks on its own. A leaderboard that claims hourly updates may be stale.

3.  **Secret Santa**: 3% of profit, plus King Midas leftovers. Pays **Dec 25**, weighted by
    reward points earned that year (Central), active affiliates only
    (`distribute_secret_santa(year)`; refused before Dec 25; a year pays once). Scheduled:
    `/api/cron/distribute-secret-santa` at `15 14 25 12 *` UTC (8:15 AM CST). Functions live
    in `supabase/migrations/20261021010000_king_midas_secret_santa_payouts.sql`.

4.  **Taxes**: handled by Stripe Connect — affiliates get their tax records through their
    Stripe account (owner's statement, 2026-10-22). Nothing in this repo collects or files tax
    forms; don't build one.

## Key Files & Structure

### Frontend
-   **Dashboard**: `src/pages/Affiliate.tsx`, served at `/:username/profile` (stats, links, King
    Midas summary). `/affiliate/dashboard` and `/affiliate-dashboard` redirect to `/dashboard`.
-   **King Midas**:
    -   `src/pages/KingMidasLeaderboard.tsx` (Public leaderboard)
    -   `src/components/KingMidasTicker.tsx` (Live scrolling ticker)
    -   `src/components/KingMidasView.tsx` (Component used in dashboard)
-   **Tracking Utils**:
    -   `src/utils/affiliate-tracking.ts` (Active source of truth - consolidate here)
    -   `src/components/affiliate/ReferralLink.tsx` (Where links are generated)

### Backend (API & Lib)
-   **Tracking**: `api/shop/affiliates/track-click.ts` -> `lib/api-handlers/_affiliates-track-click-handler.ts`
-   **King Midas**:
    -   Rank snapshots: `api/cron/update-hourly-rankings.ts` (**not scheduled**)
    -   Distribution (daily, scheduled): `lib/api-handlers/_king-midas-distribute-handler.ts`
        → `distribute_king_midas` RPC. Accepts `CRON_SECRET` or a verified admin session only.
-   **Secret Santa**: `api/cron/distribute-secret-santa.ts` and
    `lib/api-handlers/affiliates/distribute-secret-santa.ts` (admin-only) → `distribute_secret_santa` RPC.
-   **Payout System**:
    -   **Holding Period**: **only physical products** (`prodigi_order`) are held 30 days.
        Services, bookings, photos and tickets are payable as soon as the client's payment
        settles (owner's decision, 2026-10-20). Before any transfer, check the platform's
        **available** Stripe balance — card payments sit in "pending" ~2 business days.
    -   **Logic**: 
        -   `available_date` = sale time (+ 30 days for `prodigi_order` only).
        -   **Available Balance**: `status='approved'` AND `available_date <= NOW()`.
        -   **Pending Balance**: `status='pending'` OR (`status='approved'` AND `available_date > NOW()`).
    -   **There is no payout cron.** `api/cron/process-payouts.ts` and
        `lib/api-handlers/admin/process-payouts.ts` no longer exist (the docs in `scripts/tests/`
        that mention them are stale). Money leaves two ways:
        -   **Affiliate requests it**: `lib/api-handlers/affiliates/request-payout.ts` — $10
            minimum, Stripe Connect payouts enabled, amount ≤ the affiliate's available balance,
            then an immediate `stripe.transfers.create`. It does **not** check the platform's
            available Stripe balance first; a short balance makes Stripe reject the transfer.
        -   **Admin job**: `affiliate_payout` in `lib/api-handlers/admin/_jobs.ts` — checks the
            platform's available balance; short → `waiting_funds`, retried hourly for 3 days.
    -   **Stripe Connect**: `lib/api-handlers/affiliates/connect-onboarding.ts` + `_stripe-client.ts`. Payouts are Stripe-only; PayPal is retired.
        -   Account creation / Account Link minting lives in `_connect-account.ts` and is **shared**. Never call `stripe.accounts.create` for an affiliate from a new file — you'll strand commissions on a duplicate Express account.
        -   **Onboarding reminders**: affiliates who never connect Stripe are nudged daily by `api/cron/affiliate-stripe-reminder.ts` (24h grace, 7-day cooldown, 4 max). The email's one-click link goes to `/api/affiliates/stripe-resume?token=…`, which mints a *fresh* Account Link — Account Links expire in minutes, so never put one in an email. See `.agent/workflows/affiliate-stripe-reminders.md`.
-   **The one commission writer** is the `register_referral_conversion` RPC
    (`supabase/migrations/20261020000000_affiliate_profit_split.sql`), reached only through
    `triggerReferralCommission()` in `lib/api-handlers/affiliates/_commission-trigger.ts`. In one
    transaction it writes the 42% commission, MLM, King Midas daily profit, Secret Santa 3%,
    1 point per $10 profit and the counters. Idempotent on (source, order id). Never add a
    second path; `/api/affiliates/calculate-commission` was retired for being one.
-   **Customer tie**: `affiliate_customers` (email → affiliate), for life, never overwritten.
    Tie a client with `tieClientToReferrer()` (`_referral-tie.ts`). A referrer who isn't an
    affiliate yet is parked on `clients.pending_referrer_email` and tied when they sign up.
-   **Owner's own affiliate** (`THELOSTANDUNFOUNDS`): earns 42% on clients the owner refers
    (e.g. Kelly Kohler). Paid like any affiliate, to the owner's Stripe Connect account
    `acct_1TdzeP2Z4XPVWLVL`.
-   **Pots**: King Midas Pot and Secret Santa are Stripe financial accounts
    (`fa_65Vc0ZpAuxheTRvd98q16UbOGOJESQ1Wd0tevkXEB3wDSi`, `fa_65Vc0ZPs07Y7q1ibQPv16UbOGOJESQ1Wd0tevkXEB3wOEa`).
    Money moves into them with a Payout whose `payout_method` is the financial account id, via
    the `move_funds` admin job (`to: "king_midas" | "secret_santa"`). No automatic sweep is
    built — the daily distribution writes commission rows, it doesn't fund the account. Never
    claim a sweep happened.
-   **Database Schema**:
    -   `affiliates` (Profiles, points)
    -   `affiliate_customers` (Lifetime bindings)
    -   `king_midas_daily_stats` (Daily rankings)
    -   `king_midas_payouts` (Pot distributions)

## Common Tasks

### Verify Affiliate Tracking
When touching checkout or payments, ensure:
1.  `initAffiliateTracking()` is called (usually in `Layout.tsx`).
2.  The Stripe Checkout Session creation path forwards the `X-Affiliate-Ref` header.

### King Midas debugging
If rankings look wrong:
1.  Check `king_midas_daily_stats` for the date (a Central date).
2.  Check `king_midas_payouts` for that date — a row means the day already paid and won't re-run.
3.  Remember `update-hourly-rankings` is not scheduled, so intra-day ranks may never refresh.

### Before trusting this skill
Payout code changes faster than this file. Before stating what the program does, check
`vercel.json` crons and the latest migrations touching `register_referral_conversion` /
`distribute_*`. If they disagree with this file, the code wins — fix this file.

### Critical Rules
-   **Integration**: King Midas is NOT separate. It is the gamification engine OF the affiliate program. Always treat them as a unified feature set.
-   **Routes**: 
    -   Public Leaderboard: `/king-midas-leaderboard`
    -   Affiliate Dashboard: `/:username/profile` (`/affiliate/dashboard` redirects to `/dashboard`)
    -   Sign-up: `/become-affiliate`
