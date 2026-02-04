/**
 * Admin Secret Santa View Component
 * Shows pot data, contributions breakdown, and distribution history
 */

import { useState, useEffect } from 'react';
import { GiftIcon, CalendarIcon, CurrencyDollarIcon, UsersIcon, ArrowTrendingUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../Loading';

interface SecretSantaData {
  current_year: number;
  pot: {
    id: string;
    year: number;
    total_amount: string;
    distributed: boolean;
    distribution_date: string | null;
    created_at: string;
  } | null;
  all_pots: Array<{
    id: string;
    year: number;
    total_amount: string;
    distributed: boolean;
    distribution_date: string | null;
  }>;
  contributions: {
    total: number;
    items: Array<{
      id: string;
      amount: string;
      reason: string;
      created_at: string;
    }>;
    by_reason: Record<string, number>;
    total_amount: number;
  };
  distribution: {
    distributed: boolean;
    distribution_date: string | null;
    total_affiliates: number;
    share_per_affiliate: number | null;
    items: Array<{
      id: string;
      affiliate_id: string;
      amount: string;
      status: string;
      created_at: string;
      affiliates: {
        affiliate_code: string;
      } | null;
    }>;
  };
}

export default function SecretSantaAdmin() {
  const [data, setData] = useState<SecretSantaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/secret-santa?year=${selectedYear}`);

      // Check if response is HTML (API route not available)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error(
          'API routes are not available. Please restart your dev server with "npm run dev:api" (uses vercel dev) ' +
          'or test in production/deployed environment. Note: "npm run dev" uses Vite (frontend only). Use "npm run dev:api" for API routes.'
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error loading Secret Santa data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-black/50 rounded-none p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="text-white/60" />
          <span className="ml-3 text-white/60">Loading Secret Santa data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
        <p className="text-red-400">Error: {error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-white text-black rounded-none hover:bg-white/90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-black/50 rounded-none p-6">
        <p className="text-white/60">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/50 rounded-none p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <GiftIcon className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold text-white">Secret Santa Admin</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-black/50 border border-white/30 rounded-none text-white px-4 py-2"
            >
              {data.all_pots.map((pot) => (
                <option key={pot.year} value={pot.year}>
                  {pot.year}
                </option>
              ))}
            </select>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-white text-black rounded-none hover:bg-white/90 transition flex items-center gap-2"
            >
              ↻
              Refresh
            </button>
          </div>
        </div>
        <p className="text-white/60 text-sm">
          First distribution: December 25th, 2026 | Evenly split among ALL active affiliates
        </p>
      </div>

      {/* Current Year Pot Summary */}
      {data.pot && (
        <div className="bg-black/50 rounded-none p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {data.pot.year} Pot Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-none p-4">
              <div className="text-red-400 text-sm mb-1">Total Pot</div>
              <div className="text-white text-3xl font-bold">
                {formatCurrency(data.pot.total_amount)}
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-none p-4">
              <div className="text-blue-400 text-sm mb-1">Status</div>
              <div className="text-white text-xl font-bold">
                {data.pot.distributed ? 'Distributed' : 'Accumulating'}
              </div>
              {data.pot.distribution_date && (
                <div className="text-white/60 text-sm mt-1">
                  {formatDate(data.pot.distribution_date)}
                </div>
              )}
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-none p-4">
              <div className="text-green-400 text-sm mb-1">Share Per Affiliate</div>
              <div className="text-white text-xl font-bold">
                {data.distribution.share_per_affiliate
                  ? formatCurrency(data.distribution.share_per_affiliate)
                  : data.distribution.total_affiliates > 0
                    ? formatCurrency(parseFloat(data.pot.total_amount) / data.distribution.total_affiliates)
                    : 'N/A'}
              </div>
              <div className="text-white/60 text-sm mt-1">
                {data.distribution.total_affiliates} active affiliates
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contributions Breakdown */}
      <div className="bg-black/50 rounded-none p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-5 h-5" />
          Contributions Breakdown
        </h3>
        <div className="mb-4">
          <div className="text-white/60 text-sm mb-2">
            Total Contributions: {data.contributions.total} | Total Amount: {formatCurrency(data.contributions.total_amount)}
          </div>
        </div>

        {Object.keys(data.contributions.by_reason).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.entries(data.contributions.by_reason).map(([reason, amount]) => (
              <div key={reason} className="bg-white/5 rounded-none p-4">
                <div className="text-white/60 text-sm mb-1">{reason}</div>
                <div className="text-white text-xl font-bold">{formatCurrency(amount)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Contributions */}
        {data.contributions.items.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Recent Contributions</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-2 text-white/60 text-sm">Date</th>
                    <th className="pb-2 text-white/60 text-sm">Amount</th>
                    <th className="pb-2 text-white/60 text-sm">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contributions.items.slice(0, 10).map((contrib) => (
                    <tr key={contrib.id} className="border-b border-white/5">
                      <td className="py-2 text-white/80 text-sm">{formatDate(contrib.created_at)}</td>
                      <td className="py-2 text-white font-semibold">{formatCurrency(contrib.amount)}</td>
                      <td className="py-2 text-white/60 text-sm">{contrib.reason || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Distribution History */}
      {data.distribution.distributed && data.distribution.items.length > 0 && (
        <div className="bg-black/50 rounded-none p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            Distribution History ({data.distribution.items.length} affiliates)
          </h3>
          <div className="mb-4 text-white/60 text-sm">
            Distributed on: {formatDate(data.distribution.distribution_date)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-2 text-white/60 text-sm">Affiliate Code</th>
                  <th className="pb-2 text-white/60 text-sm">Amount</th>
                  <th className="pb-2 text-white/60 text-sm">Status</th>
                  <th className="pb-2 text-white/60 text-sm">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.distribution.items.map((item) => (
                  <tr key={item.id} className="border-b border-white/5">
                    <td className="py-2 text-white font-mono">{item.affiliates?.affiliate_code || 'N/A'}</td>
                    <td className="py-2 text-white font-semibold">{formatCurrency(item.amount)}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-none text-xs ${item.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 text-white/60 text-sm">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Years Summary */}
      {data.all_pots.length > 1 && (
        <div className="bg-black/50 rounded-none p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5" />
            All Years Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.all_pots.map((pot) => (
              <div
                key={pot.year}
                className={`border rounded-none p-4 cursor-pointer transition ${pot.year === selectedYear
                  ? 'bg-white/10 border-white/50'
                  : 'bg-black/30 border-white/10 hover:border-white/30'
                  }`}
                onClick={() => setSelectedYear(pot.year)}
              >
                <div className="text-white/60 text-sm mb-1">{pot.year}</div>
                <div className="text-white text-xl font-bold mb-2">
                  {formatCurrency(pot.total_amount)}
                </div>
                <div className="text-white/60 text-xs">
                  {pot.distributed ? `Distributed ${formatDate(pot.distribution_date)}` : 'Accumulating'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


