import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';

interface MLMEarningsTableProps {
  affiliateId: string;
}

interface MLMEarning {
  id: string;
  level: number;
  amount: number;
  profit_source: number;
  created_at: string;
  from_affiliate: {
    affiliate_code: string;
    status: string;
  };
  commission: {
    order_id: string;
    amount: number;
    created_at: string;
  };
}

interface MLMData {
  earnings: MLMEarning[];
  totals: {
    total_earnings: number;
    level1_earnings: number;
    level2_earnings: number;
    total_transactions: number;
    level1_transactions: number;
    level2_transactions: number;
  };
}

export default function MLMEarningsTable({ affiliateId }: MLMEarningsTableProps) {
  const [mlmData, setMlmData] = useState<MLMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '1' | '2'>('all');

  useEffect(() => {
    fetchMLMData();
  }, [affiliateId]);

  const fetchMLMData = async () => {
    try {
      const response = await fetch(`/api/affiliates/mlm-earnings?affiliate_id=${affiliateId}&level=all`);
      if (response.ok) {
        const data = await response.json();
        setMlmData(data);
      }
    } catch (error) {
      console.error('Error fetching MLM earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEarnings = mlmData?.earnings.filter(e => 
    filter === 'all' || e.level === parseInt(filter)
  ) || [];

  return (
    <div className="bg-black/50 border-2 border-white rounded-none p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="text-green-400" size={24} />
          <h3 className="text-xl font-bold text-white">MLM Earnings History</h3>
        </div>
      </div>

      {loading ? (
        <p className="text-white/60 text-center py-8">Loading MLM data...</p>
      ) : mlmData && mlmData.totals.total_transactions > 0 ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-none p-4 text-center">
              <p className="text-green-400 text-sm mb-1">Total MLM</p>
              <p className="text-white text-2xl font-bold">${mlmData.totals.total_earnings.toFixed(2)}</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-none p-4 text-center">
              <p className="text-purple-400 text-sm mb-1">Level 1 (2%)</p>
              <p className="text-white text-2xl font-bold">${mlmData.totals.level1_earnings.toFixed(2)}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-none p-4 text-center">
              <p className="text-blue-400 text-sm mb-1">Level 2 (1%)</p>
              <p className="text-white text-2xl font-bold">${mlmData.totals.level2_earnings.toFixed(2)}</p>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex gap-2">
            <span className="text-white/60 text-sm self-center">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-none transition-colors ${
                filter === 'all' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              All ({mlmData.totals.total_transactions})
            </button>
            <button
              onClick={() => setFilter('1')}
              className={`px-3 py-1 text-sm rounded-none transition-colors ${
                filter === '1' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Level 1 ({mlmData.totals.level1_transactions})
            </button>
            <button
              onClick={() => setFilter('2')}
              className={`px-3 py-1 text-sm rounded-none transition-colors ${
                filter === '2' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Level 2 ({mlmData.totals.level2_transactions})
            </button>
          </div>

          {/* Earnings Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/60 text-sm font-medium pb-2">Date</th>
                  <th className="text-left text-white/60 text-sm font-medium pb-2">From</th>
                  <th className="text-center text-white/60 text-sm font-medium pb-2">Level</th>
                  <th className="text-right text-white/60 text-sm font-medium pb-2">Profit</th>
                  <th className="text-right text-white/60 text-sm font-medium pb-2">Your Bonus</th>
                </tr>
              </thead>
              <tbody>
                {filteredEarnings.map((earning) => (
                  <tr key={earning.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 text-white/80 text-sm">
                      {new Date(earning.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-white text-sm font-mono">
                      {earning.from_affiliate.affiliate_code}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-none ${
                        earning.level === 1 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        L{earning.level} ({earning.level === 1 ? '2%' : '1%'})
                      </span>
                    </td>
                    <td className="py-3 text-white/80 text-sm text-right">
                      ${parseFloat(earning.profit_source.toString()).toFixed(2)}
                    </td>
                    <td className="py-3 text-green-400 text-sm text-right font-bold">
                      ${parseFloat(earning.amount.toString()).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <DollarSign className="text-white/20 mx-auto mb-3" size={48} />
          <p className="text-white/60 text-sm">No MLM earnings yet</p>
          <p className="text-white/40 text-xs mt-1">Build your affiliate network to earn MLM bonuses!</p>
        </div>
      )}
    </div>
  );
}



