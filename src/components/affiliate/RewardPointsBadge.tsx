import { useState, useEffect } from 'react';

interface RewardPointsBadgeProps {
  affiliateId: string;
  initialPoints?: number;
}

interface PointsData {
  total_points: number;
  history: Array<{
    id: string;
    points: number;
    profit_amount: number;
    source: string;
    description: string;
    created_at: string;
  }>;
  breakdown: {
    from_sales: number;
    from_self_purchase: number;
    from_bonus: number;
  };
}

export default function RewardPointsBadge({ affiliateId, initialPoints = 0 }: RewardPointsBadgeProps) {
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchPointsData();
  }, [affiliateId]);

  const fetchPointsData = async () => {
    try {
      // Fetch points history
      const response = await fetch(`/api/affiliates/points-history?affiliate_id=${affiliateId}`);
      if (response.ok) {
        const data = await response.json();
        setPointsData(data);
      }
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayPoints = pointsData?.total_points ?? initialPoints;

  return (
    <div className="bg-black/50 border-2 border-white rounded-none p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Reward Points</h3>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          {showHistory ? 'Hide' : 'View'} History
        </button>
      </div>

      {/* Large Points Display */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-32 h-32 border-4 border-yellow-400 rounded-full bg-yellow-400/10">
          <span className="text-5xl font-bold text-yellow-400">{displayPoints}</span>
        </div>
        <p className="text-white/60 text-sm mt-3">Total Reward Points</p>
      </div>

      {/* Points Info */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Earning Rate:</span>
          <span className="text-white font-medium">1 point per $10 profit</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Used For:</span>
          <span className="text-white font-medium">Rewards Program</span>
        </div>
      </div>

      {/* Points Breakdown */}
      {pointsData && (
        <div className="bg-white/5 border border-white/10 rounded-none p-4 mb-6">
          <h4 className="text-white font-medium mb-3">Points by Source</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Sales:</span>
              <span className="text-green-400">{pointsData.breakdown.from_sales} pts</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Self-Purchase:</span>
              <span className="text-blue-400">{pointsData.breakdown.from_self_purchase} pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Points History */}
      {showHistory && pointsData && (
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-white font-medium mb-3">Recent Activity</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pointsData.history.length > 0 ? (
              pointsData.history.map((entry) => (
                <div key={entry.id} className="flex justify-between items-start text-sm border-b border-white/5 pb-2">
                  <div className="flex-1">
                    <p className="text-white">{entry.description}</p>
                    <p className="text-white/40 text-xs">{new Date(entry.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-yellow-400 font-bold">+{entry.points}</span>
                </div>
              ))
            ) : (
              <p className="text-white/60 text-sm text-center py-4">No points history yet</p>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-white/60 text-sm py-4">Loading points data...</div>
      )}
    </div>
  );
}

