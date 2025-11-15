/**
 * Affiliate Dashboard Page
 * View affiliate stats, manage links, and access marketing materials
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Copy, 
  Check, 
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Mail,
  Share2,
  Settings,
  ExternalLink
} from 'lucide-react';
import { LoadingSpinner, SkeletonCard } from '../components/Loading';
import { affiliateService, type Affiliate, type AffiliateStats, type Commission, type Referral, type MarketingMaterial } from '../services/affiliate';

export default function AffiliateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [recentCommissions, setRecentCommissions] = useState<Commission[]>([]);
  const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);
  const [marketingMaterials, setMarketingMaterials] = useState<MarketingMaterial[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [updatingPayPal, setUpdatingPayPal] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboard();
    }
  }, [user, authLoading]);

  const loadDashboard = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { affiliate: affData, stats: statsData, recent_commissions, recent_referrals, error } = await affiliateService.getDashboard();
      
      if (error) {
        // User might not be registered as affiliate yet
        if (error.message.includes('not found')) {
          setAffiliate(null);
        } else {
          showError('Failed to load dashboard');
        }
      } else {
        setAffiliate(affData);
        setStats(statsData);
        setRecentCommissions(recent_commissions || []);
        setRecentReferrals(recent_referrals || []);
      }

      // Load marketing materials
      const { materials } = await affiliateService.getMarketingMaterials();
      setMarketingMaterials(materials);
    } catch (err) {
      showError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) return;

    setRegistering(true);
    try {
      const { affiliate: newAffiliate, error } = await affiliateService.register();
      
      if (error) {
        showError(error.message || 'Failed to register as affiliate');
      } else if (newAffiliate) {
        setAffiliate(newAffiliate);
        success('Successfully registered as affiliate!');
        await loadDashboard();
      }
    } catch (err) {
      showError('Failed to register as affiliate');
    } finally {
      setRegistering(false);
    }
  };

  const handleCopyCode = async () => {
    if (!affiliate?.referral_code) return;

    try {
      await navigator.clipboard.writeText(affiliate.referral_code);
      setCopiedCode(true);
      success('Referral code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      showError('Failed to copy code');
    }
  };

  const handleCopyLink = async (path: string = '') => {
    if (!affiliate?.referral_code) return;

    const link = affiliateService.generateAffiliateLink(affiliate.referral_code, path);
    try {
      await navigator.clipboard.writeText(link);
      success('Affiliate link copied!');
    } catch (err) {
      showError('Failed to copy link');
    }
  };

  const handleUpdatePayPal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paypalEmail) return;

    setUpdatingPayPal(true);
    try {
      const { error } = await affiliateService.updatePayPalEmail(paypalEmail);
      
      if (error) {
        showError(error.message || 'Failed to update PayPal email');
      } else {
        success('PayPal email updated successfully');
        setShowPayPalModal(false);
        setPaypalEmail('');
        await loadDashboard();
      }
    } catch (err) {
      showError('Failed to update PayPal email');
    } finally {
      setUpdatingPayPal(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SkeletonCard />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-white/70">Please sign in to access the affiliate dashboard.</p>
        </div>
      </div>
    );
  }

  // User not registered as affiliate
  if (!affiliate) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-black border border-white/10 rounded-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Join Our Affiliate Program</h1>
          <p className="text-white/70 mb-8">
            Earn 50% commission on every subscription you refer. Start earning today!
          </p>
          <button
            onClick={handleRegister}
            disabled={registering}
            className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {registering && <LoadingSpinner size="sm" />}
            {registering ? 'Registering...' : 'Register as Affiliate'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Affiliate Dashboard</h1>
        <p className="text-white/70">Track your referrals and earnings</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-black border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Earnings</span>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">${parseFloat(stats.total_earnings.toString()).toFixed(2)}</div>
            <div className="text-xs text-white/40 mt-1">${parseFloat(stats.total_paid.toString()).toFixed(2)} paid</div>
          </div>

          <div className="bg-black border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Pending</span>
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">${stats.pending_amount}</div>
            <div className="text-xs text-white/40 mt-1">{stats.pending_commissions} commissions</div>
          </div>

          <div className="bg-black border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Referrals</span>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.total_referrals}</div>
            <div className="text-xs text-white/40 mt-1">{stats.conversions} conversions ({stats.conversion_rate}%)</div>
          </div>

          <div className="bg-black border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Available Balance</span>
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">${stats.available_balance}</div>
            <div className="text-xs text-white/40 mt-1">Ready to withdraw</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Referral Code & Links */}
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Your Referral Code
          </h2>
          
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                <code className="text-2xl font-bold text-white">{affiliate.referral_code}</code>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-4 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition flex items-center gap-2"
              >
                {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-white/60 text-sm mb-3">Quick Links:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={affiliateService.generateAffiliateLink(affiliate.referral_code, '/')}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                />
                <button
                  onClick={() => handleCopyLink('/')}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={affiliateService.generateAffiliateLink(affiliate.referral_code, '/pricing')}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                />
                <button
                  onClick={() => handleCopyLink('/pricing')}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* PayPal Settings */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm">PayPal Email</span>
              <button
                onClick={() => {
                  setPaypalEmail(affiliate.paypal_email || '');
                  setShowPayPalModal(true);
                }}
                className="text-white/60 hover:text-white transition text-sm flex items-center gap-1"
              >
                <Settings className="w-4 h-4" />
                Update
              </button>
            </div>
            <p className="text-white/60 text-sm">
              {affiliate.paypal_email || 'Not set - add your PayPal email to receive payouts'}
            </p>
          </div>
        </div>

        {/* Recent Commissions */}
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Commissions</h2>
          {recentCommissions.length === 0 ? (
            <p className="text-white/60 text-sm">No commissions yet</p>
          ) : (
            <div className="space-y-3">
              {recentCommissions.map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <div className="text-white font-medium">${parseFloat(commission.commission_amount.toString()).toFixed(2)}</div>
                    <div className="text-xs text-white/60">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    commission.status === 'paid' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {commission.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Marketing Materials */}
      {marketingMaterials.length > 0 && (
        <div className="mt-8 bg-black border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Marketing Materials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketingMaterials.map((material) => (
              <div key={material.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-medium">{material.title}</h3>
                  {material.material_type === 'banner' && <ImageIcon className="w-4 h-4 text-white/60" />}
                  {material.material_type === 'email_template' && <Mail className="w-4 h-4 text-white/60" />}
                  {material.material_type === 'social_post' && <Share2 className="w-4 h-4 text-white/60" />}
                </div>
                {material.description && (
                  <p className="text-white/60 text-sm mb-3">{material.description}</p>
                )}
                {material.file_url && (
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white text-sm flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PayPal Email Modal */}
      {showPayPalModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Update PayPal Email</h2>
              <button
                onClick={() => {
                  setShowPayPalModal(false);
                  setPaypalEmail('');
                }}
                className="text-white/60 hover:text-white transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePayPal} className="space-y-4">
              <div>
                <label htmlFor="paypalEmail" className="block text-sm font-medium text-white/80 mb-2">
                  PayPal Email Address
                </label>
                <input
                  id="paypalEmail"
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  placeholder="your-email@example.com"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updatingPayPal}
                  className="flex-1 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {updatingPayPal && <LoadingSpinner size="sm" />}
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPayPalModal(false);
                    setPaypalEmail('');
                  }}
                  className="px-4 py-2 bg-black border border-white/10 text-white font-semibold rounded-lg hover:border-white/30 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
