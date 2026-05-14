/**
 * KING MIDAS Leaderboard view — Noir style.
 * Used both on the public /king-midas-leaderboard page and embedded as a
 * tab inside the affiliate dashboard.
 */

import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  UsersIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../Loading';
import KingMidasTicker from '../KingMidasTicker';
import { supabase } from '../../lib/supabase';
import { cn } from '../ui/utils';

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

interface LeaderboardViewProps {
  showTicker?: boolean;
  showHowItWorks?: boolean;
  highlightAffiliateCode?: string;
}

export default function LeaderboardView({
  showTicker = true,
  showHowItWorks = true,
  highlightAffiliateCode,
}: LeaderboardViewProps) {
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
      if (rankingsError) throw rankingsError;

      const formattedRankings: Ranking[] = (rankingsData || []).map((r: any) => ({
        rank: r.rank,
        affiliate_code: r.affiliates?.code || 'Unknown',
        profit_generated: parseFloat(r.profit_generated?.toString() || '0'),
        pool_share: parseFloat(r.pool_share?.toString() || '0'),
        date: r.date,
      }));

      setRankings(formattedRankings);

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

  const rankingsByDate = rankings.reduce((acc, ranking) => {
    if (!acc[ranking.date]) acc[ranking.date] = [];
    acc[ranking.date].push(ranking);
    return acc;
  }, {} as Record<string, Ranking[]>);

  const sortedDates = Object.keys(rankingsByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8">
      {showTicker && <KingMidasTicker />}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatTile
            label="Total Profit"
            value={`$${stats.totalProfit.toFixed(2)}`}
            sublabel="All affiliates"
            icon={<ArrowTrendingUpIcon className="w-4 h-4 text-white/40" />}
          />
          <StatTile
            label="Pool Size"
            value={`$${stats.totalPool.toFixed(2)}`}
            sublabel="8% of profit"
            icon={<CurrencyDollarIcon className="w-4 h-4 text-white/40" />}
          />
          <StatTile
            label="Top Earner"
            value={stats.topEarner}
            sublabel={`$${stats.topEarnerProfit.toFixed(2)}`}
            icon={<SparklesIcon className="w-4 h-4 text-white/40" />}
            mono
          />
          <StatTile
            label="Ranked Affiliates"
            value={String(stats.totalAffiliates)}
            sublabel="On the board"
            icon={<UsersIcon className="w-4 h-4 text-white/40" />}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#0a0a0a] p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-white/40" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Time Range</span>
          </div>
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                'px-3 md:px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors',
                dateRange === range
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              {range}
            </button>
          ))}
          {dateRange === 'today' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-white/5 text-white text-xs font-mono focus:outline-none focus:bg-white/10 transition-colors"
            />
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 px-4 py-3 text-xs font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="bg-[#0a0a0a] p-10 md:p-12 text-center">
          <TrophyIcon className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">No Rankings Yet</h3>
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
            Rankings are calculated daily. Check back tomorrow.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <RankingsByDate
              key={date}
              date={date}
              rankings={rankingsByDate[date]}
              highlightAffiliateCode={highlightAffiliateCode}
            />
          ))}
        </div>
      )}

      {showHowItWorks && <HowItWorks />}
    </div>
  );
}

function StatTile({
  label,
  value,
  sublabel,
  icon,
  mono,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="bg-[#0a0a0a] p-4 md:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">
          {label}
        </span>
        {icon}
      </div>
      <div
        className={cn(
          'text-lg md:text-2xl font-black text-white tracking-tighter truncate',
          mono && 'font-mono text-base md:text-xl'
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

function RankingsByDate({
  date,
  rankings,
  highlightAffiliateCode,
}: {
  date: string;
  rankings: Ranking[];
  highlightAffiliateCode?: string;
}) {
  const sorted = [...rankings].sort((a, b) => a.rank - b.rank);
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-[#0a0a0a] overflow-hidden">
      <div className="px-4 md:px-6 py-3 md:py-4 bg-black/50 flex items-center gap-2">
        <ChartBarIcon className="w-4 h-4 text-white/40" />
        <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-widest truncate">
          {formattedDate}
        </h3>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden divide-y divide-white/5">
        {sorted.map((ranking) => {
          const isMe = highlightAffiliateCode === ranking.affiliate_code;
          return (
            <div
              key={`${date}-${ranking.rank}`}
              className={cn('p-4', isMe && 'bg-white/[0.04]')}
            >
              <div className="flex items-center justify-between mb-3">
                <RankBadge rank={ranking.rank} />
                <span className="font-mono text-xs font-black text-white truncate ml-3">
                  {ranking.affiliate_code}
                  {isMe && <span className="ml-2 text-[9px] text-white/50 font-bold uppercase tracking-widest">You</span>}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Profit" value={`$${ranking.profit_generated.toFixed(2)}`} />
                <Stat label="Pool Share" value={`$${ranking.pool_share.toFixed(2)}`} />
                <PayoutBadge eligible={ranking.pool_share > 0} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-black/30">
              <th className="px-6 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-widest">Rank</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-widest">Affiliate</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-white/40 uppercase tracking-widest">Profit</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-white/40 uppercase tracking-widest">Pool Share</th>
              <th className="px-6 py-3 text-center text-[10px] font-bold text-white/40 uppercase tracking-widest">Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((ranking) => {
              const isMe = highlightAffiliateCode === ranking.affiliate_code;
              return (
                <tr
                  key={`${date}-${ranking.rank}`}
                  className={cn('hover:bg-white/[0.03] transition-colors', isMe && 'bg-white/[0.04]')}
                >
                  <td className="px-6 py-3">
                    <RankBadge rank={ranking.rank} />
                  </td>
                  <td className="px-6 py-3 font-mono text-sm font-black text-white">
                    {ranking.affiliate_code}
                    {isMe && <span className="ml-2 text-[9px] text-white/50 font-bold uppercase tracking-widest">You</span>}
                  </td>
                  <td className="px-6 py-3 text-right text-white font-mono text-sm font-bold">
                    ${ranking.profit_generated.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right text-white font-mono text-sm font-bold">
                    ${ranking.pool_share.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <PayoutBadge eligible={ranking.pool_share > 0} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const isTopThree = rank <= 3;
  return (
    <div className="flex items-center gap-2">
      {isTopThree && <TrophyIcon className="w-4 h-4 text-white/60" />}
      <span
        className={cn(
          'px-2 py-1 text-[10px] font-black uppercase tracking-widest',
          isTopThree ? 'bg-white text-black' : 'bg-white/10 text-white/80'
        )}
      >
        #{rank}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-1">{label}</div>
      <div className="text-white text-xs font-mono font-bold">{value}</div>
    </div>
  );
}

function PayoutBadge({ eligible }: { eligible: boolean }) {
  return (
    <span
      className={cn(
        'inline-block px-2 py-1 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap',
        eligible ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
      )}
    >
      {eligible ? 'Eligible' : 'No Payout'}
    </span>
  );
}

function HowItWorks() {
  return (
    <div className="bg-[#0a0a0a] p-5 md:p-6">
      <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
        <SparklesIcon className="w-4 h-4 text-white/60" />
        How KING MIDAS Works
      </h4>
      <ul className="space-y-3 text-white/60 text-xs leading-relaxed">
        <Bullet label="8% Pool">8% of daily profit is set aside for the KING MIDAS prize pool.</Bullet>
        <Bullet label="Daily Rankings">Rankings are based on profit generated each day.</Bullet>
        <Bullet label="Top 3 Distribution">
          <span className="block mt-1 text-white/40">90% of pool — #1 takes 50%, #2 takes 30%, #3 takes 10%.</span>
        </Bullet>
        <Bullet label="Remaining Affiliates">
          The other 10% of the pool is split equally among everyone else who made the board.
        </Bullet>
        <Bullet label="Automatic Payouts">Calculated daily, processed automatically.</Bullet>
        <Bullet label="Compete Daily">Every day is a fresh competition. Rankings reset daily.</Bullet>
      </ul>
    </div>
  );
}

function Bullet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-white/30 font-mono mt-0.5">—</span>
      <span>
        <span className="text-white font-bold uppercase tracking-widest text-[10px] mr-2">{label}</span>
        {children}
      </span>
    </li>
  );
}
