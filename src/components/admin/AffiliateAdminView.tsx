/**
 * Admin Affiliate View Component
 * Shows all affiliates and allows viewing their dashboard data
 */

import { useState, useEffect } from 'react';
import { UsersIcon, MagnifyingGlassIcon, EyeIcon, ArrowTrendingUpIcon, CurrencyDollarIcon, ShareIcon, GiftIcon } from '@heroicons/react/24/outline';
import { LoadingOverlay } from '../Loading';
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
    return <LoadingOverlay message="Loading Affiliate Data" />;
  }

  if (error) {
    const isApiRouteError = error.includes('API routes are not available');

    return (
      <div className="bg-red-500/10 border-l-2 border-red-500 p-6">
        <p className="text-red-400 mb-4 font-medium">Error: {error}</p>

        {isApiRouteError && (
          <div className="bg-white/5 border border-white/10 p-4 mb-4">
            <p className="text-white/80 mb-3 font-semibold text-sm uppercase tracking-wider">Quick Fix</p>
            <ol className="list-decimal list-inside text-white/70 space-y-2 mb-4 text-xs">
              <li>Stop your current dev server (press <kbd className="px-2 py-1 bg-white/10 rounded-sm">Ctrl+C</kbd> in terminal)</li>
              <li>Run: <code className="px-2 py-1 bg-white/10 rounded-sm">npm run dev</code></li>
              <li>Refresh this page</li>
            </ol>
            <p className="text-white/60 text-[10px] uppercase tracking-wide">
              <strong>Note:</strong> The default <code className="text-white/80">npm run dev</code> now uses <code className="text-white/80">vercel dev</code> which supports API routes.
            </p>
          </div>
        )}

        <button
          onClick={loadAffiliates}
          className="px-6 py-2 bg-white text-black hover:bg-white/90 transition text-xs font-bold uppercase tracking-widest"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-[#0A0A0A] p-10 shadow-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <UsersIcon className="w-8 h-8 text-white/40" />
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-[0.3em]">Affiliate Network</h2>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium mt-1">
                Central Node Management
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-white">{affiliates.length}</div>
            <div className="text-[9px] text-white/20 uppercase tracking-widest font-black">Active Nodes</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative pt-4 border-t border-white/5">
          <MagnifyingGlassIcon className="absolute left-0 top-[2.4rem] text-white/20 w-5 h-5" />
          <input
            type="text"
            placeholder="FILTER NODES BY CODE OR IDENTIFIER..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-4 bg-transparent border-b border-white/10 text-white placeholder-white/10 uppercase tracking-[0.2em] text-[11px] focus:border-white transition-colors outline-none font-black"
          />
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-[#0A0A0A] p-10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-6 text-white/20 text-[10px] uppercase tracking-widest font-black">Node Code</th>
                <th className="pb-6 text-white/20 text-[10px] uppercase tracking-widest font-black">Status</th>
                <th className="pb-6 text-white/20 text-[10px] uppercase tracking-widest font-black">Node Earnings</th>
                <th className="pb-6 text-white/20 text-[10px] uppercase tracking-widest font-black">Hits</th>
                <th className="pb-6 text-white/20 text-[10px] uppercase tracking-widest font-black">Conversions</th>
                <th className="pb-6 text-white/20 text-[10px] uppercase tracking-widest font-black">Nexus Points</th>
                <th className="pb-6 text-white/20 text-[10px] uppercase tracking-widest font-black">Network Yield</th>
                <th className="pb-6 text-white/20 text-[10px] uppercase tracking-widest font-black">Auth</th>
              </tr>
            </thead>
            <tbody>
              {filteredAffiliates.map((affiliate) => (
                <tr key={affiliate.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="py-3">
                    <span className="font-mono text-white font-semibold">{affiliate.code}</span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-none text-xs ${affiliate.status === 'active' ? 'bg-green-500/20 text-green-400' :
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
                  <td className="py-4">
                    <button
                      onClick={() => navigate(`/affiliates/${affiliate.id}`)}
                      className="px-4 py-2 bg-white/5 hover:bg-white text-white hover:text-black font-black uppercase tracking-widest text-[9px] transition-all"
                    >
                      VIEW NODE
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

