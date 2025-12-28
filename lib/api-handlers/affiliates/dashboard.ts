import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type PostgrestError } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMoney = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

const safeDivide = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

const isMissingRelationError = (error?: PostgrestError | null) =>
  Boolean(error?.message && error.message.toLowerCase().includes('does not exist'));

const isMissingColumnError = (error: PostgrestError | null, column: string) =>
  Boolean(
    error?.message &&
    error.message.toLowerCase().includes('column') &&
    error.message.toLowerCase().includes(column.toLowerCase()) &&
    error.message.toLowerCase().includes('does not exist')
  );

async function fetchAffiliateByColumn(column: string, code: string) {
  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq(column, code)
    .limit(1);

  if (error) {
    if (isMissingColumnError(error, column)) {
      console.warn(`[affiliates-dashboard] Column "${column}" not found when searching affiliate.`);
      return null;
    }
    throw error;
  }

  return data?.[0] ?? null;
}

async function fetchAffiliate(code: string) {
  const trimmedCode = code.trim();
  if (!trimmedCode) return null;

  const affiliateByCode = await fetchAffiliateByColumn('code', trimmedCode);
  if (affiliateByCode) return affiliateByCode;

  // Fallback for legacy column name
  return fetchAffiliateByColumn('affiliate_code', trimmedCode);
}

/**
 * Calculate available and pending balance from commissions
 */
async function getBalanceBreakdown(affiliateId: string) {
  const now = new Date().toISOString();
  
  // Get available commissions (past holding period, still pending payment)
  const { data: availableCommissions, error: availableError } = await supabase
    .from('affiliate_commissions')
    .select('amount, available_date')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'pending')
    .not('available_date', 'is', null)
    .lte('available_date', now);

  // Get pending commissions (still in holding period)
  const { data: pendingCommissions, error: pendingError } = await supabase
    .from('affiliate_commissions')
    .select('amount, available_date')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'pending')
    .or(`available_date.is.null,available_date.gt.${now}`)
    .order('available_date', { ascending: true });

  // Get total paid out
  const { data: paidCommissions, error: paidError } = await supabase
    .from('affiliate_commissions')
    .select('amount')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'paid');

  // Get cancelled commissions (for transparency)
  const { data: cancelledCommissions, error: cancelledError } = await supabase
    .from('affiliate_commissions')
    .select('amount, cancelled_reason, cancelled_at, order_id')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'cancelled')
    .order('cancelled_at', { ascending: false })
    .limit(10);

  const available = (availableCommissions || []).reduce(
    (sum, c) => sum + toMoney(toNumber(c.amount)),
    0
  );

  const pending = (pendingCommissions || []).reduce(
    (sum, c) => sum + toMoney(toNumber(c.amount)),
    0
  );

  const totalPaid = (paidCommissions || []).reduce(
    (sum, c) => sum + toMoney(toNumber(c.amount)),
    0
  );

  const totalCancelled = (cancelledCommissions || []).reduce(
    (sum, c) => sum + toMoney(toNumber(c.amount)),
    0
  );

  // Calculate upcoming availability breakdown
  const upcomingAvailability: { date: string; amount: number }[] = [];
  const pendingByDate = new Map<string, number>();
  
  for (const commission of (pendingCommissions || [])) {
    if (commission.available_date) {
      const date = commission.available_date.split('T')[0];
      const current = pendingByDate.get(date) || 0;
      pendingByDate.set(date, current + toMoney(toNumber(commission.amount)));
    }
  }

  // Sort by date and take first 5
  const sortedDates = Array.from(pendingByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5);
  
  for (const [date, amount] of sortedDates) {
    upcomingAvailability.push({ date, amount: toMoney(amount) });
  }

  return {
    available_balance: toMoney(available),
    pending_balance: toMoney(pending),
    total_paid: toMoney(totalPaid),
    total_cancelled: toMoney(totalCancelled),
    total_lifetime: toMoney(available + pending + totalPaid),
    upcoming_availability: upcomingAvailability,
    recent_cancellations: (cancelledCommissions || []).map(c => ({
      amount: toMoney(toNumber(c.amount)),
      reason: c.cancelled_reason || 'Unknown',
      cancelled_at: c.cancelled_at,
      order_id: c.order_id
    }))
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const affiliateCode = (req.query.affiliate_code || req.query.code) as string | undefined;

  if (!affiliateCode) {
    return res.status(400).json({ error: 'affiliate_code query param is required' });
  }

  try {
    const affiliate = await fetchAffiliate(affiliateCode);

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const affiliateId = affiliate.id;
    const code = affiliate.code || affiliate.affiliate_code || affiliateCode.trim().toUpperCase();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const [
      recentCommissionsResult,
      last30CommissionsResult,
      kingMidasStatsResult,
      kingMidasPayoutsResult,
      balanceBreakdown
    ] = await Promise.all([
      supabase
        .from('affiliate_commissions')
        .select('id, order_id, amount, profit_generated, source, status, created_at, available_date, cancelled_reason, cancelled_at')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('affiliate_commissions')
        .select('id, amount, profit_generated, status, created_at, available_date')
        .eq('affiliate_id', affiliateId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('king_midas_daily_stats')
        .select('date, profit_generated, rank, pool_share')
        .eq('affiliate_id', affiliateId)
        .order('date', { ascending: false })
        .limit(60),
      supabase
        .from('king_midas_payouts')
        .select('id, date, rank, pool_amount, status, paid_at')
        .eq('affiliate_id', affiliateId)
        .order('date', { ascending: false })
        .limit(100),
      getBalanceBreakdown(affiliateId)
    ]);

    if (recentCommissionsResult.error && !isMissingRelationError(recentCommissionsResult.error)) {
      throw recentCommissionsResult.error;
    }
    if (last30CommissionsResult.error && !isMissingRelationError(last30CommissionsResult.error)) {
      throw last30CommissionsResult.error;
    }
    if (kingMidasStatsResult.error && !isMissingRelationError(kingMidasStatsResult.error)) {
      throw kingMidasStatsResult.error;
    }
    if (kingMidasPayoutsResult.error && !isMissingRelationError(kingMidasPayoutsResult.error)) {
      throw kingMidasPayoutsResult.error;
    }

    const recentCommissionsRaw = recentCommissionsResult.data ?? [];
    const last30CommissionsRaw = last30CommissionsResult.data ?? [];
    const kingMidasStatsRaw = kingMidasStatsResult.data ?? [];
    const kingMidasPayoutsRaw = kingMidasPayoutsResult.data ?? [];

    const totalCommissionAmount30 = last30CommissionsRaw.reduce(
      (sum, item) => sum + toNumber(item.amount),
      0
    );
    const totalProfitGenerated30 = last30CommissionsRaw.reduce(
      (sum, item) => sum + toNumber(item.profit_generated),
      0
    );
    const totalCommissions30 = last30CommissionsRaw.length;

    const approvedCommissions = last30CommissionsRaw.filter(item =>
      ['approved', 'paid'].includes(String(item.status || '').toLowerCase())
    ).length;
    const pendingCommissions = last30CommissionsRaw.filter(
      item => String(item.status || '').toLowerCase() === 'pending'
    ).length;
    const cancelledCommissions = last30CommissionsRaw.filter(
      item => String(item.status || '').toLowerCase() === 'cancelled'
    ).length;

    const profitByDay = new Map<string, number>();
    last30CommissionsRaw.forEach(item => {
      const day = new Date(item.created_at).toISOString().split('T')[0];
      const currentProfit = profitByDay.get(day) || 0;
      profitByDay.set(day, currentProfit + toNumber(item.profit_generated));
    });

    let bestDay: { date: string; profit: number } | null = null;
    profitByDay.forEach((profit, date) => {
      if (!bestDay || profit > bestDay.profit) {
        bestDay = { date, profit };
      }
    });

    const last7Profit = last30CommissionsRaw
      .filter(item => new Date(item.created_at) >= sevenDaysAgo)
      .reduce((sum, item) => sum + toNumber(item.profit_generated), 0);
    const prev7Profit = last30CommissionsRaw
      .filter(item => {
        const created = new Date(item.created_at);
        return created >= fourteenDaysAgo && created < sevenDaysAgo;
      })
      .reduce((sum, item) => sum + toNumber(item.profit_generated), 0);

    const profitTrend7d =
      prev7Profit === 0
        ? (last7Profit > 0 ? 100 : 0)
        : ((last7Profit - prev7Profit) / prev7Profit) * 100;

    const top3Finishes = kingMidasStatsRaw.filter(
      stat => typeof stat.rank === 'number' && stat.rank > 0 && stat.rank <= 3
    ).length;
    const firstPlaceFinishes = kingMidasStatsRaw.filter(stat => stat.rank === 1).length;
    const currentRank = kingMidasStatsRaw[0]?.rank ?? null;

    const totalKingMidasEarnings = kingMidasPayoutsRaw.reduce(
      (sum, payout) => sum + toNumber(payout.pool_amount),
      0
    );
    const pendingPayouts = kingMidasPayoutsRaw.filter(
      payout => String(payout.status || '').toLowerCase() === 'pending'
    ).length;
    const paidPayouts = kingMidasPayoutsRaw.filter(
      payout => String(payout.status || '').toLowerCase() === 'paid'
    ).length;

    const affiliatePayload = {
      id: affiliateId,
      user_id: affiliate.user_id,
      code,
      affiliate_code: code,
      status: affiliate.status || 'active',
      commission_rate: toNumber(affiliate.commission_rate ?? 0),
      // Use calculated balances instead of stored total_earnings
      available_balance: balanceBreakdown.available_balance,
      pending_balance: balanceBreakdown.pending_balance,
      total_earnings: balanceBreakdown.total_lifetime, // For backwards compatibility
      total_paid: balanceBreakdown.total_paid,
      total_clicks: affiliate.total_clicks || 0,
      total_conversions: affiliate.total_conversions || 0,
      reward_points: affiliate.reward_points || 0,
      discount_credit_balance: toNumber(affiliate.discount_credit_balance ?? 0),
      total_mlm_earnings: toNumber(affiliate.total_mlm_earnings ?? 0),
      last_discount_use_date: affiliate.last_discount_use_date,
      commission_mode: affiliate.commission_mode || 'cash',
      created_at: affiliate.created_at,
      updated_at: affiliate.updated_at
    };

    const overview = {
      total_commissions: totalCommissions30,
      total_commission_amount: totalCommissionAmount30,
      total_profit_generated: totalProfitGenerated30,
      approved_commissions: approvedCommissions,
      pending_commissions: pendingCommissions,
      cancelled_commissions: cancelledCommissions,
      total_king_midas_earnings: totalKingMidasEarnings,
      pending_payouts: pendingPayouts,
      paid_payouts: paidPayouts,
      top_3_finishes: top3Finishes,
      first_place_finishes: firstPlaceFinishes,
      current_rank: currentRank,
      profit_trend_7d: Number(profitTrend7d.toFixed(2)),
      best_day: bestDay,
      average_commission: safeDivide(totalCommissionAmount30, totalCommissions30),
      average_profit: safeDivide(totalProfitGenerated30, totalCommissions30),
      conversion_rate:
        safeDivide(affiliatePayload.total_conversions, affiliatePayload.total_clicks) * 100,
      total_king_midas_pool_share: kingMidasStatsRaw.reduce(
        (sum, stat) => sum + toNumber(stat.pool_share),
        0
      ),
      total_king_midas_profit: kingMidasStatsRaw.reduce(
        (sum, stat) => sum + toNumber(stat.profit_generated),
        0
      )
    };

    const recentCommissions = recentCommissionsRaw.map(item => ({
      ...item,
      amount: toNumber(item.amount),
      profit_generated: toNumber(item.profit_generated),
      // Include new fields for transparency
      available_date: item.available_date,
      cancelled_reason: item.cancelled_reason,
      cancelled_at: item.cancelled_at,
      // Human-readable status
      status_label: getStatusLabel(item.status, item.available_date)
    }));

    const kingMidas = {
      recent_stats: kingMidasStatsRaw.slice(0, 7).map(stat => ({
        date: stat.date,
        profit: toNumber(stat.profit_generated),
        rank: stat.rank ?? null,
        pool_share: toNumber(stat.pool_share)
      })),
      recent_payouts: kingMidasPayoutsRaw.slice(0, 5).map(payout => ({
        id: payout.id,
        date: payout.date,
        rank: payout.rank ?? null,
        pool_amount: toNumber(payout.pool_amount),
        status: payout.status,
        paid_at: payout.paid_at
      }))
    };

    return res.status(200).json({
      affiliate: affiliatePayload,
      overview,
      recent_commissions: recentCommissions,
      king_midas: kingMidas,
      // New balance breakdown for UI
      balance: balanceBreakdown
    });
  } catch (error: any) {
    console.error('Affiliate dashboard handler error:', error);
    return res.status(500).json({
      error: 'Failed to load dashboard data',
      message: error?.message || 'Unknown error'
    });
  }
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: string, availableDate?: string): string {
  const statusLower = (status || '').toLowerCase();
  
  if (statusLower === 'paid') {
    return 'Paid';
  }
  
  if (statusLower === 'cancelled') {
    return 'Cancelled';
  }
  
  if (statusLower === 'pending' && availableDate) {
    const available = new Date(availableDate);
    const now = new Date();
    
    if (available <= now) {
      return 'Available';
    }
    
    const daysUntil = Math.ceil((available.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `Pending (${daysUntil} day${daysUntil === 1 ? '' : 's'})`;
  }
  
  return 'Pending';
}
