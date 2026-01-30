---
name: affiliate-program
description: Context and instructions for the Affiliate Program and King Midas Gamification system
---

# Affiliate Program & King Midas

This skill provides context on "The Lost+Unfounds" Affiliate Program, which includes a standard commission system and the "King Midas" gamification layer.

## Core Concepts

1.  **Affiliate Program**: 
    -   **Commission**: 42% lifetime commission on referred customer sales.
    -   **MLM**: 2-tier bonus system (Level 1: 2%, Level 2: 1%).
    -   **Identifiers**: Affiliates are identified by a unique `code`.
    -   **Tracking**: Cookie (`affiliate_ref`) and URL param (`?ref=CODE`).

2.  **King Midas (Gamification)**:
    -   **Concept**: A daily profit-sharing competition.
    -   **Pot**: **8%** of the site's total daily profit is allocated to the "King Midas Pot".
    -   **Distribution**:
        -   Rank 1: 50% of pot
        -   Rank 2: 30% of pot
        -   Rank 3: 10% of pot
        -   Rank 4+: Share of remaining 10%
    -   **Timing**: Rankings update hourly; payouts calculate daily.

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
    -   **Holding Period**: 30-day rolling buffer to prevent chargebacks.
    -   **Logic**: 
        -   `available_date` = `created_at` + 30 days.
        -   **Available Balance**: `status='approved'` AND `available_date <= NOW()`.
        -   **Pending Balance**: `status='pending'` OR (`status='approved'` AND `available_date > NOW()`).
    -   **Cron (Hourly)**: `api/cron/process-payouts.ts` (Sends `{ "processAll": true }`)
    -   **Handler**: `lib/api-handlers/admin/process-payouts.ts` (Handles `processAll` to pay ALL approved requests)
    -   **PayPal**: `lib/api-handlers/admin/paypal-payouts.ts` (Direct Payouts API integration)
-   **Database Schema**:
    -   `affiliates` (Profiles, points)
    -   `affiliate_customers` (Lifetime bindings)
    -   `king_midas_daily_stats` (Daily rankings)
    -   `king_midas_payouts` (Pot distributions)

## Common Tasks

### Verify Affiliate Tracking
When touching checkout or payments, ensure:
1.  `initAffiliateTracking()` is called (usually in `Layout.tsx`).
2.  `getPayPalCheckoutUrl` includes `X-Affiliate-Ref` header.

### King Midas debugging
If rankings look wrong:
1.  Check `king_midas_daily_stats` for the current date.
2.  Verify `update-hourly-rankings` cron is running (requires `CRON_SECRET`).

### Critical Rules
-   **Integration**: King Midas is NOT separate. It is the gamification engine OF the affiliate program. Always treat them as a unified feature set.
-   **Routes**: 
    -   Public Leaderboard: `/king-midas-leaderboard`
    -   Affiliate Dashboard: `/affiliate/dashboard`
