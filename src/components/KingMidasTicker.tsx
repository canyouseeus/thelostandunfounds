import { useEffect, useState } from 'react';
import { TrophyIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';
import { LightBoard } from './ui/lightboard';

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

const INITIAL_DATA: TickerData = {
  rankings: [],
  site_profit_today: 0,
  king_midas_pot: 0,
  last_updated: new Date().toISOString(),
};

const LED_GLOW = '0 0 6px rgba(251,191,36,0.8), 0 0 12px rgba(245,158,11,0.4)';
const GREEN_GLOW = '0 0 6px rgba(74,222,128,0.8), 0 0 12px rgba(34,197,94,0.4)';
const WHITE_GLOW = '0 0 4px rgba(255,255,255,0.6)';

export default function KingMidasTicker() {
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTickerData = async () => {
    try {
      const response = await fetch('/api/king-midas/ticker');
      if (response.ok) {
        const data = await response.json();
        if (data.rankings) {
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
    const interval = setInterval(fetchTickerData, 3600000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !tickerData) {
    return (
      <LightBoard
        className="h-12"
        label={
          <div className="flex flex-col items-center px-2">
            <span className="text-[7px] font-black tracking-[0.3em] uppercase leading-none" style={{ color: '#fbbf24', textShadow: LED_GLOW }}>KING</span>
            <span className="text-[7px] font-black tracking-[0.3em] uppercase leading-none mt-0.5" style={{ color: '#fbbf24', textShadow: LED_GLOW }}>MIDAS</span>
          </div>
        }
        labelWidth={68}
      >
        <div className="flex items-center h-full px-4">
          <span
            className="text-xs font-mono tracking-widest"
            style={{ color: '#fbbf24', textShadow: LED_GLOW }}
          >
            LOADING RANKINGS...
          </span>
        </div>
      </LightBoard>
    );
  }

  const getRankIcon = (change_direction: string, rank_change: number) => {
    if (change_direction === 'up') {
      return (
        <span className="inline-flex items-center gap-0.5" style={{ color: '#4ade80', textShadow: GREEN_GLOW }}>
          <ArrowTrendingUpIcon className="w-3 h-3" />
          {Math.abs(rank_change)}
        </span>
      );
    } else if (change_direction === 'down') {
      return (
        <span className="inline-flex items-center gap-0.5" style={{ color: '#f87171' }}>
          <ArrowTrendingDownIcon className="w-3 h-3" />
          {Math.abs(rank_change)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <MinusIcon className="w-3 h-3" />
      </span>
    );
  };

  const tickerContent = (
    <>
      {tickerData.rankings.length > 0 ? (
        tickerData.rankings.map((ranking) => (
          <span key={`${ranking.rank}-${ranking.affiliate_code}`} className="inline-flex items-center gap-2 mx-8">
            {ranking.rank <= 3 && (
              <TrophyIcon
                className="w-3.5 h-3.5"
                style={{
                  color: ranking.rank === 1 ? '#fbbf24' : ranking.rank === 2 ? '#d1d5db' : '#d97706',
                  filter: ranking.rank === 1 ? `drop-shadow(${LED_GLOW.split(',')[0].replace('0 0', '0 0')})` : undefined,
                }}
              />
            )}
            <span
              className="font-mono font-bold"
              style={{
                color: ranking.rank === 1 ? '#fbbf24' : ranking.rank === 2 ? '#e5e7eb' : ranking.rank === 3 ? '#d97706' : 'rgba(255,255,255,0.5)',
                textShadow: ranking.rank === 1 ? LED_GLOW : undefined,
              }}
            >
              #{ranking.rank}
            </span>
            <span className="font-mono font-semibold" style={{ color: '#fff', textShadow: WHITE_GLOW }}>
              {ranking.affiliate_code}
            </span>
            <span className="font-mono font-bold" style={{ color: '#4ade80', textShadow: GREEN_GLOW }}>
              ${ranking.profit.toFixed(2)}
            </span>
            {getRankIcon(ranking.change_direction, ranking.rank_change)}
          </span>
        ))
      ) : (
        <span className="inline-flex items-center gap-2 mx-8 font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <TrophyIcon className="w-3.5 h-3.5" />
          <span>NO RANKINGS YET</span>
        </span>
      )}
      <span className="inline-flex items-center gap-2 mx-8">
        <span className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em' }}>SITE PROFIT TODAY:</span>
        <span className="font-mono font-bold text-[11px]" style={{ color: '#4ade80', textShadow: GREEN_GLOW }}>
          ${tickerData.site_profit_today.toFixed(2)}
        </span>
      </span>
      <span className="inline-flex items-center gap-2 mx-8">
        <TrophyIcon className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
        <span className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em' }}>KING MIDAS POT:</span>
        <span className="font-mono font-bold text-[11px]" style={{ color: '#fbbf24', textShadow: LED_GLOW }}>
          ${tickerData.king_midas_pot.toFixed(2)}
        </span>
      </span>
      {/* Separator */}
      <span className="mx-8 font-mono" style={{ color: 'rgba(251,191,36,0.3)' }}>◆◆◆</span>
    </>
  );

  return (
    <LightBoard
      className="h-12 border-b border-yellow-400/20"
      label={
        <div className="flex flex-col items-center px-2">
          <span
            className="text-[7px] font-black tracking-[0.3em] uppercase leading-none"
            style={{ color: '#fbbf24', textShadow: LED_GLOW, fontFamily: '"Courier New", monospace' }}
          >
            KING
          </span>
          <span
            className="text-[7px] font-black tracking-[0.3em] uppercase leading-none mt-0.5"
            style={{ color: '#fbbf24', textShadow: LED_GLOW, fontFamily: '"Courier New", monospace' }}
          >
            MIDAS
          </span>
        </div>
      }
      labelWidth={68}
    >
      <div className="ticker-wrapper h-full">
        <div
          className="ticker-content"
          style={{
            fontFamily: '"Courier New", "Lucida Console", monospace',
            fontSize: '11px',
            letterSpacing: '0.05em',
          }}
        >
          {tickerContent}
          {tickerContent}
        </div>
      </div>

      <style>{`
        .ticker-wrapper {
          width: 100%;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        .ticker-content {
          display: flex;
          align-items: center;
          white-space: nowrap;
          animation: km-scroll-left 60s linear infinite;
        }

        .ticker-wrapper:hover .ticker-content {
          animation-play-state: paused;
        }

        @keyframes km-scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @media (max-width: 768px) {
          .ticker-content {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </LightBoard>
  );
}
