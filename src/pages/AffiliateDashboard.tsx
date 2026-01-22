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
  Users,
  LogIn
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import KingMidasTicker from '../components/KingMidasTicker'
import EmployeeDiscount from '../components/affiliate/EmployeeDiscount'
import RewardPointsBadge from '../components/affiliate/RewardPointsBadge'
import ReferralLink from '../components/affiliate/ReferralLink'
import CustomerList from '../components/affiliate/CustomerList'
import ReferralTree from '../components/affiliate/ReferralTree'
import MLMEarningsTable from '../components/affiliate/MLMEarningsTable'
import AffiliateCodeSetup from '../components/affiliate/AffiliateCodeSetup'

interface DashboardData {
  affiliate: {
    id: string
    code: string
    status: string
    commission_rate: number
    total_earnings: number
    available_balance: number
    pending_balance: number
    total_paid: number
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
    cancelled_commissions: number
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
  balance: {
    available_balance: number
    pending_balance: number
    total_paid: number
    total_cancelled: number
    total_lifetime: number
    upcoming_availability: Array<{ date: string; amount: number }>
    recent_cancellations: Array<{
      amount: number
      reason: string
      cancelled_at: string
      order_id: string
    }>
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
    status_label: string
    created_at: string
    available_date?: string
    cancelled_reason?: string
    cancelled_at?: string
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
  const { user, loading: authLoading } = useAuth()
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

  // Affiliate state
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null)
  const [isAffiliate, setIsAffiliate] = useState<boolean | null>(null)
  const [checkingAffiliate, setCheckingAffiliate] = useState(true)

  // Check if user has an affiliate account
  useEffect(() => {
    async function checkAffiliateStatus() {
      if (authLoading) return

      if (!user) {
        setCheckingAffiliate(false)
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/affiliates/get-by-user?user_id=${user.id}`)
        const result = await response.json()

        if (result.isAffiliate && result.affiliate) {
          setAffiliateCode(result.affiliate.code)
          setIsAffiliate(true)
        } else {
          setIsAffiliate(false)
        }
      } catch (err) {
        console.error('Error checking affiliate status:', err)
        setError('Failed to check affiliate status')
      } finally {
        setCheckingAffiliate(false)
      }
    }

    checkAffiliateStatus()
  }, [user, authLoading])

  // Load dashboard when we have an affiliate code
  useEffect(() => {
    if (affiliateCode && isAffiliate) {
      loadDashboard()
      loadPayoutSettings()
    } else if (isAffiliate === false) {
      setLoading(false)
    }
  }, [affiliateCode, isAffiliate])

  const loadDashboard = async () => {
    if (!affiliateCode) return

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
            reward_points: mlmResult.affiliate?.reward_points || 0,
            discount_credit_balance: mlmResult.affiliate?.discount_credit_balance || 0,
            total_mlm_earnings: mlmResult.affiliate?.total_mlm_earnings || 0
          },
          balance: result.balance || {
            available_balance: result.affiliate.available_balance || 0,
            pending_balance: result.affiliate.pending_balance || 0,
            total_paid: result.affiliate.total_paid || 0,
            total_cancelled: 0,
            total_lifetime: result.affiliate.total_earnings || 0,
            upcoming_availability: [],
            recent_cancellations: []
          },
          mlm: {
            network: mlmResult.network || { total_customers: 0, level1_affiliates: 0, level2_affiliates: 0, total_network: 0 },
            earnings: mlmResult.earnings || { mlm_level1: 0, mlm_level2: 0, total_mlm: 0 },
            discount_code: mlmResult.discount_code || null
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

  // Handler for when user creates an affiliate account
  const handleAffiliateCreated = (code: string) => {
    setAffiliateCode(code)
    setIsAffiliate(true)
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
    // Use available_balance (commissions past holding period)
    const availableBalance = data.balance?.available_balance || 0
    const hasEnoughEarnings = availableBalance >= payoutSettings.payment_threshold
    const hasAvailableCommissions = availableBalance > 0
    return hasPayPalEmail && hasEnoughEarnings && hasAvailableCommissions
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
    if (!affiliateCode) return
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

  // Show loading while checking auth
  if (authLoading || checkingAffiliate) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  // Show login prompt if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black/50 border border-white/10 rounded-none p-8 text-center">
          <LogIn className="w-16 h-16 text-white/60 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">
            Sign in to Access Your Affiliate Dashboard
          </h1>
          <p className="text-white/60 mb-6">
            Join our affiliate program and earn 42% commission on every sale you refer!
          </p>
          <div className="space-y-3">
            <Link
              to="/login"
              className="block w-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="block w-full px-6 py-3 bg-black border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show affiliate setup form if user is not yet an affiliate
  if (isAffiliate === false) {
    return (
      <div className="min-h-screen bg-black">
        <KingMidasTicker />
        <AffiliateCodeSetup onSuccess={handleAffiliateCreated} />
      </div>
    )
  }

  // Show loading while fetching dashboard data
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
        <div className="mb-12 border-b border-white/20 pb-6">
          <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Affiliate Dashboard</h1>
          <p className="text-white/60 font-medium uppercase tracking-widest text-xs">Performance Overview & Management</p>
        </div>

        {/* Affiliate Info Card */}
        <div className="bg-black border border-white/20 rounded-none p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Your Affiliate Code</div>
              {editingCode ? (
                <div className="space-y-4">
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
                      className="text-3xl font-black text-white bg-black border-b border-white px-0 py-2 focus:outline-none focus:border-white/40 font-mono rounded-none w-full max-w-[300px]"
                      placeholder="ENTER CODE"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={handleSaveCode}
                        disabled={updatingCode}
                        className="p-2 bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50"
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
                        className="p-2 bg-black border border-white/20 text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Cancel"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {codeError && (
                    <div className="text-sm text-red-500 font-bold uppercase tracking-wider">{codeError}</div>
                  )}
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">
                    Code must be 4-12 uppercase letters/numbers only
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-white font-mono tracking-tighter">{data.affiliate.code}</div>
                  <button
                    onClick={handleEditCode}
                    className="p-2 hover:bg-white/10 transition-colors group"
                    title="Edit affiliate code"
                  >
                    <Edit className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                  </button>
                </div>
              )}
              <div className="text-xs font-bold text-white/40 uppercase tracking-wider mt-4 flex items-center gap-4">
                <span>Commission Rate: <span className="text-white">{data.affiliate.commission_rate}%</span></span>
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                <span>Status: <span className="text-green-500">{data.affiliate.status}</span></span>
              </div>
            </div>
            <div className="flex flex-col gap-3 min-w-[200px]">
              <button
                onClick={copyReferralLink}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-white/90 transition-colors w-full"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'COPIED!' : 'COPY LINK'}
              </button>
              <Link
                to={`/shop?ref=${data.affiliate.code}`}
                target="_blank"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-black border border-white/20 text-white font-bold uppercase tracking-wider text-xs hover:bg-white/10 transition-colors w-full text-center"
              >
                <ExternalLink className="w-4 h-4" />
                PREVIEW SHOP
              </Link>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Available Balance */}
          <div className="bg-black border border-white/20 rounded-none p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Available Now</span>
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div className="text-4xl font-black text-white mb-2 tracking-tighter">
              ${(data.balance?.available_balance || 0).toFixed(2)}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider">
              {(data.balance?.pending_balance || 0) > 0 && (
                <span className="text-white/60">+${(data.balance?.pending_balance || 0).toFixed(2)} PENDING</span>
              )}
            </div>
          </div>

          {/* Total Clicks */}
          <div className="bg-black border border-white/20 rounded-none p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Clicks</span>
              <MousePointerClick className="w-4 h-4 text-white" />
            </div>
            <div className="text-4xl font-black text-white mb-2 tracking-tighter">
              {data.affiliate.total_clicks.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              {data.overview.conversion_rate.toFixed(1)}% CONVERSION RATE
            </div>
          </div>

          {/* Total Conversions */}
          <div className="bg-black border border-white/20 rounded-none p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Conversions</span>
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div className="text-4xl font-black text-white mb-2 tracking-tighter">
              {data.affiliate.total_conversions}
            </div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              ${data.overview.average_commission.toFixed(2)} AVG COMMISSION
            </div>
          </div>

          {/* King Midas Rank */}
          <div className="bg-black border border-white/20 rounded-none p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Current Rank</span>
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              {getRankBadge(data.overview.current_rank)}
              <div className="text-4xl font-black text-white tracking-tighter">
                {data.overview.current_rank ? `#${data.overview.current_rank}` : 'N/A'}
              </div>
            </div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              {data.overview.top_3_finishes} TOP 3 FINISHES
            </div>
          </div>
        </div>

        {/* MLM Quick Stats Row */}
        {data.mlm && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-black border border-white/20 rounded-none p-6 text-center group hover:border-white transition-colors">
              <Star className="text-white mx-auto mb-4" size={24} />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Reward Points</p>
              <p className="text-3xl font-black text-white tracking-tighter">{data.affiliate.reward_points}</p>
            </div>

            <div className="bg-black border border-white/20 rounded-none p-6 text-center group hover:border-white transition-colors">
              <Users className="text-white mx-auto mb-4" size={24} />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Customers</p>
              <p className="text-3xl font-black text-white tracking-tighter">{data.mlm.network.total_customers}</p>
            </div>

            <div className="bg-black border border-white/20 rounded-none p-6 text-center group hover:border-white transition-colors">
              <Network className="text-white mx-auto mb-4" size={24} />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Network Size</p>
              <p className="text-3xl font-black text-white tracking-tighter">{data.mlm.network.total_network}</p>
            </div>

            <div className="bg-black border border-white/20 rounded-none p-6 text-center group hover:border-white transition-colors">
              <Gift className="text-white mx-auto mb-4" size={24} />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Credit Balance</p>
              <p className="text-3xl font-black text-white tracking-tighter">
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
          <div className="bg-black border border-white/20 rounded-none overflow-hidden">
            <div className="p-6 border-b border-white/20">
              <h2 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-widest">
                <Calendar className="w-5 h-5 text-white" />
                Last 30 Days
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Commission Earned</span>
                <span className="text-2xl font-black text-white tracking-tighter">
                  ${data.overview.total_commission_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Profit Generated</span>
                <span className="text-2xl font-black text-white tracking-tighter">
                  ${data.overview.total_profit_generated.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Orders</span>
                <span className="text-2xl font-black text-white tracking-tighter">
                  {data.overview.total_commissions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">7-Day Trend</span>
                <span className={`text-2xl font-black flex items-center gap-1 tracking-tighter ${data.overview.profit_trend_7d >= 0 ? 'text-white' : 'text-white/60'
                  }`}>
                  <TrendingUp className={`w-4 h-4 ${data.overview.profit_trend_7d < 0 ? 'rotate-180' : ''
                    }`} />
                  {Math.abs(data.overview.profit_trend_7d).toFixed(1)}%
                </span>
              </div>
              {data.overview.best_day && (
                <div className="pt-6 border-t border-white/20">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Best Day</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">{new Date(data.overview.best_day.date).toLocaleDateString()}</span>
                    <span className="text-xl font-black text-white tracking-tighter">${data.overview.best_day.profit.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* King Midas Performance */}
          <div className="bg-black border border-white/20 rounded-none overflow-hidden">
            <div className="p-6 border-b border-white/20">
              <h2 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-widest">
                <Award className="w-5 h-5 text-white" />
                KING MIDAS Performance
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Earned</span>
                <span className="text-2xl font-black text-white tracking-tighter">
                  ${data.overview.total_king_midas_earnings.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">First Place Finishes</span>
                <span className="text-2xl font-black text-white tracking-tighter">
                  {data.overview.first_place_finishes}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Top 3 Finishes</span>
                <span className="text-2xl font-black text-white tracking-tighter">
                  {data.overview.top_3_finishes}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pending Payouts</span>
                <span className="text-2xl font-black text-white tracking-tighter">
                  {data.overview.pending_payouts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Paid Payouts</span>
                <span className="text-2xl font-black text-white tracking-tighter">
                  {data.overview.paid_payouts}
                </span>
              </div>
              <div className="pt-6 border-t border-white/20">
                <Link
                  to="/king-midas-leaderboard"
                  className="block text-center px-4 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-white/90 transition-colors text-xs"
                >
                  View Full Leaderboard →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Settings */}
        <div className="bg-black border border-white/20 rounded-none p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-white uppercase tracking-widest">Payout Settings</h3>
            {!editingPayout && (
              <button
                onClick={() => setEditingPayout(true)}
                className="text-[10px] font-bold text-white/60 hover:text-white uppercase tracking-widest transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {payoutSuccess && (
            <div className="bg-white/10 border border-white/20 text-white px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6">
              Payout settings updated successfully!
            </div>
          )}

          {payoutError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6">
              {payoutError}
            </div>
          )}

          {editingPayout ? (
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">PayPal Email</label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-white/20 rounded-none text-white focus:outline-none focus:border-white transition-colors font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Payment Threshold (minimum $10)
                </label>
                <input
                  type="number"
                  min="10"
                  step="0.01"
                  value={paymentThreshold}
                  onChange={(e) => setPaymentThreshold(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 bg-black border border-white/20 rounded-none text-white focus:outline-none focus:border-white transition-colors font-mono text-sm"
                />
                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mt-2">
                  You'll receive payouts when your earnings reach this amount
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleSavePayoutSettings}
                  className="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-colors"
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
                  className="px-6 py-2 bg-transparent border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-white/10 pb-4">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">PayPal Email</span>
                <span className="text-white font-mono">{payoutSettings?.paypal_email || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-white/10 pb-4">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Payment Threshold</span>
                <span className="text-white font-mono">${payoutSettings?.payment_threshold || 10}</span>
              </div>
              {payoutRequestSuccess && (
                <div className="mt-4 bg-white/10 border border-white/20 text-white px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider">
                  Payout request submitted successfully! We'll process it soon.
                </div>
              )}
              {payoutRequestError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider">
                  {payoutRequestError}
                </div>
              )}
              {payoutSettings && checkPayoutEligibility() && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-white font-bold uppercase tracking-wider">Available for Payout</p>
                      <p className="text-[10px] text-white/60 font-medium uppercase tracking-widest mt-1">
                        ${(data?.balance?.available_balance || 0).toFixed(2)} available now
                      </p>
                      {(data?.balance?.pending_balance || 0) > 0 && (
                        <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest mt-1">
                          +${(data?.balance?.pending_balance || 0).toFixed(2)} pending (holding period)
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPayoutAmount(data?.balance?.available_balance || 0)
                      setShowPayoutRequest(true)
                      setPayoutRequestError(null)
                    }}
                    className="w-full px-4 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-white/90 transition-colors text-xs"
                  >
                    Request Instant Payout
                  </button>
                </div>
              )}
              {payoutSettings && !checkPayoutEligibility() && data && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
                    {!payoutSettings.paypal_email || payoutSettings.paypal_email.trim() === ''
                      ? 'Set your PayPal email to request payouts'
                      : (data.balance?.available_balance || 0) < payoutSettings.payment_threshold
                        ? (data.balance?.available_balance || 0) > 0
                          ? `Need $${(payoutSettings.payment_threshold - (data.balance?.available_balance || 0)).toFixed(2)} more to reach threshold`
                          : (data.balance?.pending_balance || 0) > 0
                            ? `$${(data.balance?.pending_balance || 0).toFixed(2)} is in holding period`
                            : 'No earnings yet'
                        : 'No earnings available for payout'}
                  </p>
                </div>
              )}
              {!payoutSettings && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-4">
                    Set up your payout information to receive commissions
                  </p>
                  <button
                    onClick={() => setEditingPayout(true)}
                    className="px-6 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-white/90 transition-colors text-xs"
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
            <div className="bg-black border border-white rounded-none p-8 max-w-md w-full">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Instant Payout</h3>

              {payoutRequestError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6">
                  {payoutRequestError}
                </div>
              )}

              <div className="space-y-6">
                <div className="bg-white/5 border border-white/20 p-4 rounded-none">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Available Now</span>
                    <span className="text-white font-black font-mono text-lg">
                      ${(data?.balance?.available_balance || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {(data?.balance?.pending_balance || 0) > 0 && (
                  <div className="bg-white/5 border border-white/20 p-4 rounded-none">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pending</span>
                      <span className="text-white font-mono font-bold">
                        ${(data?.balance?.pending_balance || 0).toFixed(2)}
                      </span>
                    </div>
                    {data?.balance?.upcoming_availability && data.balance.upcoming_availability.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Upcoming:</p>
                        {data.balance.upcoming_availability.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[10px] text-white/60 uppercase tracking-wider mb-1">
                            <span>{new Date(item.date).toLocaleDateString()}</span>
                            <span className="font-mono">+${item.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                    Payout Amount
                  </label>
                  <input
                    type="number"
                    min={payoutSettings?.payment_threshold || 10}
                    max={data?.balance?.available_balance || 0}
                    step="0.01"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-black border border-white/20 rounded-none text-white focus:outline-none focus:border-white transition-colors font-mono text-sm"
                  />
                  <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mt-2">
                    Min: ${payoutSettings?.payment_threshold || 10} • Max: ${(data?.balance?.available_balance || 0).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                    PayPal Email
                  </label>
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-none text-white font-mono text-sm">
                    {payoutSettings?.paypal_email || 'Not set'}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-none text-[10px] text-white/60 font-medium uppercase tracking-wider leading-relaxed">
                  <p className="mb-2"><strong>Instant payout:</strong> Funds are sent immediately to your PayPal account.</p>
                  <p>Physical products: 30-day hold • Digital products: 7-day hold</p>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleRequestPayout}
                  disabled={requestingPayout || payoutAmount < (payoutSettings?.payment_threshold || 10) || payoutAmount > (data?.balance?.available_balance || 0)}
                  className="flex-1 px-4 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {requestingPayout ? 'Processing...' : `Send $${payoutAmount.toFixed(2)} to PayPal`}
                </button>
                <button
                  onClick={() => {
                    setShowPayoutRequest(false)
                    setPayoutRequestError(null)
                    setPayoutAmount(0)
                  }}
                  disabled={requestingPayout}
                  className="px-6 py-3 bg-transparent border border-white/20 text-white font-bold uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Commissions */}
        <div className="bg-black border border-white/20 rounded-none overflow-hidden mb-8">
          <div className="p-6 border-b border-white/20">
            <h2 className="text-lg font-black text-white uppercase tracking-widest">Recent Commissions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black border-b border-white/20">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-white/40 uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-white/40 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-white/40 uppercase tracking-widest">Commission</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-white/40 uppercase tracking-widest">Profit</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-white/40 uppercase tracking-widest">Source</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold text-white/40 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.recent_commissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-white/40 text-xs font-medium uppercase tracking-widest">
                      No commissions yet. Share your referral link to start earning!
                    </td>
                  </tr>
                ) : (
                  data.recent_commissions.map((commission) => (
                    <tr key={commission.id} className={`hover:bg-white/5 transition-colors ${commission.status === 'cancelled' ? 'opacity-40' : ''}`}>
                      <td className="px-6 py-4 text-white font-mono text-xs">
                        {commission.order_id.substring(0, 16)}...
                      </td>
                      <td className="px-6 py-4 text-white/60 text-xs font-mono">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </td>
                      <td className={`px-6 py-4 text-right font-black text-xs font-mono tracking-tight ${commission.status === 'cancelled' ? 'text-red-500 line-through' : 'text-white'}`}>
                        ${commission.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-white font-mono text-xs font-bold">
                        ${commission.profit_generated.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-white/60 capitalize text-xs font-medium uppercase tracking-wider">
                        {commission.source}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-widest ${commission.status === 'paid' ? 'border-white text-white' :
                            commission.status === 'cancelled' ? 'border-red-500 text-red-500' :
                              commission.status_label?.includes('Available') ? 'border-white text-white' :
                                commission.status_label?.includes('Pending') ? 'border-white/40 text-white/60' :
                                  'border-white/40 text-white/60'
                            }`}>
                            {commission.status_label || commission.status}
                          </span>
                        </div>
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
            className="bg-black border border-white/20 rounded-none p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <Trophy className="w-8 h-8 text-white mb-4 group-hover:text-black transition-colors" />
            <h3 className="text-sm font-bold uppercase tracking-widest mb-2">
              View Leaderboard
            </h3>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider group-hover:text-black/60">
              See how you rank against other affiliates
            </p>
          </Link>

          <Link
            to="/affiliate-profile"
            className="bg-black border border-white/20 rounded-none p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <MousePointerClick className="w-8 h-8 text-white mb-4 group-hover:text-black transition-colors" />
            <h3 className="text-sm font-bold uppercase tracking-widest mb-2">
              My Profile
            </h3>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider group-hover:text-black/60">
              View and edit your affiliate profile
            </p>
          </Link>

          <div className="bg-black border border-white/20 rounded-none p-6 opacity-50 cursor-not-allowed">
            <DollarSign className="w-8 h-8 text-white mb-4" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">
              Marketing Tools
            </h3>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
              Coming soon: Banners, email templates
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


