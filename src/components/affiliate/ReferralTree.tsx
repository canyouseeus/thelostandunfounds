import { useState, useEffect } from 'react';
import { Network, TrendingUp } from 'lucide-react';

interface ReferralTreeProps {
  affiliateId: string;
}

interface Affiliate {
  id: string;
  affiliate_code: string;
  status: string;
  total_earnings: number;
  reward_points: number;
  created_at: string;
  referred_by?: string;
}

interface TreeData {
  level1_affiliates: Affiliate[];
  level2_affiliates: Affiliate[];
  totals: {
    total_level1_affiliates: number;
    total_level2_affiliates: number;
    total_network_size: number;
  };
}

export default function ReferralTree({ affiliateId }: ReferralTreeProps) {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTreeData();
  }, [affiliateId]);

  const fetchTreeData = async () => {
    try {
      const response = await fetch(`/api/affiliates/referrals?affiliate_id=${affiliateId}&type=affiliates`);
      if (response.ok) {
        const data = await response.json();
        setTreeData({
          level1_affiliates: data.level1_affiliates || [],
          level2_affiliates: data.level2_affiliates || [],
          totals: data.totals
        });
      }
    } catch (error) {
      console.error('Error fetching referral tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleL1 = (affiliateId: string) => {
    const newExpanded = new Set(expandedL1);
    if (newExpanded.has(affiliateId)) {
      newExpanded.delete(affiliateId);
    } else {
      newExpanded.add(affiliateId);
    }
    setExpandedL1(newExpanded);
  };

  const getL2ForL1 = (l1Id: string) => {
    return treeData?.level2_affiliates.filter(a => a.referred_by === l1Id) || [];
  };

  return (
    <div className="bg-black/50 border-0 rounded-none p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Network className="text-white" size={24} />
          <h3 className="text-xl font-bold text-white">My Affiliate Network</h3>
        </div>
        <span className="text-white/60 text-sm">
          {treeData?.totals.total_network_size || 0} total
        </span>
      </div>

      {loading ? (
        <p className="text-white/60 text-center py-8">Loading network...</p>
      ) : treeData && treeData.totals.total_network_size > 0 ? (
        <div className="space-y-6">
          {/* Network Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 border-0 rounded-none p-4 text-center">
              <p className="text-white/60 text-sm mb-1">Level 1 (2%)</p>
              <p className="text-white text-3xl font-bold">{treeData.totals.total_level1_affiliates}</p>
            </div>
            <div className="bg-white/5 border-0 rounded-none p-4 text-center">
              <p className="text-white/60 text-sm mb-1">Level 2 (1%)</p>
              <p className="text-white text-3xl font-bold">{treeData.totals.total_level2_affiliates}</p>
            </div>
          </div>

          {/* Level 1 Affiliates */}
          {treeData.level1_affiliates.length > 0 && (
            <div>
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <TrendingUp size={18} className="text-white" />
                Level 1 Referrals (Direct)
              </h4>
              <div className="space-y-2">
                {treeData.level1_affiliates.map((affiliate) => {
                  const l2Affiliates = getL2ForL1(affiliate.id);
                  const hasL2 = l2Affiliates.length > 0;
                  const isExpanded = expandedL1.has(affiliate.id);

                  return (
                    <div key={affiliate.id} className="border border-white/10 rounded-none">
                      {/* L1 Affiliate */}
                      <div
                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors ${hasL2 ? '' : 'cursor-default'}`}
                        onClick={() => hasL2 && toggleL1(affiliate.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                          <div>
                            <p className="text-white font-mono font-bold">{affiliate.affiliate_code}</p>
                            <p className="text-white/60 text-xs">
                              {affiliate.reward_points} pts • ${parseFloat(affiliate.total_earnings.toString()).toFixed(0)} earned
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded-none ${affiliate.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'
                            }`}>
                            {affiliate.status}
                          </span>
                          {hasL2 && (
                            <span className="text-white/40 text-sm">
                              {isExpanded ? '▼' : '▶'} {l2Affiliates.length} L2
                            </span>
                          )}
                        </div>
                      </div>

                      {/* L2 Affiliates (nested) */}
                      {hasL2 && isExpanded && (
                        <div className="bg-black/30 border-0 p-4 pl-8 space-y-2">
                          {l2Affiliates.map((l2) => (
                            <div key={l2.id} className="flex items-center justify-between p-3 bg-white/5 rounded-none">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-white/60"></div>
                                <div>
                                  <p className="text-white font-mono font-bold text-sm">{l2.affiliate_code}</p>
                                  <p className="text-white/60 text-xs">
                                    {l2.reward_points} pts • ${parseFloat(l2.total_earnings.toString()).toFixed(0)} earned
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-none ${l2.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'
                                }`}>
                                {l2.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MLM Earnings Info */}
          <div className="bg-white/10 border-0 rounded-none p-4">
            <h4 className="text-white font-medium mb-2">💰 MLM Earnings</h4>
            <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
              <li>Level 1: Earn 2% of their sales profits</li>
              <li>Level 2: Earn 1% of their sales profits</li>
              <li>All ties are permanent (lifetime earnings!)</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Network className="text-white/20 mx-auto mb-3" size={48} />
          <p className="text-white/60 text-sm">No affiliate referrals yet</p>
          <p className="text-white/40 text-xs mt-1">Share your affiliate referral link to build your network!</p>
        </div>
      )}
    </div>
  );
}



