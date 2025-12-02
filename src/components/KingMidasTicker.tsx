import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TickerRanking {
  rank: number;
  affiliate_code: string;
  profit: number;
  rank_change: number;
  change_direction: 'up' | 'down' | 'none';
}

interface TickerData {
  rankings: TickerRanking[];
  site_profit_today: number;
  king_midas_pot: number;
  last_updated: string;
}

// Dummy data for development/testing when no real data exists
// These match the seed data in scripts/seeds/affiliate/seed-affiliate-dummy-data.sql
// Showing top 10 from 50 total affiliates
const DUMMY_DATA: TickerData = {
  rankings: [
    { rank: 1, affiliate_code: 'KING01', profit: 2850.00, rank_change: 0, change_direction: 'none' },
    { rank: 2, affiliate_code: 'KING02', profit: 2620.00, rank_change: 1, change_direction: 'up' },
    { rank: 3, affiliate_code: 'KING03', profit: 2280.00, rank_change: 1, change_direction: 'down' },
    { rank: 4, affiliate_code: 'KING04', profit: 1950.00, rank_change: 0, change_direction: 'none' },
    { rank: 5, affiliate_code: 'KING05', profit: 1720.00, rank_change: 2, change_direction: 'up' },
    { rank: 6, affiliate_code: 'PRO01', profit: 1450.00, rank_change: 1, change_direction: 'down' },
    { rank: 7, affiliate_code: 'PRO02', profit: 1320.00, rank_change: 0, change_direction: 'none' },
    { rank: 8, affiliate_code: 'PRO03', profit: 1200.00, rank_change: 1, change_direction: 'up' },
    { rank: 9, affiliate_code: 'PRO04', profit: 1120.00, rank_change: 1, change_direction: 'down' },
    { rank: 10, affiliate_code: 'PRO05', profit: 1050.00, rank_change: 0, change_direction: 'none' },
  ],
  site_profit_today: 35280.00, // Sum of all 50 affiliates
  king_midas_pot: 2822.40, // 8% of site profit
  last_updated: new Date().toISOString(),
};

export default function KingMidasTicker() {
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTickerData = async () => {
    try {
      const response = await fetch('/api/king-midas/ticker');
      if (response.ok) {
        const data = await response.json();
        // If no rankings returned, use dummy data
        if (!data.rankings || data.rankings.length === 0) {
          console.log('No rankings found, using dummy data');
          setTickerData(DUMMY_DATA);
        } else {
          setTickerData(data);
        }
      } else {
        // API error, use dummy data
        console.log('API error, using dummy data');
        setTickerData(DUMMY_DATA);
      }
    } catch (error) {
      console.error('Failed to fetch ticker data:', error);
      // On error, use dummy data
      setTickerData(DUMMY_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickerData();
    // Update every hour (3600000ms)
    const interval = setInterval(fetchTickerData, 3600000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !tickerData) {
    return (
      <div className="bg-black/95 border-b-2 border-yellow-400/50 h-12 flex items-center justify-center">
        <div className="text-yellow-400 text-sm">Loading King Midas Rankings...</div>
      </div>
    );
  }

  const getRankIcon = (change_direction: string, rank_change: number) => {
    if (change_direction === 'up') {
      return (
        <span className="text-green-400 inline-flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {Math.abs(rank_change)}
        </span>
      );
    } else if (change_direction === 'down') {
      return (
        <span className="text-red-400 inline-flex items-center gap-1">
          <TrendingDown className="w-3 h-3" />
          {Math.abs(rank_change)}
        </span>
      );
    }
    return (
      <span className="text-white/40 inline-flex items-center gap-1">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  // Check if using dummy data
  const isDummyData = tickerData.rankings.length > 0 && 
                      tickerData.rankings[0].affiliate_code === 'KING01';

  // Create the ticker content
  const tickerContent = (
    <>
      {tickerData.rankings.length > 0 ? (
        tickerData.rankings.map((ranking) => (
          <span key={`${ranking.rank}-${ranking.affiliate_code}`} className="inline-flex items-center gap-2 mx-8">
            {ranking.rank <= 3 && (
              <Trophy className={`w-4 h-4 ${
                ranking.rank === 1 ? 'text-yellow-400' : 
                ranking.rank === 2 ? 'text-gray-300' : 
                'text-amber-600'
              }`} />
            )}
            <span className={`font-bold ${
              ranking.rank === 1 ? 'text-yellow-400' : 
              ranking.rank === 2 ? 'text-gray-300' : 
              ranking.rank === 3 ? 'text-amber-600' : 
              'text-white/60'
            }`}>#{ranking.rank}</span>
            <span className="text-white font-semibold">{ranking.affiliate_code}</span>
            <span className="text-green-400">${ranking.profit.toFixed(2)}</span>
            {getRankIcon(ranking.change_direction, ranking.rank_change)}
          </span>
        ))
      ) : (
        <span className="inline-flex items-center gap-2 mx-8 text-white/60">
          <Trophy className="w-4 h-4" />
          <span>No rankings available yet</span>
        </span>
      )}
      <span className="inline-flex items-center gap-2 mx-8 text-white/80">
        <span className="font-semibold">Site Profit Today:</span>
        <span className="text-green-400 font-bold">${tickerData.site_profit_today.toFixed(2)}</span>
      </span>
      <span className="inline-flex items-center gap-2 mx-8">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <span className="font-semibold text-white/80">King Midas Pot:</span>
        <span className="text-yellow-400 font-bold">${tickerData.king_midas_pot.toFixed(2)}</span>
      </span>
      {isDummyData && (
        <span className="inline-flex items-center gap-2 mx-8 text-yellow-400/60 text-xs">
          (Demo Data)
        </span>
      )}
    </>
  );

  return (
    <div className="bg-black/95 border-b-2 border-yellow-400/50 h-12 overflow-hidden relative">
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {tickerContent}
          {/* Duplicate for seamless loop */}
          {tickerContent}
        </div>
      </div>

      <style jsx>{`
        .ticker-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          position: relative;
        }

        .ticker-content {
          display: flex;
          align-items: center;
          white-space: nowrap;
          animation: scroll-left 60s linear infinite;
        }

        .ticker-wrapper:hover .ticker-content {
          animation-play-state: paused;
        }

        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @media (max-width: 768px) {
          .ticker-content {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}

