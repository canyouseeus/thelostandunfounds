import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  TrendingUp, 
  DollarSign, 
  MousePointerClick, 
  ShoppingCart, 
  Trophy,
  Copy,
  Check,
  Award,
  Calendar,
  Loader2,
  ExternalLink,
  Star,
  Network,
  Gift,
  Tag,
  Edit,
  X,
  Save,
  Users
} from 'lucide-react'
import { Link } from 'react-router-dom'
import KingMidasTicker from '../components/KingMidasTicker'
import EmployeeDiscount from '../components/affiliate/EmployeeDiscount'
import RewardPointsBadge from '../components/affiliate/RewardPointsBadge'
import ReferralLink from '../components/affiliate/ReferralLink'
import CustomerList from '../components/affiliate/CustomerList'
import ReferralTree from '../components/affiliate/ReferralTree'
import MLMEarningsTable from '../components/affiliate/MLMEarningsTable'

interface DashboardData {
  affiliate: {
    id: string
    code: string
    status: string
    commission_rate: number
    total_earnings: number
    total_clicks: number
    total_conversions: number
    created_at: string
    reward_points: number
    discount_credit_balance: number
    total_mlm_earnings: number
  }
  overview: {
    total_commissions: number
    total_commission_amount: number
    total_profit_generated: number
    approved_commissions: number
    pending_commissions: number
    total_king_midas_earnings: number
    pending_payouts: number
    paid_payouts: number
    top_3_finishes: number
    first_place_finishes: number
    current_rank: number | null
    profit_trend_7d: number
    best_day: { date: string; profit: number } | null
    average_commission: number
    average_profit: number
    conversion_rate: number
  }
  mlm: {
    network: {
      total_customers: number
      level1_affiliates: number
      level2_affiliates: number
      total_network: number
    }
    earnings: {
      mlm_level1: number
      mlm_level2: number
      total_mlm: number
    }
    discount_code: {
      code: string
      is_active: boolean
    } | null
  }
  recent_commissions: Array<{
    id: string
    order_id: string
    amount: number
    profit_generated: number
    source: string
    status: string
    created_at: string
  }>
  king_midas: {
    recent_stats: Array<{
      date: string
      profit: number
      rank: number | null
      pool_share: number
    }>
    recent_payouts: Array<{
      date: string
      rank: number | null
      amount: number
      status: string
      paid_at: string | null
    }>
  }
}

export default function AffiliateDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [payoutSettings, setPayoutSettings] = useState<{
    paypal_email: string;
    payment_threshold: number;
  } | null>(null)
  const [editingPayout, setEditingPayout] = useState(false)
  const [paypalEmail, setPaypalEmail] = useState('')
  const [paymentThreshold, setPaymentThreshold] = useState(10)
  const [payoutError, setPayoutError] = useState<string | null>(null)
  const [payoutSuccess, setPayoutSuccess] = useState(false)
  const [showPayoutRequest, setShowPayoutRequest] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState<number>(0)
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [payoutRequestError, setPayoutRequestError] = useState<string | null>(null)
  const [payoutRequestSuccess, setPayoutRequestSuccess] = useState(false)
  const [editingCode, setEditingCode] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [updatingCode, setUpdatingCode] = useState(false)

  // For testing, use test affiliate code
  const affiliateCode = 'KING01' // In production, get from user profile

  useEffect(() => {
    loadDashboard()
    loadPayoutSettings()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/affiliates/dashboard?affiliate_code=${affiliateCode}`)
      const result = await response.json()

      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        // Fetch MLM data using the ID from the first response
        const mlmResponse = await fetch(`/api/affiliates/mlm-dashboard?affiliate_id=${result.affiliate.id}`)
        const mlmResult = await mlmResponse.json()

        setData({
          ...result,
          affiliate: {
            ...result.affiliate,
            // Merge MLM-specific affiliate fields
            reward_points: mlmResult.affiliate.reward_points,
            discount_credit_balance: mlmResult.affiliate.discount_credit_balance,
            total_mlm_earnings: mlmResult.affiliate.total_mlm_earnings
          },
          mlm: {
            network: mlmResult.network,
            earnings: mlmResult.earnings,
            discount_code: mlmResult.discount_code
          }
        })
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Failed to load dashboard')
      setData(null)
    } finally {
      setLoading(false)
    }
  }


  const loadPayoutSettings = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/affiliates/payout-settings?userId=${user.id}`);
      const result = await response.json();
      
      if (result.settings) {
        setPayoutSettings(result.settings);
        setPaypalEmail(result.settings.paypal_email);
        setPaymentThreshold(result.settings.payment_threshold);
      }
    } catch (err) {
      console.error('Error loading payout settings:', err);
    }
  }

  const handleSavePayoutSettings = async () => {
    if (!user?.id) return;

    setPayoutError(null);
    setPayoutSuccess(false);

    try {
      const response = await fetch('/api/affiliates/payout-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          paypalEmail,
          paymentThreshold,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update settings');
      }

      setPayoutSettings(result.settings);
      setEditingPayout(false);
      setPayoutSuccess(true);
      setTimeout(() => setPayoutSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating payout settings:', err);
      setPayoutError(err.message || 'Failed to update payout settings');
    }
  }

  const checkPayoutEligibility = () => {
    if (!data || !payoutSettings) return false
    const hasPayPalEmail = payoutSettings.paypal_email && payoutSettings.paypal_email.trim() !== ''
    const hasEnoughEarnings = data.affiliate.total_earnings >= payoutSettings.payment_threshold
    // Check if there are any approved commissions by checking if total_earnings > 0
    // (earnings only increase when commissions are approved)
    const hasApprovedCommissions = data.affiliate.total_earnings > 0
    return hasPayPalEmail && hasEnoughEarnings && hasApprovedCommissions
  }

  const handleRequestPayout = async () => {
    if (!user?.id || !data) return

    setPayoutRequestError(null)
    setPayoutRequestSuccess(false)
    setRequestingPayout(true)

    try {
      const amount = payoutAmount || data.affiliate.total_earnings

      const response = await fetch('/api/affiliates/request-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          affiliateCode: data.affiliate.code,
          amount: amount,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to request payout')
      }

      setPayoutRequestSuccess(true)
      setShowPayoutRequest(false)
      setPayoutAmount(0)
      
      // Reload dashboard to refresh data
      await loadDashboard()
      
      setTimeout(() => setPayoutRequestSuccess(false), 5000)
    } catch (err: any) {
      console.error('Error requesting payout:', err)
      setPayoutRequestError(err.message || 'Failed to request payout')
    } finally {
      setRequestingPayout(false)
    }
  }

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/shop?ref=${affiliateCode}`
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEditCode = () => {
    if (data) {
      setNewCode(data.affiliate.code)
      setEditingCode(true)
      setCodeError(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingCode(false)
    setNewCode('')
    setCodeError(null)
  }

  const handleSaveCode = async () => {
    if (!user || !data) return

    // Validate code format
    const codeRegex = /^[A-Z0-9]{4,12}$/;
    const cleanedCode = newCode.toUpperCase().trim()
    
    if (!codeRegex.test(cleanedCode)) {
      setCodeError('Code must be 4-12 uppercase letters/numbers only')
      return
    }

    if (cleanedCode === data.affiliate.code) {
      setCodeError('This is already your affiliate code')
      return
    }

    setUpdatingCode(true)
    setCodeError(null)

    try {
      const response = await fetch('/api/affiliates/update-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          new_code: cleanedCode,
        }),
      })

      const result = await response.json()

      if (result.error) {
        setCodeError(result.error)
        setUpdatingCode(false)
        return
      }

      // Reload dashboard with new code
      if (result.affiliate && result.affiliate.code) {
        const dashboardResponse = await fetch(`/api/affiliates/dashboard?affiliate_code=${result.affiliate.code}`)
        const dashboardResult = await dashboardResponse.json()
        if (dashboardResult && !dashboardResult.error) {
          setData(dashboardResult)
        }
      } else {
        await loadDashboard()
      }
      setEditingCode(false)
      setNewCode('')
      setCodeError(null)
      setUpdatingCode(false)
    } catch (err) {
      console.error('Error updating affiliate code:', err)
      setCodeError('Failed to update affiliate code. Please try again.')
      setUpdatingCode(false)
    }
  }

  const getRankBadge = (rank: number | null) => {
    if (!rank) return null
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-300" />
    if (rank === 3) return <Trophy className="w-5 h-5 text-orange-400" />
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-red-400/20 border border-red-400/50 text-red-400 px-6 py-4 rounded-none max-w-md">
          {error || 'Failed to load dashboard'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <KingMidasTicker />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Affiliate Dashboard</h1>
          <p className="text-white/60">Welcome back! Here's your performance overview.</p>
        </div>

        {/* Affiliate Info Card */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-sm text-white/60 mb-1">Your Affiliate Code</div>
              {editingCode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                        setNewCode(value)
                        setCodeError(null)
                      }}
                      maxLength={12}
                      className="text-3xl font-bold text-white bg-black/50 border border-white/20 px-3 py-2 focus:outline-none focus:border-white/40 font-mono"
                      placeholder="Enter code"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveCode}
                      disabled={updatingCode}
                      className="p-2 bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      {updatingCode ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updatingCode}
                      className="p-2 bg-red-500/50 hover:bg-red-500/70 text-white transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {codeError && (
                    <div className="text-sm text-red-400">{codeError}</div>
                  )}
                  <div className="text-xs text-white/40">
                    Code must be 4-12 uppercase letters/numbers only
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-white font-mono">{data.affiliate.code}</div>
                  <button
                    onClick={handleEditCode}
                    className="p-2 hover:bg-white/10 transition-colors"
                    title="Edit affiliate code"
                  >
                    <Edit className="w-4 h-4 text-white/60 hover:text-white" />
                  </button>
                </div>
              )}
              <div className="text-sm text-white/60 mt-1">
                Commission Rate: {data.affiliate.commission_rate}% • 
                Status: <span className="text-green-400">{data.affiliate.status}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={copyReferralLink}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-white/90 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Referral Link'}
              </button>
              <Link
                to={`/shop?ref=${affiliateCode}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 bg-black/50 border border-white/10 hover:bg-black/70 transition-colors text-center justify-center"
              >
                <ExternalLink className="w-4 h-4" />
                Preview Shop
              </Link>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Earnings */}
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Earnings</span>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              ${data.affiliate.total_earnings.toFixed(2)}
            </div>
            <div className="text-xs text-white/40">All time</div>
          </div>

          {/* Total Clicks */}
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Clicks</span>
              <MousePointerClick className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {data.affiliate.total_clicks.toLocaleString()}
            </div>
            <div className="text-xs text-white/40">
              {data.overview.conversion_rate.toFixed(2)}% conversion rate
            </div>
          </div>

          {/* Total Conversions */}
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Conversions</span>
              <ShoppingCart className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {data.affiliate.total_conversions}
            </div>
            <div className="text-xs text-white/40">
              ${data.overview.average_commission.toFixed(2)} avg commission
            </div>
          </div>

          {/* King Midas Rank */}
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Current Rank</span>
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              {getRankBadge(data.overview.current_rank)}
              <div className="text-3xl font-bold text-white">
                {data.overview.current_rank ? `#${data.overview.current_rank}` : 'N/A'}
              </div>
            </div>
            <div className="text-xs text-white/40">
              {data.overview.top_3_finishes} top 3 finishes
            </div>
          </div>
        </div>

        {/* MLM Quick Stats Row */}
        {data.mlm && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-black/50 border-2 border-white rounded-none p-6 text-center">
              <Star className="text-yellow-400 mx-auto mb-2" size={32} />
              <p className="text-white/60 text-sm mb-1">Reward Points</p>
              <p className="text-2xl font-bold text-white">{data.affiliate.reward_points}</p>
            </div>
            
            <div className="bg-black/50 border-2 border-white rounded-none p-6 text-center">
              <Users className="text-blue-400 mx-auto mb-2" size={32} />
              <p className="text-white/60 text-sm mb-1">Customers</p>
              <p className="text-2xl font-bold text-white">{data.mlm.network.total_customers}</p>
            </div>
            
            <div className="bg-black/50 border-2 border-white rounded-none p-6 text-center">
              <Network className="text-purple-400 mx-auto mb-2" size={32} />
              <p className="text-white/60 text-sm mb-1">Network Size</p>
              <p className="text-2xl font-bold text-white">{data.mlm.network.total_network}</p>
            </div>
            
            <div className="bg-black/50 border-2 border-white rounded-none p-6 text-center">
              <Gift className="text-red-400 mx-auto mb-2" size={32} />
              <p className="text-white/60 text-sm mb-1">Credit Balance</p>
              <p className="text-2xl font-bold text-white">
                ${data.affiliate.discount_credit_balance?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        )}

        {/* Employee Discount */}
        {data.mlm && (
          <div className="mb-8">
            <EmployeeDiscount
              affiliateId={data.affiliate.id}
              affiliateCode={data.affiliate.code}
              creditBalance={data.affiliate.discount_credit_balance}
            />
          </div>
        )}

        {/* Reward Points */}
        {data.mlm && (
          <div className="mb-8">
            <RewardPointsBadge
              affiliateId={data.affiliate.id}
              initialPoints={data.affiliate.reward_points}
            />
          </div>
        )}

        {/* MLM Referrals & Earnings */}
        {data.mlm && (
          <>
            <div className="mb-8">
              <ReferralLink affiliateCode={data.affiliate.code} />
            </div>

            <div className="mb-8">
              <MLMEarningsTable affiliateId={data.affiliate.id} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ReferralTree affiliateId={data.affiliate.id} />
              <CustomerList affiliateId={data.affiliate.id} />
            </div>
          </>
        )}

        {/* Performance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Last 30 Days Performance */}
          <div className="bg-black/50 border border-white/10 rounded-none overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Last 30 Days
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Commission Earned</span>
                <span className="text-xl font-bold text-green-400">
                  ${data.overview.total_commission_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Profit Generated</span>
                <span className="text-xl font-bold text-white">
                  ${data.overview.total_profit_generated.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Orders</span>
                <span className="text-xl font-bold text-white">
                  {data.overview.total_commissions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">7-Day Trend</span>
                <span className={`text-xl font-bold flex items-center gap-1 ${
                  data.overview.profit_trend_7d >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${
                    data.overview.profit_trend_7d < 0 ? 'rotate-180' : ''
                  }`} />
                  {Math.abs(data.overview.profit_trend_7d).toFixed(1)}%
                </span>
              </div>
              {data.overview.best_day && (
                <div className="pt-4 border-t border-white/10">
                  <div className="text-sm text-white/60 mb-1">Best Day</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">{new Date(data.overview.best_day.date).toLocaleDateString()}</span>
                    <span className="font-bold text-green-400">${data.overview.best_day.profit.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* King Midas Performance */}
          <div className="bg-black/50 border border-white/10 rounded-none overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                KING MIDAS Performance
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total Earned</span>
                <span className="text-xl font-bold text-yellow-400">
                  ${data.overview.total_king_midas_earnings.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">First Place Finishes</span>
                <span className="text-xl font-bold text-white">
                  {data.overview.first_place_finishes}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Top 3 Finishes</span>
                <span className="text-xl font-bold text-white">
                  {data.overview.top_3_finishes}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Pending Payouts</span>
                <span className="text-xl font-bold text-yellow-400">
                  {data.overview.pending_payouts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Paid Payouts</span>
                <span className="text-xl font-bold text-green-400">
                  {data.overview.paid_payouts}
                </span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <Link
                  to="/king-midas-leaderboard"
                  className="block text-center px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/30 transition-colors"
                >
                  View Full Leaderboard →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Settings */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Payout Settings</h3>
            {!editingPayout && (
              <button
                onClick={() => setEditingPayout(true)}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {payoutSuccess && (
            <div className="bg-green-400/20 border border-green-400/50 text-green-400 px-4 py-3 rounded-none text-sm mb-4">
              Payout settings updated successfully!
            </div>
          )}

          {payoutError && (
            <div className="bg-red-400/20 border border-red-400/50 text-red-400 px-4 py-3 rounded-none text-sm mb-4">
              {payoutError}
            </div>
          )}

          {editingPayout ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">PayPal Email</label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-none text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Payment Threshold (minimum $10)
                </label>
                <input
                  type="number"
                  min="10"
                  step="0.01"
                  value={paymentThreshold}
                  onChange={(e) => setPaymentThreshold(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-none text-white focus:outline-none focus:border-white/30"
                />
                <p className="text-xs text-white/50 mt-1">
                  You'll receive payouts when your earnings reach this amount
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSavePayoutSettings}
                  className="px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingPayout(false);
                    setPaypalEmail(payoutSettings?.paypal_email || '');
                    setPaymentThreshold(payoutSettings?.payment_threshold || 10);
                    setPayoutError(null);
                  }}
                  className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">PayPal Email:</span>
                <span className="text-white">{payoutSettings?.paypal_email || 'Not set'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Payment Threshold:</span>
                <span className="text-white">${payoutSettings?.payment_threshold || 10}</span>
              </div>
              {payoutRequestSuccess && (
                <div className="mt-4 bg-green-400/20 border border-green-400/50 text-green-400 px-4 py-3 rounded-none text-sm">
                  Payout request submitted successfully! We'll process it soon.
                </div>
              )}
              {payoutRequestError && (
                <div className="mt-4 bg-red-400/20 border border-red-400/50 text-red-400 px-4 py-3 rounded-none text-sm">
                  {payoutRequestError}
                </div>
              )}
              {payoutSettings && checkPayoutEligibility() && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm text-white font-medium">Available for Payout</p>
                      <p className="text-xs text-white/60">
                        ${data?.affiliate.total_earnings.toFixed(2)} available
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPayoutAmount(data?.affiliate.total_earnings || 0)
                      setShowPayoutRequest(true)
                      setPayoutRequestError(null)
                    }}
                    className="w-full px-4 py-2 bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors text-sm"
                  >
                    Request Payout
                  </button>
                </div>
              )}
              {payoutSettings && !checkPayoutEligibility() && data && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-white/60">
                    {!payoutSettings.paypal_email || payoutSettings.paypal_email.trim() === ''
                      ? 'Set your PayPal email to request payouts'
                      : data.affiliate.total_earnings < payoutSettings.payment_threshold
                      ? `Need $${(payoutSettings.payment_threshold - data.affiliate.total_earnings).toFixed(2)} more to reach threshold`
                      : 'No earnings available for payout'}
                  </p>
                </div>
              )}
              {!payoutSettings && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-white/60 mb-2">
                    Set up your payout information to receive commissions
                  </p>
                  <button
                    onClick={() => setEditingPayout(true)}
                    className="px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition-colors text-sm"
                  >
                    Set Up Payouts
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payout Request Modal */}
        {showPayoutRequest && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-black/90 border border-white/10 rounded-none p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Request Payout</h3>
              
              {payoutRequestError && (
                <div className="bg-red-400/20 border border-red-400/50 text-red-400 px-4 py-3 rounded-none text-sm mb-4">
                  {payoutRequestError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Available Earnings
                  </label>
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-none text-white font-mono">
                    ${data?.affiliate.total_earnings.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Payout Amount
                  </label>
                  <input
                    type="number"
                    min={payoutSettings?.payment_threshold || 10}
                    max={data?.affiliate.total_earnings || 0}
                    step="0.01"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-none text-white focus:outline-none focus:border-white/30 font-mono"
                  />
                  <p className="text-xs text-white/50 mt-1">
                    Minimum: ${payoutSettings?.payment_threshold || 10}
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    PayPal Email
                  </label>
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-none text-white">
                    {payoutSettings?.paypal_email || 'Not set'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleRequestPayout}
                  disabled={requestingPayout || payoutAmount < (payoutSettings?.payment_threshold || 10)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requestingPayout ? 'Requesting...' : 'Request Payout'}
                </button>
                <button
                  onClick={() => {
                    setShowPayoutRequest(false)
                    setPayoutRequestError(null)
                    setPayoutAmount(0)
                  }}
                  disabled={requestingPayout}
                  className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Commissions */}
        <div className="bg-black/50 border border-white/10 rounded-none overflow-hidden mb-8">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Recent Commissions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Commission</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Source</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-white/60 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.recent_commissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-white/60">
                      No commissions yet. Share your referral link to start earning!
                    </td>
                  </tr>
                ) : (
                  data.recent_commissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 text-white font-mono text-sm">
                        {commission.order_id.substring(0, 16)}...
                      </td>
                      <td className="px-6 py-4 text-white/80 text-sm">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-400">
                        ${commission.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-white">
                        ${commission.profit_generated.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-white/80 capitalize text-sm">
                        {commission.source}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          commission.status === 'paid' ? 'bg-green-400/20 text-green-400' :
                          commission.status === 'approved' ? 'bg-blue-400/20 text-blue-400' :
                          'bg-yellow-400/20 text-yellow-400'
                        }`}>
                          {commission.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/king-midas-leaderboard"
            className="bg-black/50 border border-white/10 rounded-none p-6 hover:border-white/30 transition-colors group"
          >
            <Trophy className="w-8 h-8 text-white/60 mb-3 group-hover:text-white transition-colors" />
            <h3 className="text-lg font-bold text-white mb-2">
              View Leaderboard
            </h3>
            <p className="text-white/60 text-sm">
              See how you rank against other affiliates
            </p>
          </Link>

          <Link
            to="/affiliate-profile"
            className="bg-black/50 border border-white/10 rounded-none p-6 hover:border-white/30 transition-colors group"
          >
            <MousePointerClick className="w-8 h-8 text-white/60 mb-3 group-hover:text-white transition-colors" />
            <h3 className="text-lg font-bold text-white mb-2">
              My Profile
            </h3>
            <p className="text-white/60 text-sm">
              View and edit your affiliate profile
            </p>
          </Link>

          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <DollarSign className="w-8 h-8 text-white/60 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">
              Marketing Tools
            </h3>
            <p className="text-white/60 text-sm">
              Coming soon: Banners, email templates, and more
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


