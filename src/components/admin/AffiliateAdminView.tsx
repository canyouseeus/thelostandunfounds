/**
 * Admin Affiliate View Component
 * Shows all affiliates and allows viewing their dashboard data
 */

import { useState, useEffect } from 'react';
import { Users, Search, Eye, TrendingUp, DollarSign, Network, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { safeJsonParse } from '../../utils/helpers';

interface Affiliate {
  id: string;
  code: string;
  user_id: string;
  status: string;
  commission_rate: number;
  total_earnings: number;
  total_clicks: number;
  total_conversions: number;
  reward_points: number;
  total_mlm_earnings: number;
  created_at: string;
}

export default function AffiliateAdminView() {
  const navigate = useNavigate();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use service role to get all affiliates
      const response = await fetch('/api/admin/affiliates');
      
      // Check if response is HTML (means API route isn't working)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error(
          'API routes are not available. ' +
          'Please restart your dev server with "npm run dev:api" (uses vercel dev) ' +
          'or test in production/deployed environment. ' +
          'Note: "npm run dev" uses Vite (frontend only). Use "npm run dev:api" for API routes.'
        );
      }
      
      if (!response.ok) {
        const errorData = await safeJsonParse(response).catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || 'Failed to load affiliates');
      }

      const result = await safeJsonParse(response);
      setAffiliates(result.affiliates || []);
    } catch (err) {
      console.error('Error loading affiliates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredAffiliates = affiliates.filter(affiliate =>
    affiliate.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    affiliate.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bg-black/50 border border-white/10 rounded-none p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-white/60">Loading affiliates...</div>
        </div>
      </div>
    );
  }

  if (error) {
    const isApiRouteError = error.includes('API routes are not available');
    
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
        <p className="text-red-400 mb-4">Error: {error}</p>
        
        {isApiRouteError && (
          <div className="bg-black/50 border border-white/20 rounded-none p-4 mb-4">
            <p className="text-white/80 mb-3 font-semibold">Quick Fix:</p>
            <ol className="list-decimal list-inside text-white/70 space-y-2 mb-4">
              <li>Stop your current dev server (press <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+C</kbd> in terminal)</li>
              <li>Run: <code className="px-2 py-1 bg-white/10 rounded text-xs">npm run dev</code></li>
              <li>Refresh this page</li>
            </ol>
            <p className="text-white/60 text-sm">
              <strong>Note:</strong> The default <code className="text-white/80">npm run dev</code> now uses <code className="text-white/80">vercel dev</code> which supports API routes.
            </p>
          </div>
        )}
        
        <button
          onClick={loadAffiliates}
          className="px-4 py-2 bg-white text-black rounded-none hover:bg-white/90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/50 border border-white/10 rounded-none p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Affiliate Management</h2>
          </div>
          <div className="text-white/60 text-sm">
            Total: {affiliates.length} affiliates
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by code or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/30 rounded-none text-white placeholder-white/50"
          />
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-black/50 border border-white/10 rounded-none p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-3 text-white/60 text-sm font-medium">Code</th>
                <th className="pb-3 text-white/60 text-sm font-medium">Status</th>
                <th className="pb-3 text-white/60 text-sm font-medium">Earnings</th>
                <th className="pb-3 text-white/60 text-sm font-medium">Clicks</th>
                <th className="pb-3 text-white/60 text-sm font-medium">Conversions</th>
                <th className="pb-3 text-white/60 text-sm font-medium">Points</th>
                <th className="pb-3 text-white/60 text-sm font-medium">MLM Earnings</th>
                <th className="pb-3 text-white/60 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAffiliates.map((affiliate) => (
                <tr key={affiliate.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="py-3">
                    <span className="font-mono text-white font-semibold">{affiliate.code}</span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-none text-xs ${
                      affiliate.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      affiliate.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {affiliate.status}
                    </span>
                  </td>
                  <td className="py-3 text-white font-semibold">
                    {formatCurrency(affiliate.total_earnings || 0)}
                  </td>
                  <td className="py-3 text-white/80">
                    {affiliate.total_clicks || 0}
                  </td>
                  <td className="py-3 text-white/80">
                    {affiliate.total_conversions || 0}
                  </td>
                  <td className="py-3 text-white/80">
                    {affiliate.reward_points || 0}
                  </td>
                  <td className="py-3 text-white/80">
                    {formatCurrency(affiliate.total_mlm_earnings || 0)}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => navigate(`/affiliates/${affiliate.id}`)}
                      className="px-3 py-1 bg-white text-black rounded-none hover:bg-white/90 transition text-sm flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredAffiliates.length === 0 && (
            <div className="text-center py-12 text-white/60">
              No affiliates found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

