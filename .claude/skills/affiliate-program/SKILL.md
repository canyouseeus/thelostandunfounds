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
        Recorded in `mlm_earnings`; **no payout code pays MLM earnings yet**.
    -   **Identifiers**: Affiliates are identified by a unique `code`.
    -   **Tracking**: Cookie (`affiliate_ref`) and URL param (`?ref=CODE`).

2.  **King Midas (Gamification)**:
    -   **Concept**: A daily profit-sharing competition.
    -   **Pot**: **8%** of the site's total daily profit is allocated to the "King Midas Pot".
    -   **Days are Central time** (`America/Chicago`) everywhere — the RPC that writes
        `king_midas_daily_stats` and every reader. Never `toISOString().split('T')[0]`.
    -   **Distribution**:
        -   Rank 1: 50% of pot
        -   Rank 2: 30% of pot
        -   Rank 3: 10% of pot
        -   Rank 4+: Share of remaining 10%
    -   **Timing**: Rankings update hourly; payouts calculate daily — **in code only: neither the
        ranking cron, the King Midas distribution nor the Dec 25 Secret Santa distribution is
        scheduled in `vercel.json`.** Scheduling them moves money; the owner decides.

## Key Files & Structure

### Frontend
-   **Dashboard**: `src/pages/AffiliateDashboard.tsx` (Main hub for stats, links, and King Midas summary)
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
    -   Cron (Hourly): `api/cron/update-hourly-rankings.ts`
    -   Distribution (Daily): `lib/api-handlers/_king-midas-distribute-handler.ts`
-   **Payout System**:
    -   **Holding Period**: **only physical products** (`prodigi_order`) are held 30 days.
        Services, bookings, photos and tickets are payable as soon as the client's payment
        settles (owner's decision, 2026-10-20). Before any transfer, check the platform's
        **available** Stripe balance — card payments sit in "pending" ~2 business days.
    -   **Logic**: 
        -   `available_date` = sale time (+ 30 days for `prodigi_order` only).
        -   **Available Balance**: `status='approved'` AND `available_date <= NOW()`.
        -   **Pending Balance**: `status='pending'` OR (`status='approved'` AND `available_date > NOW()`).
    -   **Cron (Hourly)**: `api/cron/process-payouts.ts` (Sends `{ "processAll": true }`)
    -   **Handler**: `lib/api-handlers/admin/process-payouts.ts` (Handles `processAll` to pay ALL approved requests)
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
    Money moves into them with a Payout whose `payout_method` is the financial account id.
    No sweep is built yet — never claim one happened.
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
1.  Check `king_midas_daily_stats` for the current date.
2.  Verify `update-hourly-rankings` cron is running (requires `CRON_SECRET`).

### Critical Rules
-   **Integration**: King Midas is NOT separate. It is the gamification engine OF the affiliate program. Always treat them as a unified feature set.
-   **Routes**: 
    -   Public Leaderboard: `/king-midas-leaderboard`
    -   Affiliate Dashboard: `/affiliate/dashboard`
