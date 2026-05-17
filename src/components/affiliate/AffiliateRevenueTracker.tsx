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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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
  /** Actual withdrawable wallet balance from the dashboard API — shown in the Available stat. */
  availableBalance?: number;
  /** Authoritative pending balance from the dashboard API — overrides the computed sum from time-filtered commissions. */
  pendingBalance?: number;
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
  availableBalance,
  pendingBalance,
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
          value={`$${(availableBalance ?? available).toFixed(2)}`}
          sublabel="Ready to payout"
          accent={(availableBalance ?? available) > 0 ? 'green' : undefined}
        />
        <Stat
          label="Pending"
          value={`$${(pendingBalance ?? pending).toFixed(2)}`}
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
      <div className="flex items-center justify-between mb-2 gap-1">
        <span className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-widest leading-tight">
          {label}
        </span>
        {icon}
      </div>
      <div
        className={cn(
          'text-sm md:text-lg font-black tracking-tight font-mono break-all',
          accent === 'green' ? 'text-green-400' : 'text-white'
        )}
      >
        {value}
      </div>
      <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold mt-1 leading-tight">
        {sublabel}
      </div>
    </div>
  );
}

const CHART_CONFIG: Record<ChartTab, { color: string; label: string; prefix: string }> = {
  earnings:    { color: '#4ade80', label: 'Earnings · Period',    prefix: '$' },
  clicks:      { color: '#60a5fa', label: 'Clicks · Period',      prefix: ''  },
  conversions: { color: '#c084fc', label: 'Conversions · Period', prefix: ''  },
  rank:        { color: '#f59e0b', label: 'Rank · Period',        prefix: '#' },
};

function Chart({
  series,
  tab,
}: {
  series: { date: string; value: number }[];
  tab: ChartTab;
}) {
  const cfg = CHART_CONFIG[tab];
  const hasData = series.length > 0;
  const values = series.map((p) => p.value);
  const total = values.reduce((s, v) => s + v, 0);
  const avg = hasData ? total / values.length : null;

  const headline = (() => {
    if (!hasData) return tab === 'rank' ? '—' : tab === 'earnings' ? '$0.00' : '0';
    if (tab === 'earnings') return `$${total.toFixed(2)}`;
    if (tab === 'rank') return avg != null ? `avg #${avg.toFixed(1)}` : '—';
    return total.toLocaleString();
  })();

  // Format date labels — shorter label for denser series
  const data = series.map((p) => {
    const d = new Date(p.date);
    const label = series.length > 30
      ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return { name: label, value: p.value };
  });

  return (
    <div className="bg-black p-4 md:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {cfg.label}
          </div>
          <div className="text-xl md:text-2xl font-black tracking-tighter font-mono" style={{ color: cfg.color }}>
            {headline}
          </div>
        </div>
        <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">
          {hasData ? `${series.length} day${series.length === 1 ? '' : 's'}` : 'No data yet'}
        </div>
      </div>

      <div className="h-40 md:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }}
              width={tab === 'earnings' ? 42 : 28}
              tickFormatter={(v: number) =>
                tab === 'earnings'
                  ? `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`
                  : tab === 'rank' ? `#${v}` : String(v)
              }
              reversed={tab === 'rank'}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: 0, fontSize: 12, padding: '8px 12px' }}
              itemStyle={{ color: cfg.color }}
              formatter={(v: number) => [`${cfg.prefix}${tab === 'earnings' ? v.toFixed(2) : v}`, cfg.label.split(' ·')[0]]}
              labelStyle={{ color: '#888', fontSize: 10, marginBottom: 4 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={cfg.color}
              fill={`${cfg.color}20`}
              strokeWidth={2}
              dot={{ r: 2, fill: cfg.color, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: cfg.color, strokeWidth: 2, stroke: '#000' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
