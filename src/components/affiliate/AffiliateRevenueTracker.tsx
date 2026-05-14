/**
 * AffiliateRevenueTracker — affiliate-focused hero widget for /dashboard.
 *
 * Answers the four questions an affiliate actually has:
 *   1. How much have I earned, what can I withdraw, what's pending?
 *   2. Is my funnel working? (clicks → conversions → revenue per click)
 *   3. Where do I rank in King Midas today?
 *   4. Is my network growing?
 *
 * No site-wide revenue, no newsletter signups, no booking totals — those are
 * admin-only metrics and live in <RevenueTracker /> instead.
 */

import { useEffect, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  CursorArrowRaysIcon,
  ShoppingCartIcon,
  TrophyIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { AnimatedNumber } from '../ui/animated-number';
import { cn } from '../ui/utils';
import { supabase } from '../../lib/supabase';

type TimePeriod = '7d' | '30d' | '90d' | 'all';
type ChartTab = 'earnings' | 'clicks' | 'conversions' | 'rank';

interface AffiliateRevenueTrackerProps {
  affiliateId: string;
  affiliateCode: string;
  totalEarnings: number;
  totalClicks: number;
  totalConversions: number;
  networkSize: number;
}

interface DailySeries {
  earnings: { date: string; value: number }[];
  clicks: { date: string; value: number }[];
  conversions: { date: string; value: number }[];
  rank: { date: string; value: number }[];
}

interface PayoutSummary {
  available: number;
  pending: number;
}

interface RankSummary {
  today: number | null;
  best: number | null;
}

export function AffiliateRevenueTracker({
  affiliateId,
  affiliateCode,
  totalEarnings,
  totalClicks,
  totalConversions,
  networkSize,
}: AffiliateRevenueTrackerProps) {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [chartTab, setChartTab] = useState<ChartTab>('earnings');
  const [isExpanded, setIsExpanded] = useState(true);
  const [series, setSeries] = useState<DailySeries | null>(null);
  const [payout, setPayout] = useState<PayoutSummary>({ available: 0, pending: 0 });
  const [rank, setRank] = useState<RankSummary>({ today: null, best: null });

  useEffect(() => {
    void loadData();
  }, [affiliateId, period]);

  const loadData = async () => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    const [commissionsRes, clicksRes, midasRes] = await Promise.all([
      supabase
        .from('affiliate_commissions')
        .select('amount, status, created_at')
        .eq('affiliate_id', affiliateId)
        .gte('created_at', sinceIso),
      supabase
        .from('affiliate_click_events')
        .select('created_at')
        .eq('affiliate_id', affiliateId)
        .gte('created_at', sinceIso),
      supabase
        .from('king_midas_daily_stats')
        .select('rank, profit_generated, pool_share, date')
        .eq('affiliate_id', affiliateId)
        .gte('date', sinceIso.slice(0, 10))
        .order('date', { ascending: true }),
    ]);

    const commissions = commissionsRes.data || [];
    const clicks = clicksRes.data || [];
    // Conversions in this codebase = commission rows that aren't cancelled.
    const conversions = commissions.filter((c: any) => c.status !== 'cancelled');
    const midas = midasRes.data || [];

    // Available / pending balances from commissions
    let available = 0;
    let pending = 0;
    for (const c of commissions) {
      const amt = parseFloat(String(c.amount || 0));
      if (c.status === 'paid' || c.status === 'available') available += amt;
      else if (c.status === 'pending') pending += amt;
    }
    setPayout({ available, pending });

    // Rank today / best in window
    let todayRank: number | null = null;
    let bestRank: number | null = null;
    const todayKey = new Date().toISOString().slice(0, 10);
    for (const m of midas) {
      if (m.date === todayKey) todayRank = m.rank ?? null;
      if (m.rank != null && (bestRank == null || m.rank < bestRank)) bestRank = m.rank;
    }
    setRank({ today: todayRank, best: bestRank });

    // Daily buckets
    const bucket = (rows: { date?: string; created_at?: string }[], valueFn: (r: any) => number) => {
      const map = new Map<string, number>();
      for (const r of rows) {
        const key = (r.date || r.created_at || '').slice(0, 10);
        if (!key) continue;
        map.set(key, (map.get(key) || 0) + valueFn(r));
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
    };

    setSeries({
      earnings: bucket(commissions, (c) => parseFloat(String(c.amount || 0))),
      clicks: bucket(clicks, () => 1),
      conversions: bucket(conversions, () => 1),
      rank: midas
        .filter((m: any) => m.rank != null)
        .map((m: any) => ({ date: m.date, value: m.rank })),
    });
  };

  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const revenuePerClick = totalClicks > 0 ? totalEarnings / totalClicks : 0;

  return (
    <div className="bg-black overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 md:py-4 bg-[#0a0a0a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CurrencyDollarIcon className="w-4 h-4 text-white/40" />
          <span className="text-[10px] md:text-xs font-bold text-white/60 uppercase tracking-widest">
            Affiliate Earnings · {affiliateCode}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="text-white/40 hover:text-white transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Hero number */}
      <div className="px-4 md:px-6 py-6 md:py-8 text-center">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
          Lifetime Earnings
        </div>
        <div className="text-5xl md:text-7xl font-black text-white tracking-tighter tabular-nums">
          $<AnimatedNumber value={totalEarnings} decimals={2} />
        </div>

        {/* Period selector */}
        <div className="mt-6 inline-flex bg-[#0a0a0a]">
          {(['7d', '30d', '90d', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 md:px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors',
                period === p ? 'bg-white text-black' : 'text-white/40 hover:text-white'
              )}
            >
              {p === 'all' ? 'All' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-white/5">
        <StatCell
          label="Available"
          value={`$${payout.available.toFixed(2)}`}
          sublabel="Ready to payout"
          accent={payout.available > 0 ? 'green' : 'muted'}
        />
        <StatCell
          label="Pending"
          value={`$${payout.pending.toFixed(2)}`}
          sublabel="Clearing return window"
          accent="muted"
        />
        <StatCell
          label="Clicks"
          value={totalClicks.toLocaleString()}
          sublabel="Lifetime"
          icon={<CursorArrowRaysIcon className="w-3.5 h-3.5 text-white/30" />}
        />
        <StatCell
          label="Conversions"
          value={`${totalConversions} · ${conversionRate.toFixed(1)}%`}
          sublabel="CVR"
          icon={<ShoppingCartIcon className="w-3.5 h-3.5 text-white/30" />}
        />
        <StatCell
          label="Rev / Click"
          value={`$${revenuePerClick.toFixed(2)}`}
          sublabel="Earnings ÷ clicks"
        />
        <StatCell
          label="King Midas"
          value={rank.today != null ? `#${rank.today}` : '—'}
          sublabel={rank.best != null ? `Best #${rank.best}` : 'Not ranked today'}
          icon={<TrophyIcon className="w-3.5 h-3.5 text-white/30" />}
        />
      </div>

      {/* Chart */}
      {isExpanded && (
        <div className="bg-[#0a0a0a]">
          <div className="flex flex-wrap gap-px bg-white/5 border-b border-transparent">
            {(['earnings', 'clicks', 'conversions', 'rank'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setChartTab(tab)}
                className={cn(
                  'px-3 md:px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex-1 md:flex-none',
                  chartTab === tab ? 'bg-white text-black' : 'bg-black text-white/40 hover:text-white'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <MiniChart series={series?.[chartTab] ?? []} tab={chartTab} />
        </div>
      )}

      {networkSize > 0 && (
        <div className="px-4 md:px-6 py-3 bg-[#0a0a0a] flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
          <UsersIcon className="w-3.5 h-3.5" />
          {networkSize} affiliate{networkSize === 1 ? '' : 's'} in your network
        </div>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  sublabel,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon?: React.ReactNode;
  accent?: 'green' | 'muted';
}) {
  return (
    <div className="bg-black p-3 md:p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">
          {label}
        </span>
        {icon}
      </div>
      <div
        className={cn(
          'text-sm md:text-lg font-black tracking-tight truncate font-mono',
          accent === 'green' ? 'text-green-400' : 'text-white'
        )}
      >
        {value}
      </div>
      <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold mt-1 truncate">
        {sublabel}
      </div>
    </div>
  );
}

function MiniChart({
  series,
  tab,
}: {
  series: { date: string; value: number }[];
  tab: ChartTab;
}) {
  if (!series || series.length === 0) {
    return (
      <div className="px-4 md:px-6 py-12 text-center text-white/30 text-[10px] font-bold uppercase tracking-widest">
        No data in this window yet
      </div>
    );
  }

  const isRank = tab === 'rank';
  const values = series.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = isRank ? 1 : 0;
  const range = Math.max(max - min, 1);
  const width = 100;
  const height = 40;
  const step = series.length > 1 ? width / (series.length - 1) : 0;
  const points = series
    .map((p, i) => {
      const x = i * step;
      const normalized = isRank
        ? (p.value - min) / range
        : (p.value - min) / range;
      const y = isRank ? normalized * height : height - normalized * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const total = isRank ? null : values.reduce((sum, v) => sum + v, 0);
  const avg = isRank ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

  return (
    <div className="px-4 md:px-6 py-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {labelFor(tab)}
          </div>
          <div className="text-lg md:text-xl font-black text-white tracking-tighter font-mono">
            {tab === 'earnings' && `$${(total || 0).toFixed(2)}`}
            {tab === 'clicks' && (total || 0).toLocaleString()}
            {tab === 'conversions' && (total || 0).toLocaleString()}
            {tab === 'rank' && (avg != null ? `avg #${avg.toFixed(1)}` : '—')}
          </div>
        </div>
        <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">
          {series.length} day{series.length === 1 ? '' : 's'}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-20 md:h-24"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="text-white/80"
          points={points}
        />
      </svg>
    </div>
  );
}

function labelFor(tab: ChartTab) {
  switch (tab) {
    case 'earnings':
      return 'Earnings · period';
    case 'clicks':
      return 'Clicks · period';
    case 'conversions':
      return 'Conversions · period';
    case 'rank':
      return 'Rank · period';
  }
}
