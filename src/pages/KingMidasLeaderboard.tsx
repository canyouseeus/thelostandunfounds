/**
 * Public KING MIDAS Leaderboard page.
 * Thin wrapper around <LeaderboardView /> so the same UI is shared
 * with the embedded leaderboard tab inside the affiliate dashboard.
 */

import { StarIcon } from '@heroicons/react/24/outline';
import LeaderboardView from '../components/affiliate/LeaderboardView';
import SEOHead from '../components/SEOHead';

export default function KingMidasLeaderboard() {
  return (
    <>
      <SEOHead
        title="KING MIDAS Leaderboard"
        description="Daily affiliate profit rankings and pool distributions. Top affiliates compete for 8% of daily profit at THE LOST+UNFOUNDS."
        canonicalPath="/king-midas-leaderboard"
      />
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-48">
          {/* Header */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-3 mb-3">
              <StarIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
              <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
                King Midas Leaderboard
              </h1>
            </div>
            <p className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest">
              Daily Profit Rankings · 8% Of Daily Profit · Compete Daily
            </p>
          </div>

          <LeaderboardView />
        </div>
      </div>
    </>
  );
}
