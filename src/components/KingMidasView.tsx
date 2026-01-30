/**
 * KING MIDAS View Component
 * Displays KING MIDAS rankings, daily stats, and payouts for affiliates
 */

import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  StarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface DailyStat {
  id: string;
  affiliate_id: string;
  date: string;
  profit_generated: number;
  rank: number | null;
  pool_share: number;
}

interface Payout {
  id: string;
  affiliate_id: string;
  date: string;
  rank: number | null;
  pool_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
}

export function KingMidasView() {
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKingMidasData();
  }, [selectedDate]);

  const loadKingMidasData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load daily stats for selected date
      const statsResponse = await fetch(`/api/king-midas/stats?date=${selectedDate}`);
      const statsData = await statsResponse.json();

      if (statsData.error) {
        setError(statsData.error);
        setDailyStats([]);
      } else {
        setDailyStats(statsData.data || []);
      }

      // Load payouts for selected date
      const payoutsResponse = await fetch(`/api/king-midas/payouts?date=${selectedDate}`);
      const payoutsData = await payoutsResponse.json();

      if (payoutsData.error) {
        console.warn('Failed to load payouts:', payoutsData.error);
        setPayouts([]);
      } else {
        setPayouts(payoutsData.data || []);
      }
    } catch (err) {
      console.error('Error loading KING MIDAS data:', err);
      setError('Failed to load KING MIDAS data');
      setDailyStats([]);
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadgeColor = (rank: number | null) => {
    if (!rank) return 'bg-white/10 text-white';
    if (rank === 1) return 'bg-yellow-400/20 text-yellow-400 border-white';
    if (rank === 2) return 'bg-gray-300/20 text-gray-300 border-white';
    if (rank === 3) return 'bg-orange-400/20 text-orange-400 border-white';
    return 'bg-white/10 text-white';
  };

  const getRankIcon = (rank: number | null) => {
    if (rank === 1) return <TrophyIcon className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <TrophyIcon className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <TrophyIcon className="w-5 h-5 text-orange-400" />;
    return null;
  };

  const totalProfit = dailyStats.reduce((sum, stat) => sum + parseFloat(stat.profit_generated.toString()), 0);
  const totalPool = totalProfit * 0.08;
  const myRank = dailyStats.find(stat => stat.rank !== null)?.rank || null;
  const myPoolShare = dailyStats.find(stat => stat.pool_share > 0)?.pool_share || 0;
  const myPayout = payouts.find(p => p.status === 'pending' || p.status === 'paid');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <StarIcon className="w-6 h-6 text-yellow-400" />
            KING MIDAS Rankings
          </h2>
          <p className="text-white/60 mt-1">Daily profit rankings and pool distributions</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-white/60 text-sm">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:ring-2 focus:ring-white/20 focus:border-white"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-400/20 border border-white text-red-400 px-4 py-3 rounded-none">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black/50 border border-white rounded-none p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Total Profit</span>
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">${totalProfit.toFixed(2)}</div>
          <div className="text-xs text-white/40 mt-1">All affiliates</div>
        </div>

        <div className="bg-black/50 border border-white rounded-none p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Pool Size</span>
            <CurrencyDollarIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">${totalPool.toFixed(2)}</div>
          <div className="text-xs text-white/40 mt-1">8% of profit</div>
        </div>

        <div className="bg-black/50 border border-white rounded-none p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Your Rank</span>
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {myRank ? `#${myRank}` : 'N/A'}
          </div>
          <div className="text-xs text-white/40 mt-1">
            {myRank ? (myRank <= 3 ? 'Top 3!' : 'Keep going!') : 'No rank yet'}
          </div>
        </div>

        <div className="bg-black/50 border border-white rounded-none p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Your Share</span>
            <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">
            ${myPoolShare.toFixed(2)}
          </div>
          <div className="text-xs text-white/40 mt-1">
            {myPoolShare > 0 ? 'Pending payout' : 'No payout'}
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-black/50 border border-white rounded-none overflow-hidden">
        <div className="p-4 border-b border-white">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
            Daily Rankings - {new Date(selectedDate).toLocaleDateString()}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Profit Generated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Pool Share</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {dailyStats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/60">
                    No rankings available for this date. Rankings are calculated daily.
                  </td>
                </tr>
              ) : (
                dailyStats
                  .filter(stat => stat.rank !== null)
                  .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                  .map((stat) => (
                    <tr key={stat.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getRankIcon(stat.rank)}
                          <span className={`px-3 py-1 rounded border font-bold ${getRankBadgeColor(stat.rank)
                            }`}>
                            #{stat.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                        ${parseFloat(stat.profit_generated.toString()).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-yellow-400 font-semibold">
                        ${parseFloat(stat.pool_share.toString()).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${stat.pool_share > 0
                            ? 'bg-green-400/20 text-green-400'
                            : 'bg-white/10 text-white/60'
                          }`}>
                          {stat.pool_share > 0 ? 'Eligible' : 'No payout'}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payouts Section */}
      {payouts.length > 0 && (
        <div className="bg-black/50 border border-white rounded-none overflow-hidden">
          <div className="p-4 border-b border-white">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
              Payouts
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-none"
              >
                <div className="flex items-center gap-4">
                  {payout.rank && (
                    <div className={`px-3 py-1 rounded border font-bold ${getRankBadgeColor(payout.rank)
                      }`}>
                      #{payout.rank}
                    </div>
                  )}
                  <div>
                    <div className="text-white font-semibold">
                      ${parseFloat(payout.pool_amount.toString()).toFixed(2)}
                    </div>
                    <div className="text-white/60 text-sm">
                      {new Date(payout.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${payout.status === 'paid'
                      ? 'bg-green-400/20 text-green-400'
                      : payout.status === 'pending'
                        ? 'bg-yellow-400/20 text-yellow-400'
                        : 'bg-red-400/20 text-red-400'
                    }`}>
                    {payout.status === 'paid' ? 'Paid' : payout.status === 'pending' ? 'Pending' : 'Cancelled'}
                  </span>
                  {payout.paid_at && (
                    <div className="text-white/40 text-xs mt-1">
                      Paid: {new Date(payout.paid_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-yellow-400/10 border border-white rounded-none p-4">
        <div className="flex items-start gap-3">
          <StarIcon className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-yellow-400 font-semibold mb-1">How KING MIDAS Works</h4>
            <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
              <li>8% of daily profit is distributed to top affiliates</li>
              <li>Rankings are based on profit generated each day</li>
              <li>Top 3 affiliates receive: 50%, 30%, and 20% of the pool</li>
              <li>Rankings are calculated daily and payouts are processed automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

