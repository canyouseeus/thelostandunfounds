/**
 * King Midas Leaderboard Page
 * Public leaderboard showing King Midas rankings and stats
 */

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, DollarSign, Calendar, Award, Loader2, BarChart3, Users, Crown } from 'lucide-react';
import KingMidasTicker from '../components/KingMidasTicker';
import { supabase } from '../lib/supabase';

interface Ranking {
  rank: number;
  affiliate_code: string;
  profit_generated: number;
  pool_share: number;
  date: string;
}

interface LeaderboardStats {
  totalProfit: number;
  totalPool: number;
  totalAffiliates: number;
  topEarner: string;
  topEarnerProfit: number;
}

export default function KingMidasLeaderboard() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    loadLeaderboardData();
  }, [selectedDate, dateRange]);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      let dateFilter = selectedDate;
      if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = weekAgo.toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = monthAgo.toISOString().split('T')[0];
      }

      // Load rankings
      let query = supabase
        .from('king_midas_daily_stats')
        .select(`
          rank,
          profit_generated,
          pool_share,
          date,
          affiliate_id,
          affiliates!inner(code)
        `)
        .order('rank', { ascending: true })
        .not('rank', 'is', null);

      if (dateRange !== 'all') {
        query = query.gte('date', dateFilter);
      }

      const { data: rankingsData, error: rankingsError } = await query.limit(100);

      if (rankingsError) {
        throw rankingsError;
      }

      const formattedRankings: Ranking[] = (rankingsData || []).map((r: any) => ({
        rank: r.rank,
        affiliate_code: r.affiliates?.code || 'Unknown',
        profit_generated: parseFloat(r.profit_generated?.toString() || '0'),
        pool_share: parseFloat(r.pool_share?.toString() || '0'),
        date: r.date,
      }));

      setRankings(formattedRankings);

      // Calculate stats
      const totalProfit = formattedRankings.reduce((sum, r) => sum + r.profit_generated, 0);
      const totalPool = formattedRankings.reduce((sum, r) => sum + r.pool_share, 0);
      const uniqueAffiliates = new Set(formattedRankings.map(r => r.affiliate_code)).size;
      const topEarner = formattedRankings.length > 0 ? formattedRankings[0] : null;

      setStats({
        totalProfit,
        totalPool,
        totalAffiliates: uniqueAffiliates,
        topEarner: topEarner?.affiliate_code || 'N/A',
        topEarnerProfit: topEarner?.profit_generated || 0,
      });
    } catch (err: any) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50';
    if (rank === 2) return 'bg-gray-300/20 text-gray-300 border-gray-300/50';
    if (rank === 3) return 'bg-orange-400/20 text-orange-400 border-orange-400/50';
    return 'bg-white/10 text-white border-white/20';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-orange-400" />;
    return null;
  };

  // Group rankings by date for display
  const rankingsByDate = rankings.reduce((acc, ranking) => {
    if (!acc[ranking.date]) {
      acc[ranking.date] = [];
    }
    acc[ranking.date].push(ranking);
    return acc;
  }, {} as Record<string, Ranking[]>);

  const sortedDates = Object.keys(rankingsByDate).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-8 h-8 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white">KING MIDAS Leaderboard</h1>
          </div>
          <p className="text-white/60 text-lg">
            Daily profit rankings and pool distributions. Top affiliates compete for 8% of daily profit.
          </p>
        </div>

        {/* King Midas Ticker */}
        <div className="mb-8">
          <KingMidasTicker />
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Total Profit</span>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">${stats.totalProfit.toFixed(2)}</div>
              <div className="text-xs text-white/40 mt-1">All affiliates</div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Pool Size</span>
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-yellow-400">${stats.totalPool.toFixed(2)}</div>
              <div className="text-xs text-white/40 mt-1">8% of profit</div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Top Earner</span>
                <Crown className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-xl font-bold text-white">{stats.topEarner}</div>
              <div className="text-xs text-white/40 mt-1">${stats.topEarnerProfit.toFixed(2)}</div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Total Affiliates</span>
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.totalAffiliates}</div>
              <div className="text-xs text-white/40 mt-1">Ranked affiliates</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-white/60" />
              <span className="text-white/60">Time Range:</span>
            </div>
            {(['today', 'week', 'month', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-none transition ${
                  dateRange === range
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
            {dateRange === 'today' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-black/50 border border-white/30 rounded-none text-white focus:ring-2 focus:ring-white/20 focus:border-white/30"
              />
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-400/20 border border-red-400/50 text-red-400 px-4 py-3 rounded-none mb-8">
            {error}
          </div>
        )}

        {/* Leaderboard */}
        {sortedDates.length === 0 ? (
          <div className="bg-black/50 border border-white/10 rounded-none p-12 text-center">
            <Trophy className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Rankings Available</h3>
            <p className="text-white/60">
              Rankings are calculated daily. Check back tomorrow for updated leaderboard data.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((date) => (
              <div key={date} className="bg-black/50 border border-white/10 rounded-none overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-white/5">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-yellow-400" />
                    Rankings - {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Affiliate Code</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Profit Generated</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Pool Share</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {rankingsByDate[date]
                        .sort((a, b) => a.rank - b.rank)
                        .map((ranking) => (
                          <tr key={`${date}-${ranking.rank}`} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getRankIcon(ranking.rank)}
                                <span className={`px-3 py-1 rounded border font-bold ${
                                  getRankBadgeColor(ranking.rank)
                                }`}>
                                  #{ranking.rank}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono font-semibold text-white">{ranking.affiliate_code}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                              ${ranking.profit_generated.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-yellow-400 font-semibold">
                              ${ranking.pool_share.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                ranking.pool_share > 0 
                                  ? 'bg-green-400/20 text-green-400' 
                                  : 'bg-white/10 text-white/60'
                              }`}>
                                {ranking.pool_share > 0 ? 'Eligible' : 'No payout'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-yellow-400/10 border border-yellow-400/30 rounded-none p-6">
          <div className="flex items-start gap-3">
            <Award className="w-6 h-6 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-yellow-400 font-semibold mb-2 text-lg">How KING MIDAS Works</h4>
              <ul className="text-white/80 text-sm space-y-2 list-disc list-inside">
                <li><strong>8% Pool:</strong> 8% of daily profit is distributed to top affiliates</li>
                <li><strong>Daily Rankings:</strong> Rankings are based on profit generated each day</li>
                <li><strong>Top 3 Distribution:</strong> #1 gets 50%, #2 gets 30%, #3 gets 20% of the pool</li>
                <li><strong>Automatic Payouts:</strong> Rankings are calculated daily and payouts are processed automatically</li>
                <li><strong>Compete Daily:</strong> Every day is a fresh competition - rankings reset daily</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

