# Test Data Reference Guide - 50 Affiliates

**All components and features use these consistent test affiliate codes.**

## Overview

- **Total Test Affiliates**: 50
- **Active**: 48
- **Inactive**: 1
- **Suspended**: 1
- **Total Site Earnings**: $35,280.00
- **King Midas Daily Pot**: $2,822.40 (8%)

## Test Affiliate Code Structure

### 🏆 Top Tier - KING01-KING05 (5 affiliates)
Elite performers earning $1,720 - $2,850

| Code | Rank | Earnings | Conversions | Commission Rate | Status |
|------|------|----------|-------------|-----------------|---------|
| KING01 | #1 | $2,850.00 | 98 | 42% | Active |
| KING02 | #2 | $2,620.00 | 89 | 42% | Active |
| KING03 | #3 | $2,280.00 | 82 | 42% | Active |
| KING04 | #4 | $1,950.00 | 74 | 42% | Active |
| KING05 | #5 | $1,720.00 | 68 | 42% | Active |

### 💼 High Tier - PRO01-PRO10 (10 affiliates)
Strong performers earning $800 - $1,450

| Code | Rank | Earnings | Conversions | Commission Rate |
|------|------|----------|-------------|-----------------|
| PRO01 | #6 | $1,450.00 | 62 | 42% |
| PRO02 | #7 | $1,320.00 | 58 | 42% |
| PRO03 | #8 | $1,200.00 | 54 | 42% |
| PRO04 | #9 | $1,120.00 | 51 | 42% |
| PRO05 | #10 | $1,050.00 | 48 | 42% |
| PRO06 | #11 | $980.00 | 45 | 42% |
| PRO07 | #12 | $920.00 | 42 | 42% |
| PRO08 | #13 | $870.00 | 39 | 42% |
| PRO09 | #14 | $830.00 | 37 | 42% |
| PRO10 | #15 | $800.00 | 35 | 42% |

### 📊 Mid Tier - MID01-MID15 (15 affiliates)
Moderate performers earning $360 - $760

| Code | Rank | Earnings | Conversions | Commission Rate |
|------|------|----------|-------------|-----------------|
| MID01 | #16 | $760.00 | 32 | 42% |
| MID02 | #17 | $720.00 | 30 | 42% |
| MID03 | #18 | $680.00 | 28 | 42% |
| MID04 | #19 | $640.00 | 26 | 42% |
| MID05 | #20 | $600.00 | 24 | 42% |
| MID06 | #21 | $570.00 | 23 | 42% |
| MID07 | #22 | $540.00 | 22 | 42% |
| MID08 | #23 | $510.00 | 21 | 42% |
| MID09 | #24 | $480.00 | 20 | 42% |
| MID10 | #25 | $460.00 | 19 | 42% |
| MID11 | #26 | $440.00 | 18 | 42% |
| MID12 | #27 | $420.00 | 17 | 42% |
| MID13 | #28 | $400.00 | 16 | 42% |
| MID14 | #29 | $380.00 | 15 | 42% |
| MID15 | #30 | $360.00 | 14 | 42% |

### 🌱 New Tier - NEW01-NEW18 (18 affiliates)
Newer affiliates earning $50 - $340

| Code | Rank | Earnings | Conversions | Commission Rate |
|------|------|----------|-------------|-----------------|
| NEW01 | #31 | $340.00 | 13 | 42% |
| NEW02 | #32 | $320.00 | 12 | 42% |
| NEW03 | #33 | $300.00 | 11 | 42% |
| NEW04 | #34 | $280.00 | 10 | 42% |
| NEW05 | #35 | $260.00 | 9 | 42% |
| NEW06 | #36 | $240.00 | 8 | 42% |
| NEW07 | #37 | $220.00 | 8 | 42% |
| NEW08 | #38 | $200.00 | 7 | 42% |
| NEW09 | #39 | $185.00 | 7 | 42% |
| NEW10 | #40 | $170.00 | 6 | 42% |
| NEW11 | #41 | $155.00 | 6 | 42% |
| NEW12 | #42 | $140.00 | 5 | 42% |
| NEW13 | #43 | $125.00 | 5 | 42% |
| NEW14 | #44 | $110.00 | 4 | 42% |
| NEW15 | #45 | $95.00 | 4 | 42% |
| NEW16 | #46 | $80.00 | 3 | 42% |
| NEW17 | #47 | $65.00 | 3 | 42% |
| NEW18 | #48 | $50.00 | 2 | 42% |

### ⚠️ Special Cases (2)
| Code | Status | Earnings | Commission Rate | Purpose |
|------|--------|----------|-----------------|---------|
| INACTIVE | Inactive | $0.00 | 42% | Test inactive behavior |
| SUSPEND | Suspended | $180.00 | 42% | Test suspended handling |

## King Midas Ticker Display

The ticker shows **top 10 only** with rank changes:

```
🏆 #1 KING01 $2,850.00 -
🏆 #2 KING02 $2,620.00 🔺1
🏆 #3 KING03 $2,280.00 🔻1
#4 KING04 $1,950.00 -
#5 KING05 $1,720.00 🔺2
#6 PRO01 $1,450.00 🔻1
#7 PRO02 $1,320.00 -
#8 PRO03 $1,200.00 🔺1
#9 PRO04 $1,120.00 🔻1
#10 PRO05 $1,050.00 -
Site Profit Today: $35,280.00
🏆 King Midas Pot: $2,822.40
(Demo Data)
```

## Rank Change Indicators

Simulated rank changes for ticker display:
- **KING01**: No change (dominant #1)
- **KING02**: ↑1 (moved up)
- **KING03**: ↓1 (moved down)
- **KING04**: No change
- **KING05**: ↑2 (strong improvement)
- **PRO01**: ↓1 (slipped)
- **PRO02**: No change
- **PRO03**: ↑1 (climbing)
- **PRO04**: ↓1 (slipped)
- **PRO05**: No change

## Default Test Affiliate

**Default for all dashboards and profiles**: `KING01`

### Where to Change Default

```typescript
// AffiliateDashboard.tsx (line 91)
const affiliateCode = 'KING01' // Change to any code for testing

// AffiliateProfile.tsx (line 51)
const affiliateCode = 'KING01' // Change to any code for testing
```

## Testing Different Scenarios

### Test Top Performer
```bash
# Use KING01 - highest earner
/shop?ref=KING01
```

### Test Mid-Tier
```bash
# Use MID08 - middle of the pack
/shop?ref=MID08
```

### Test New Affiliate
```bash
# Use NEW15 - lower earnings
/shop?ref=NEW15
```

### Test Edge Cases
```bash
# Inactive (should not track)
/shop?ref=INACTIVE

# Suspended (should not track new commissions)
/shop?ref=SUSPEND
```

## Components Using Test Data

### 1. KingMidasTicker
- **Location**: `src/components/KingMidasTicker.tsx`
- **Shows**: Top 10 with rank changes
- **Fallback**: Uses KING01-PRO05 dummy data

### 2. AffiliateDashboard
- **Location**: `src/pages/AffiliateDashboard.tsx`
- **Default**: KING01
- **Shows**: Full stats, earnings, commissions, King Midas history

### 3. AffiliateProfile
- **Location**: `src/pages/AffiliateProfile.tsx`
- **Default**: KING01
- **Shows**: Profile details, performance metrics

### 4. KingMidasLeaderboard
- **Location**: `src/pages/KingMidasLeaderboard.tsx`
- **Shows**: All 50 affiliates ranked by profit

## Database Seed Script

**Location**: `scripts/seeds/affiliate/seed-affiliate-dummy-data.sql`

### What it Creates
1. ✅ 50 test affiliates (KING, PRO, MID, NEW tiers)
2. ✅ 30 days of commission history (random distribution)
3. ✅ Daily King Midas rankings for all dates
4. ✅ King Midas payouts for top 3 finishers
5. ✅ Product costs for profit calculations
6. ✅ Realistic conversion rates and click tracking

### Running the Seed Script

```bash
# Option 1: Using npm script
npm run sql scripts/seeds/affiliate/seed-affiliate-dummy-data.sql

# Option 2: Manual in Supabase SQL Editor
# Copy the file contents and paste into Supabase SQL Editor
```

### Verification After Seeding

```sql
-- Should return 50 rows
SELECT COUNT(*) FROM affiliates WHERE code LIKE 'KING%' OR code LIKE 'PRO%' OR code LIKE 'MID%' OR code LIKE 'NEW%';

-- Should show top 10 ranked by earnings
SELECT code, total_earnings, total_conversions, status 
FROM affiliates 
WHERE status = 'active'
ORDER BY total_earnings DESC 
LIMIT 10;

-- Check today's King Midas rankings
SELECT a.code, kds.profit_generated, kds.rank, kds.pool_share
FROM king_midas_daily_stats kds
JOIN affiliates a ON kds.affiliate_id = a.id
WHERE kds.date = CURRENT_DATE
ORDER BY kds.rank ASC
LIMIT 10;
```

## Expected Results

After seeding, you should see:

### ✅ Ticker
- Top 10: KING01, KING02, KING03, KING04, KING05, PRO01-PRO05
- Rank changes displayed with arrows
- Site profit: $35,280.00
- King Midas pot: $2,822.40

### ✅ Dashboard (KING01)
- Total earnings: $2,850.00
- Conversions: 98
- Commission rate: 15%
- Current rank: #1

### ✅ Leaderboard
- All 50 affiliates listed
- Ranked by total profit
- KING01 at top, NEW18 at bottom

## Important Notes

### ⚠️ Consistency Rules
1. **ALWAYS** use these exact codes (KING01, PRO05, MID10, NEW03, etc.)
2. **NEVER** create different test codes
3. **UPDATE** this file if structure changes
4. **DEFAULT** to KING01 for all testing

### Commission Rate
- **42%**: All affiliates (consistent with production default)

### Status Values
- **active** (48): Can earn commissions, shows in rankings
- **inactive** (1): Cannot earn, doesn't show in rankings
- **suspended** (1): Has past data but cannot earn new commissions

## Quick Reference

| Need | Use This Code |
|------|---------------|
| Top performer | KING01 |
| Mid-tier | MID08 |
| New affiliate | NEW10 |
| Inactive test | INACTIVE |
| Suspended test | SUSPEND |
| Leaderboard #10 | PRO05 |
| Just outside top 10 | PRO06 |
| Near bottom | NEW17 |

---

**Last Updated**: 2024-11-21
**Total Affiliates**: 50
**Structure**: KING (5) + PRO (10) + MID (15) + NEW (18) + Special (2)
