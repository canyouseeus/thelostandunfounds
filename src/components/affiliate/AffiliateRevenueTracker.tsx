/**
 * AffiliateRevenueTracker — affiliate-focused hero widget for /dashboard.
 *
 * Answers the four questions an affiliate actually has:
 *   1. How much have I earned, what can I withdraw, what's pending?
 *   2. Is my funnel working? (clicks → conversions → revenue per click)
 *   3. Where do I rank in King Midas today?
 *   4. Is my network growing?
 */

import { useEffect, useState } from 'react';
import {
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

export function AffiliateRevenueTracker({
  affiliateId,
  totalEarnings,
  totalClicks,
  totalConversions,
  networkSize,
}: AffiliateRevenueTrackerProps) {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [chartTab, setChartTab] = useState<ChartTab>('earnings');
  const [series, setSeries] = useState<DailySeries | null>(null);
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [todayRank, setTodayRank] = useState<number | null>(null);
  const [bestRank, setBestRank] = useState<number | null>(null);

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
        .select('clicked_at')
        .eq('affiliate_id', affiliateId)
        .gte('clicked_at', sinceIso),
      supabase
        .from('king_midas_daily_stats')
        .select('rank, profit_generated, pool_share, date')
        .eq('affiliate_id', affiliateId)
        .gte('date', sinceIso.slice(0, 10))
        .order('date', { ascending: true }),
    ]);

    const commissions = commissionsRes.data || [];
    const clicks = clicksRes.data || [];
    const conversions = commissions.filter((c: any) => c.status !== 'cancelled');
    const midas = midasRes.data || [];

    let avail = 0;
    let pend = 0;
    for (const c of commissions) {
      const amt = parseFloat(String(c.amount || 0));
      if (c.status === 'paid' || c.status === 'available') avail += amt;
      else if (c.status === 'pending') pend += amt;
    }
    setAvailable(avail);
    setPending(pend);

    let today: number | null = null;
    let best: number | null = null;
    const todayKey = new Date().toISOString().slice(0, 10);
    for (const m of midas) {
      if (m.date === todayKey) today = m.rank ?? null;
      if (m.rank != null && (best == null || m.rank < best)) best = m.rank;
    }
    setTodayRank(today);
    setBestRank(best);

    const bucket = (rows: any[], valueFn: (r: any) => number) => {
      const map = new Map<string, number>();
      for (const r of rows) {
        const key = (r.date || r.created_at || r.clicked_at || '').slice(0, 10);
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
    <div className="bg-[#0a0a0a] p-5 md:p-8 space-y-6 md:space-y-8">
      {/* Period selector — full-width segmented row */}
      <div className="grid grid-cols-4 bg-black">
        {(['7d', '30d', '90d', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
              period === p ? 'bg-white text-black' : 'text-white/40 hover:text-white'
            )}
          >
            {p === 'all' ? 'All' : p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Hero */}
      <div className="text-center">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
          Lifetime Earnings
        </div>
        <div className="text-5xl md:text-7xl font-black text-white tracking-tighter tabular-nums">
          $<AnimatedNumber value={totalEarnings} decimals={2} />
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1">
          {([
            { key: 'earnings', label: 'Earnings' },
            { key: 'clicks', label: 'Clicks' },
            { key: 'conversions', label: 'Sales' },
            { key: 'rank', label: 'Rank' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setChartTab(tab.key)}
              className={cn(
                'py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-colors',
                chartTab === tab.key ? 'bg-white text-black' : 'bg-black text-white/40 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Chart series={series?.[chartTab] ?? []} tab={chartTab} />
      </div>

      {/* Stats — spacing-only grid, no dividers */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Stat
          label="Available"
          value={`$${available.toFixed(2)}`}
          sublabel="Ready to payout"
          accent={available > 0 ? 'green' : undefined}
        />
        <Stat
          label="Pending"
          value={`$${pending.toFixed(2)}`}
          sublabel="Clearing window"
        />
        <Stat
          label="Clicks"
          value={totalClicks.toLocaleString()}
          sublabel="Lifetime"
          icon={<CursorArrowRaysIcon className="w-3.5 h-3.5 text-white/30" />}
        />
        <Stat
          label="Conversions"
          value={`${totalConversions} · ${conversionRate.toFixed(1)}%`}
          sublabel="CVR"
          icon={<ShoppingCartIcon className="w-3.5 h-3.5 text-white/30" />}
        />
        <Stat
          label="Rev / Click"
          value={`$${revenuePerClick.toFixed(2)}`}
          sublabel="Earnings ÷ clicks"
        />
        <Stat
          label="King Midas"
          value={todayRank != null ? `#${todayRank}` : '—'}
          sublabel={bestRank != null ? `Best #${bestRank}` : 'Not ranked today'}
          icon={<TrophyIcon className="w-3.5 h-3.5 text-white/30" />}
        />
      </div>

      {networkSize > 0 && (
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
          <UsersIcon className="w-3.5 h-3.5" />
          {networkSize} affiliate{networkSize === 1 ? '' : 's'} in your network
        </div>
      )}
    </div>
  );
}

function Stat({
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
  accent?: 'green';
}) {
  return (
    <div className="bg-black p-3 md:p-4">
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

function Chart({
  series,
  tab,
}: {
  series: { date: string; value: number }[];
  tab: ChartTab;
}) {
  const width = 100;
  const height = 40;
  const isRank = tab === 'rank';
  const hasData = series && series.length > 0;
  const values = hasData ? series.map((p) => p.value) : [];

  // Headline number above the chart
  const total = hasData ? values.reduce((sum, v) => sum + v, 0) : 0;
  const avg = hasData ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  const headline = (() => {
    if (!hasData) {
      if (tab === 'earnings') return '$0.00';
      if (tab === 'rank') return '—';
      return '0';
    }
    if (tab === 'earnings') return `$${total.toFixed(2)}`;
    if (tab === 'rank') return avg != null ? `avg #${avg.toFixed(1)}` : '—';
    return total.toLocaleString();
  })();

  // Build polyline + area for the chart
  let polyline = '';
  let areaPath = '';
  if (hasData) {
    const max = Math.max(...values, 1);
    const min = isRank ? 1 : 0;
    const range = Math.max(max - min, 1);
    const step = series.length > 1 ? width / (series.length - 1) : 0;

    const points = series.map((p, i) => {
      const x = i * step;
      const normalized = (p.value - min) / range;
      const y = isRank ? normalized * height : height - normalized * height;
      return { x, y };
    });

    polyline = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    areaPath = `M0,${height} L ${points
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' L ')} L ${width},${height} Z`;
  }

  return (
    <div className="bg-black p-4 md:p-6">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {labelFor(tab)}
          </div>
          <div className="text-xl md:text-2xl font-black text-white tracking-tighter font-mono">
            {headline}
          </div>
        </div>
        <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">
          {hasData ? `${series.length} day${series.length === 1 ? '' : 's'}` : 'No data yet'}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-32 md:h-40"
      >
        {/* Gridlines — soft dashed reference, no solid baseline (reads as a divider) */}
        {[0.2, 0.4, 0.6, 0.8].map((frac) => (
          <line
            key={frac}
            x1={0}
            y1={height * frac}
            x2={width}
            y2={height * frac}
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={0.4}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="2 3"
          />
        ))}

        {hasData && (
          <>
            <path d={areaPath} fill="currentColor" className="text-white/15" />
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              className="text-white"
              points={polyline}
            />
          </>
        )}
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
