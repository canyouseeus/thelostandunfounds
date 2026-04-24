import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, GlobeAltIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  Expandable,
  ExpandableTrigger,
  ExpandableContent,
} from '@/components/ui/expandable';

interface ValuationRecord {
  date: string;
  traffic_value: number;
  domain_rating: number;
  referring_domains: number;
  keywords: number;
}

function computeValuation(r: ValuationRecord): number {
  return r.traffic_value * 12 * 3 + r.domain_rating * 500 + r.referring_domains * 50 + r.keywords * 10;
}

export function WebsiteValuationCard() {
  const [history, setHistory] = useState<ValuationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    supabase
      .from('website_valuation_history')
      .select('date, traffic_value, domain_rating, referring_domains, keywords')
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setHistory(data);
        setLoading(false);
      });
  }, []);

  const latest = history[history.length - 1];
  const prev = history[history.length - 2];

  const currentValuation = latest ? computeValuation(latest) : 0;
  const prevValuation = prev ? computeValuation(prev) : currentValuation;
  const deltaPercent =
    prevValuation > 0 ? ((currentValuation - prevValuation) / prevValuation) * 100 : 0;
  const isUp = deltaPercent >= 0;

  const chartData = history.map((r) => ({
    name: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: computeValuation(r),
  }));

  const breakdown = latest
    ? [
        {
          label: 'Traffic Value',
          value: latest.traffic_value * 12 * 3,
          sub: `$${latest.traffic_value.toLocaleString()}/mo × 36`,
        },
        {
          label: 'Domain Rating',
          value: latest.domain_rating * 500,
          sub: `DR ${latest.domain_rating} × $500`,
        },
        {
          label: 'Referring Domains',
          value: latest.referring_domains * 50,
          sub: `${latest.referring_domains.toLocaleString()} × $50`,
        },
        {
          label: 'Keywords',
          value: latest.keywords * 10,
          sub: `${latest.keywords.toLocaleString()} × $10`,
        },
      ]
    : [];

  return (
    <Expandable
      expandDirection="vertical"
      expandBehavior="replace"
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {({ isExpanded }) => (
        <ExpandableTrigger>
          <div className="bg-white/[0.02] p-6 rounded-none cursor-pointer hover:bg-white/[0.04] transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider">
                <GlobeAltIcon className="w-3 h-3" />
                Website Valuation
              </div>
              <div className="flex items-center gap-2">
                {latest && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white/10 text-white uppercase tracking-wider">
                    DR {latest.domain_rating}
                  </span>
                )}
                <ChevronDownIcon
                  className={`w-3 h-3 text-white/40 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* Main stat + delta */}
            <div className="flex items-end gap-3 mb-4">
              <div className="text-3xl font-bold text-white">
                {loading ? (
                  <span className="text-white/30">—</span>
                ) : (
                  <AnimatedNumber value={currentValuation} format="currency" />
                )}
              </div>
              {!loading && history.length >= 2 && (
                <div
                  className={`flex items-center gap-1 text-xs font-bold mb-1 ${
                    isUp ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isUp ? (
                    <ArrowTrendingUpIcon className="w-3 h-3" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-3 h-3" />
                  )}
                  {Math.abs(deltaPercent).toFixed(1)}%
                </div>
              )}
            </div>

            {/* Sparkline trend chart */}
            {!loading && chartData.length > 1 && (
              <div style={{ height: 64 }} className="mb-3" onClick={(e) => e.stopPropagation()}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="valuationGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis dataKey="name" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#000',
                        border: 'none',
                        borderRadius: 0,
                        fontSize: '11px',
                        padding: '6px 10px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number | undefined) => [
                        `$${(value ?? 0).toLocaleString()}`,
                        'Valuation',
                      ]}
                      labelStyle={{ color: '#666', fontSize: '10px', display: 'block', marginBottom: '2px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="rgba(255,255,255,0.5)"
                      fill="url(#valuationGrad)"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {!loading && !latest && (
              <p className="text-white/30 text-xs">No valuation data — add rows to website_valuation_history.</p>
            )}

            {!isExpanded && !loading && latest && (
              <p className="text-[10px] text-white/30 uppercase tracking-wider">
                Click to see breakdown →
              </p>
            )}

            {/* Expandable breakdown */}
            <ExpandableContent preset="fade">
              <div className="pt-4 border-t border-white/10 space-y-3">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
                  Valuation Breakdown
                </p>
                {breakdown.map(({ label, value, sub }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div>
                      <div className="text-white/60 text-xs">{label}</div>
                      <div className="text-white/30 text-[10px]">{sub}</div>
                    </div>
                    <div className="text-white font-mono text-sm font-bold">
                      ${value.toLocaleString()}
                    </div>
                  </div>
                ))}
                <div className="pt-2 flex justify-between items-center border-t border-white/10">
                  <span className="text-white text-xs font-bold uppercase tracking-wider">Total</span>
                  <span className="text-white font-mono font-bold">
                    ${currentValuation.toLocaleString()}
                  </span>
                </div>
              </div>
            </ExpandableContent>
          </div>
        </ExpandableTrigger>
      )}
    </Expandable>
  );
}
