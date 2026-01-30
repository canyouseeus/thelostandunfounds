import { useEffect, useState } from 'react';
import { TrophyIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';

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

// Initial empty state
const INITIAL_DATA: TickerData = {
  rankings: [],
  site_profit_today: 0,
  king_midas_pot: 0,
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
        if (!data.rankings) {
          console.log('No rankings found');
          // Keep existing state or set to empty if needed
        } else {
          setTickerData(data);
        }
      } else {
        console.error('API error fetching ticker data');
      }
    } catch (error) {
      console.error('Failed to fetch ticker data:', error);
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
          <ArrowTrendingUpIcon className="w-3 h-3" />
          {Math.abs(rank_change)}
        </span>
      );
    } else if (change_direction === 'down') {
      return (
        <span className="text-red-400 inline-flex items-center gap-1">
          <ArrowTrendingDownIcon className="w-3 h-3" />
          {Math.abs(rank_change)}
        </span>
      );
    }
    return (
      <span className="text-white/40 inline-flex items-center gap-1">
        <MinusIcon className="w-3 h-3" />
      </span>
    );
  };



  // Create the ticker content
  const tickerContent = (
    <>
      {tickerData.rankings.length > 0 ? (
        tickerData.rankings.map((ranking) => (
          <span key={`${ranking.rank}-${ranking.affiliate_code}`} className="inline-flex items-center gap-2 mx-8">
            {ranking.rank <= 3 && (
              <TrophyIcon className={`w-4 h-4 ${ranking.rank === 1 ? 'text-yellow-400' :
                ranking.rank === 2 ? 'text-gray-300' :
                  'text-amber-600'
                }`} />
            )}
            <span className={`font-bold ${ranking.rank === 1 ? 'text-yellow-400' :
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
          <TrophyIcon className="w-4 h-4" />
          <span>No rankings available yet</span>
        </span>
      )}
      <span className="inline-flex items-center gap-2 mx-8 text-white/80">
        <span className="font-semibold">Site Profit Today:</span>
        <span className="text-green-400 font-bold">${tickerData.site_profit_today.toFixed(2)}</span>
      </span>
      <span className="inline-flex items-center gap-2 mx-8">
        <TrophyIcon className="w-4 h-4 text-yellow-400" />
        <span className="font-semibold text-white/80">King Midas Pot:</span>
        <span className="text-yellow-400 font-bold">${tickerData.king_midas_pot.toFixed(2)}</span>
      </span>

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

      <style>{`
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

