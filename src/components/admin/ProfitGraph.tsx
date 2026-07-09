/**
 * Profit Graph Component
 * Displays live profit data in a line chart
 */

import { useState, useEffect } from 'react';
import { ArrowTrendingUpIcon, CurrencyDollarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

interface ProfitDataPoint {
  date: string;
  profit: number;
}

interface ProfitSummary {
  totalProfit: number;
  averageDailyProfit: number;
  maxDailyProfit: number;
  todayProfit: number;
  days: number;
}

const PLATFORM_LAUNCH_DATE = '2026-01-15';

const isTestEmail = (email: string | null | undefined) => {
  if (!email) return false;
  const testPatterns = ['test', 'demo', 'admin', 'dev', 'staging', 'dummy'];
  return testPatterns.some(pattern => email.toLowerCase().includes(pattern));
};

export default function ProfitGraph() {
  const [profitData, setProfitData] = useState<ProfitDataPoint[]>([]);
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfitData();
    // Refresh every 30 seconds for live data
    const interval = setInterval(loadProfitData, 30000);
    return () => clearInterval(interval);
  }, [days]);

  const loadProfitData = async () => {
    try {
      setLoading(true);
      setError(null);

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const cutoffIso = cutoff >= new Date(PLATFORM_LAUNCH_DATE) ? cutoff.toISOString() : PLATFORM_LAUNCH_DATE;

      const [commissionsRes, ordersRes, invoicesRes, refundsRes] = await Promise.all([
        supabase
          .from('affiliate_commissions')
          .select('created_at, profit_generated, product_cost, status')
          .eq('status', 'paid')
          .gte('created_at', cutoffIso),
        supabase
          .from('photo_orders')
          .select('created_at, total_amount_cents, email, payment_status, metadata')
          .gte('created_at', cutoffIso),
        supabase
          .from('invoices')
          .select('paid_at, total')
          .eq('status', 'paid')
          .not('paid_at', 'is', null)
          .gte('paid_at', cutoffIso),
        supabase
          .from('refunds')
          .select('created_at, amount_cents')
          .gte('created_at', cutoffIso),
      ]);

      const byDay = new Map<string, number>();
      const addToDay = (dateStr: string, amount: number) => {
        const day = dateStr.slice(0, 10);
        byDay.set(day, (byDay.get(day) || 0) + amount);
      };

      (commissionsRes.data || []).forEach(c => {
        const profit = parseFloat(c.profit_generated?.toString() || '0') + parseFloat(c.product_cost?.toString() || '0');
        if (!isNaN(profit)) addToDay(c.created_at, profit);
      });

      (ordersRes.data || []).forEach(o => {
        if (isTestEmail(o.email) || o.payment_status !== 'completed' || (o.metadata as any)?.environment === 'sandbox') return;
        addToDay(o.created_at, (o.total_amount_cents || 0) / 100);
      });

      (invoicesRes.data || []).forEach(inv => {
        addToDay(inv.paid_at, Number(inv.total || 0));
      });

      // refunds table may not exist yet if the migration hasn't been applied — ignore silently
      (refundsRes.data || []).forEach(r => {
        addToDay(r.created_at, -(r.amount_cents || 0) / 100);
      });

      const sortedDays = Array.from(byDay.keys()).sort();
      const dailyData: ProfitDataPoint[] = sortedDays.map(day => ({ date: day, profit: byDay.get(day) || 0 }));

      const todayStr = new Date().toISOString().slice(0, 10);
      const totalProfit = dailyData.reduce((sum, d) => sum + d.profit, 0);
      const summaryData: ProfitSummary = {
        totalProfit,
        averageDailyProfit: dailyData.length > 0 ? totalProfit / dailyData.length : 0,
        maxDailyProfit: dailyData.length > 0 ? Math.max(...dailyData.map(d => d.profit)) : 0,
        todayProfit: byDay.get(todayStr) || 0,
        days,
      };

      setProfitData(dailyData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading profit data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profit data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate chart dimensions and scaling
  const maxProfit = Math.max(...profitData.map(d => d.profit), 1);
  const chartHeight = 200;
  const chartWidth = 100;
  const padding = 10;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Generate SVG path for line chart
  const generatePath = () => {
    if (profitData.length === 0) return '';

    const points = profitData.map((point, index) => {
      const x = padding + (index / (profitData.length - 1 || 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - (point.profit / maxProfit) * (chartHeight - padding * 2);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  // Generate area path for fill
  const generateAreaPath = () => {
    if (profitData.length === 0) return '';
    const linePath = generatePath();
    const firstX = padding;
    const lastX = chartWidth - padding;
    const bottomY = chartHeight - padding;
    return `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  };

  if (loading && profitData.length === 0) {
    return (
      <div className="bg-black/50 rounded-none p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-white/60">Loading profit data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 rounded-none p-6">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-black/50 rounded-none p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
          <h3 className="text-xl font-bold text-white">Profit Generated</h3>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs rounded-none transition ${days === d
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-none p-3">
            <div className="text-white/60 text-xs mb-1">Total Profit</div>
            <div className="text-2xl font-bold text-white">
              ${summary.totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-white/5 rounded-none p-3">
            <div className="text-white/60 text-xs mb-1">Today</div>
            <div className="text-2xl font-bold text-green-400">
              ${summary.todayProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-white/5 rounded-none p-3">
            <div className="text-white/60 text-xs mb-1">Daily Avg</div>
            <div className="text-2xl font-bold text-yellow-400">
              ${summary.averageDailyProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-white/5 rounded-none p-3">
            <div className="text-white/60 text-xs mb-1">Peak Day</div>
            <div className="text-2xl font-bold text-purple-400">
              ${summary.maxDailyProfit.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-black/30 rounded-none p-4">
        {profitData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-white/60">
            <div className="text-center">
              <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No profit data available</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-64"
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
                return (
                  <line
                    key={ratio}
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="0.5"
                  />
                );
              })}

              {/* Area fill */}
              <path
                d={generateAreaPath()}
                fill="url(#profitGradient)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#14f195" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#14f195" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Line */}
              <path
                d={generatePath()}
                fill="none"
                stroke="#14f195"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {profitData.map((point, index) => {
                const x = padding + (index / (profitData.length - 1 || 1)) * (chartWidth - padding * 2);
                const y = chartHeight - padding - (point.profit / maxProfit) * (chartHeight - padding * 2);
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="2"
                    fill="#14f195"
                    className="hover:r-3 transition-all"
                  />
                );
              })}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 text-[10px] text-white/40">
              {profitData.length > 0 && (
                <>
                  <span>{formatDate(profitData[0].date)}</span>
                  {profitData.length > 1 && (
                    <span>{formatDate(profitData[Math.floor(profitData.length / 2)].date)}</span>
                  )}
                  <span>{formatDate(profitData[profitData.length - 1].date)}</span>
                </>
              )}
            </div>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-white/40 px-1">
              <span>${maxProfit.toFixed(0)}</span>
              <span>${(maxProfit / 2).toFixed(0)}</span>
              <span>$0</span>
            </div>
          </div>
        )}
      </div>

      {/* Last updated */}
      <div className="mt-4 text-xs text-white/40 text-center">
        Last updated: {new Date().toLocaleTimeString()} • Auto-refreshes every 30s
      </div>
    </div>
  );
}













