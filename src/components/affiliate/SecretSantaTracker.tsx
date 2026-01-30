import { useState, useEffect } from 'react';
import { GiftIcon } from '@heroicons/react/24/outline';

interface SecretSantaTrackerProps {
  affiliateId: string;
  rewardPoints: number;
}

interface PotData {
  year: number;
  total_amount: number;
  distributed: boolean;
  distribution_date: string | null;
  total_affiliates: number;
  total_points: number;
  your_estimated_share: number;
  your_percentage: number;
}

export default function SecretSantaTracker({ affiliateId, rewardPoints }: SecretSantaTrackerProps) {
  const [potData, setPotData] = useState<PotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPotData();
  }, [affiliateId, rewardPoints]);

  const fetchPotData = async () => {
    try {
      const response = await fetch(`/api/affiliates/secret-santa?affiliate_id=${affiliateId}`);
      if (response.ok) {
        const data = await response.json();
        setPotData(data);
      }
    } catch (error) {
      console.error('Error fetching Secret Santa data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChristmasCountdown = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const christmas = new Date(currentYear, 11, 25); // December 25

    if (now > christmas) {
      christmas.setFullYear(currentYear + 1);
    }

    const diff = christmas.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return { days, date: christmas };
  };

  const countdown = getChristmasCountdown();

  return (
    <div className="bg-black/50 border-2 border-red-500 rounded-none p-6">
      <div className="flex items-center gap-3 mb-6">
        <GiftIcon className="text-red-500 w-6 h-6" />
        <h3 className="text-xl font-bold text-white">🎄 Secret Santa Pot</h3>
      </div>

      {loading ? (
        <p className="text-white/60 text-center py-8">Loading pot data...</p>
      ) : potData ? (
        <div className="space-y-6">
          {/* Current Year Pot */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-none p-6 text-center">
            <p className="text-red-400 text-sm mb-2">{potData.year} Pot Total</p>
            <p className="text-white text-4xl font-bold mb-1">${potData.total_amount.toFixed(2)}</p>
            {!potData.distributed && (
              <p className="text-white/60 text-xs">Accumulating until Christmas</p>
            )}
            {potData.distributed && potData.distribution_date && (
              <p className="text-green-400 text-sm mt-2">
                Distributed on {new Date(potData.distribution_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Your Estimated Share */}
          {!potData.distributed && rewardPoints > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-none p-6">
              <h4 className="text-green-400 font-medium mb-4">Your Estimated Share</h4>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Your Points:</span>
                  <span className="text-white font-bold">{rewardPoints}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Total Points:</span>
                  <span className="text-white font-bold">{potData.total_points}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Your Percentage:</span>
                  <span className="text-white font-bold">{potData.your_percentage.toFixed(2)}%</span>
                </div>

                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Estimated Payout:</span>
                    <span className="text-green-400 text-2xl font-bold">
                      ${potData.your_estimated_share.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Countdown to Christmas */}
          {!potData.distributed && (
            <div className="text-center bg-white/5 border border-white/10 rounded-none p-4">
              <p className="text-white/60 text-sm mb-2">Distribution in</p>
              <p className="text-white text-3xl font-bold mb-1">{countdown.days} days</p>
              <p className="text-white/40 text-xs">
                {countdown.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* How It Works */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-none p-4">
            <h4 className="text-blue-400 font-medium mb-2">💡 How Secret Santa Works</h4>
            <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
              <li>Pot accumulates unclaimed 3% MLM bonuses all year</li>
              <li>Distributed on Christmas weighted by reward points</li>
              <li>More points = larger share of the pot</li>
              <li>All active affiliates with points get a payout</li>
            </ul>
          </div>

          {/* Warning if no points */}
          {rewardPoints === 0 && !potData.distributed && (
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-none p-4">
              <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ No Points Yet</p>
              <p className="text-white/80 text-sm">
                Earn reward points from sales to qualify for Secret Santa distribution!
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-white/60 text-center py-8">No pot data available</p>
      )}
    </div>
  );
}



