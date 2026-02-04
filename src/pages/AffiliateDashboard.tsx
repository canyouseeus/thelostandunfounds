import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  CursorArrowRaysIcon,
  ShoppingCartIcon,
  TrophyIcon,
  ClipboardIcon,
  CheckIcon,
  StarIcon,
  CalendarIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ShareIcon,
  GiftIcon,
  TagIcon,
  PencilSquareIcon,
  XMarkIcon,
  DocumentCheckIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import AuthModal from '../components/auth/AuthModal'
import KingMidasTicker from '../components/KingMidasTicker'
import { LoadingOverlay } from '../components/Loading'
import EmployeeDiscount from '../components/affiliate/EmployeeDiscount'
import RewardPointsBadge from '../components/affiliate/RewardPointsBadge'
import ReferralLink from '../components/affiliate/ReferralLink'
import CustomerList from '../components/affiliate/CustomerList'
import ReferralTree from '../components/affiliate/ReferralTree'
import MLMEarningsTable from '../components/affiliate/MLMEarningsTable'
import AffiliateCodeSetup from '../components/affiliate/AffiliateCodeSetup'
import DeepLinkGenerator from '../components/affiliate/DeepLinkGenerator'
import AffiliateGuide from '../components/affiliate/AffiliateGuide'
import PayoutHistoryTable from '../components/affiliate/PayoutHistoryTable'
import { AdminBentoCard, AdminBentoRow } from '../components/ui/admin-bento-card'
import { ExpandableBentoCard } from '../components/ui/expandable-bento-card'
import { cn } from '../components/ui/utils'

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [initialAuthMode, setInitialAuthMode] = useState<'signin' | 'signup'>('signin');
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

  /* Tab State */
  const [activeTab, setActiveTab] = useState<'overview' | 'marketing' | 'payouts' | 'guide'>('overview')

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
    const referralLink = `${window.location.origin}/?ref=${affiliateCode}`
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
    if (rank === 1) return <TrophyIcon className="w-5 h-5 text-white" />
    if (rank === 2) return <TrophyIcon className="w-5 h-5 text-gray-300" />
    if (rank === 3) return <TrophyIcon className="w-5 h-5 text-white/60" />
    return null
  }

  // Show loading while checking auth
  if (authLoading || checkingAffiliate) {
    return <LoadingOverlay message="Checking affiliate status..." />;
  }

  // Show login prompt if not logged in
  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden -mt-20 md:-mt-32">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-[#0a0a0a]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[100px]" />

          <div className="relative w-full max-w-md">
            <div className="bg-[#0a0a0a] p-8 md:p-10">
              <div className="flex justify-center mb-8">
                <div className="p-4 bg-white/5 rounded-full ring-1 ring-white/10">
                  <ArrowRightOnRectangleIcon className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-medium tracking-wide text-white mb-3">
                  Affiliate Access
                </h1>
                <p className="text-white/40 text-sm leading-relaxed">
                  Join The Lost+Unfounds affiliate program and earn 42% commission on every sale you refer.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => {
                    setInitialAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                  className="w-full bg-white text-black hover:bg-white/90 h-12 text-sm uppercase tracking-widest font-medium transition-transform hover:scale-[1.02]"
                >
                  Sign In
                </Button>

                <Button
                  onClick={() => {
                    setInitialAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/5 h-12 text-sm uppercase tracking-widest font-medium transition-transform hover:scale-[1.02]"
                >
                  Create Account
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 text-center">
                <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
                  Secure Agent Access
                </p>
              </div>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={initialAuthMode}
          title={initialAuthMode === 'signin' ? 'Affiliate Login' : 'Join Program'}
          message={initialAuthMode === 'signup' ? 'Create an account to verify your affiliate status.' : undefined}
          onLoginSuccess={() => setShowAuthModal(false)}
        />
      </>
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
    return <LoadingOverlay message="Loading dashboard..." />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-white/10 border-0 text-white px-6 py-4 rounded-none max-w-md">
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

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-white/20 mb-8 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap",
              activeTab === 'overview'
                ? "text-white border-b-2 border-white bg-white/5"
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('marketing')}
            className={cn(
              "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap",
              activeTab === 'marketing'
                ? "text-white border-b-2 border-white bg-white/5"
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            Marketing Assets
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={cn(
              "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap",
              activeTab === 'payouts'
                ? "text-white border-b-2 border-white bg-white/5"
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            Payouts
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={cn(
              "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap",
              activeTab === 'guide'
                ? "text-white border-b-2 border-white bg-white/5"
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            Guide
          </button>
        </div>

        {/* TAB CONTENT: MARKETING */}
        {activeTab === 'marketing' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Affiliate Code Setup */}
            <div className="mb-8">
              <h3 className="text-white text-lg font-bold uppercase tracking-widest mb-4">Your Identity</h3>
              <div className="bg-black border border-white/20 p-6 rounded-none">
                <div className="text-[10px] items-center font-bold text-white/40 uppercase tracking-widest mb-2">Your Affiliate Code</div>
                <div className="text-3xl font-black text-white font-mono tracking-tighter mb-2">
                  {data.affiliate.code}
                </div>
                <div className="text-xs text-white/40 font-medium uppercase tracking-wider">
                  Share this code with your audience to earn {data.affiliate.commission_rate}% commission on every sale.
                </div>
              </div>
            </div>

            {/* Deep Link Generator */}
            <div>
              <h3 className="text-white text-lg font-bold uppercase tracking-widest mb-4">Link Generator</h3>
              <DeepLinkGenerator affiliateCode={data.affiliate.code} />
            </div>

            {/* Standard Referral Links */}
            <div>
              <h3 className="text-white text-lg font-bold uppercase tracking-widest mb-4">Standard Links</h3>
              <ReferralLink affiliateCode={data.affiliate.code} />
            </div>
          </div>
        )}

        {/* TAB CONTENT: PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminBentoCard title="Available to Payout" icon={<CurrencyDollarIcon className="w-4 h-4" />}>
                <div className="mt-2 text-center py-6">
                  <div className="text-5xl font-black text-green-400 tracking-tighter mb-2">
                    ${(data.balance?.available_balance || 0).toFixed(2)}
                  </div>
                  <button
                    onClick={() => setShowPayoutRequest(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition-all mt-4"
                  >
                    <CurrencyDollarIcon className="w-4 h-4" />
                    Request Payout
                  </button>
                </div>
              </AdminBentoCard>

              <AdminBentoCard title="Pending Balance" icon={<CalendarIcon className="w-4 h-4" />}>
                <div className="mt-2 text-center py-6 opacity-60">
                  <div className="text-4xl font-black text-white tracking-tighter mb-2">
                    ${(data.balance?.pending_balance || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold text-white uppercase tracking-widest">
                    Held for Security (30 Days)
                  </div>
                </div>
              </AdminBentoCard>
            </div>

            <h3 className="text-white text-lg font-bold uppercase tracking-widest mt-8 mb-4">Payout History</h3>
            <PayoutHistoryTable affiliateId={data.affiliate.id} />
          </div>
        )}

        {/* TAB CONTENT: GUIDE */}
        {activeTab === 'guide' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <AffiliateGuide />
          </div>
        )}

        {/* TAB CONTENT: OVERVIEW (Default) */}
        {activeTab === 'overview' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
              <AdminBentoCard
                title="Affiliate Identity"
                colSpan={4}
                icon={<TagIcon className="w-4 h-4" />}
                className="min-h-[200px]"
              >
                <div className="space-y-6">
                  <div>
                    <div className="text-[10px] items-center font-bold text-white/40 uppercase tracking-widest mb-2">Your Code</div>
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
                            className="text-2xl font-black text-white bg-black border-b border-white px-0 py-1 focus:outline-none focus:border-white/40 font-mono rounded-none w-full"
                            placeholder="CODE"
                            autoFocus
                          />
                          <button onClick={handleSaveCode} disabled={updatingCode} className="p-2 hover:bg-white/10 transition-colors">
                            {updatingCode ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <DocumentCheckIcon className="w-4 h-4" />}
                          </button>
                          <button onClick={handleCancelEdit} disabled={updatingCode} className="p-2 hover:bg-white/10 transition-colors">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                        {codeError && <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{codeError}</div>}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <div className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono tracking-tighter break-all whitespace-pre-wrap">
                          {data.affiliate.code}
                        </div>
                        <button onClick={handleEditCode} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 transition-all">
                          <PencilSquareIcon className="w-4 h-4 text-white/40 hover:text-white" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Commission</div>
                      <div className="text-xl font-bold text-white">{data.affiliate.commission_rate}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Status</div>
                      <div className={`text-xl font-bold uppercase ${data.affiliate.status === 'active' ? 'text-green-500' : 'text-white'}`}>
                        {data.affiliate.status}
                      </div>
                    </div>
                  </div>
                </div>
              </AdminBentoCard>

              <AdminBentoCard
                title="Quick Actions"
                colSpan={8}
                icon={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}
                className="min-h-[200px]"
              >
                <div className="flex flex-col md:flex-row gap-4 h-full items-center justify-center p-4">
                  <button
                    onClick={copyReferralLink}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-all hover:scale-105 active:scale-95 w-full md:w-auto"
                  >
                    {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
                    {copied ? 'COPIED TO CLIPBOARD' : 'COPY AFFILIATE LINK'}
                  </button>
                  <Link
                    to={`/?ref=${data.affiliate.code}`}
                    target="_blank"
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-transparent border border-white/20 text-white font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all hover:border-white w-full md:w-auto"
                  >
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                    PREVIEW SHOP
                  </Link>
                </div>
              </AdminBentoCard>
            </div>


            {/* Key Metrics Grid - Converted to Bento Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <AdminBentoCard title="Available Balance" icon={<CurrencyDollarIcon className="w-4 h-4" />}>
                <div className="mt-2">
                  <div className="text-4xl font-black text-white tracking-tighter">
                    ${(data.balance?.available_balance || 0).toFixed(2)}
                  </div>

                  <div className="flex flex-col gap-1 mt-2">
                    {(data.balance?.pending_balance || 0) > 0 && (
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        +${(data.balance?.pending_balance || 0).toFixed(2)} PENDING (30-DAY HOLD)
                      </div>
                    )}
                    <div className="text-[8px] text-white/30 uppercase tracking-widest mt-1">
                      * Funds held 30 days for security. No returns on digital items.
                    </div>
                  </div>
                </div>
              </AdminBentoCard>

              <AdminBentoCard title="Total Clicks" icon={<CursorArrowRaysIcon className="w-4 h-4" />}>
                <div className="mt-2">
                  <div className="text-4xl font-black text-white tracking-tighter">
                    {data.affiliate.total_clicks.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
                    {data.overview.conversion_rate.toFixed(1)}% CONVERSION RATE
                  </div>
                </div>
              </AdminBentoCard>

              <AdminBentoCard title="Conversions" icon={<ShoppingCartIcon className="w-4 h-4" />}>
                <div className="mt-2">
                  <div className="text-4xl font-black text-white tracking-tighter">
                    {data.affiliate.total_conversions}
                  </div>
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
                    ${data.overview.average_commission.toFixed(2)} AVG COMM
                  </div>
                </div>
              </AdminBentoCard>

              <AdminBentoCard title="Current Rank" icon={<TrophyIcon className="w-4 h-4" />}>
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    {getRankBadge(data.overview.current_rank)}
                    <div className="text-4xl font-black text-white tracking-tighter">
                      {data.overview.current_rank ? `#${data.overview.current_rank}` : 'N/A'}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
                    {data.overview.top_3_finishes} TOP 3 FINISHES
                  </div>
                </div>
              </AdminBentoCard>
            </div>

            {/* MLM Quick Stats Row */}
            {
              data.mlm && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <AdminBentoCard title="Rewards" icon={<StarIcon className="w-4 h-4" />}>
                    <div className="text-center py-2">
                      <p className="text-4xl font-black text-white tracking-tighter">{data.affiliate.reward_points}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">POINTS AVAILABLE</p>
                    </div>
                  </AdminBentoCard>

                  <AdminBentoCard title="Customers" icon={<UsersIcon className="w-4 h-4" />}>
                    <div className="text-center py-2">
                      <p className="text-4xl font-black text-white tracking-tighter">{data.mlm.network.total_customers}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">ACTIVE CUSTOMERS</p>
                    </div>
                  </AdminBentoCard>

                  <AdminBentoCard title="Network" icon={<ShareIcon className="w-4 h-4" />}>
                    <div className="text-center py-2">
                      <p className="text-4xl font-black text-white tracking-tighter">{data.mlm.network.total_network}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">TOTAL DOWNLINE</p>
                    </div>
                  </AdminBentoCard>

                  <AdminBentoCard title="Credits" icon={<GiftIcon className="w-4 h-4" />}>
                    <div className="text-center py-2">
                      <p className="text-4xl font-black text-white tracking-tighter">
                        ${data.affiliate.discount_credit_balance?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">STORE CREDIT</p>
                    </div>
                  </AdminBentoCard>
                </div>
              )
            }

            {/* Employee Discount */}
            {
              data.mlm && (
                <div className="mb-8">
                  <EmployeeDiscount
                    affiliateId={data.affiliate.id}
                    affiliateCode={data.affiliate.code}
                    creditBalance={data.affiliate.discount_credit_balance}
                  />
                </div>
              )
            }

            {/* Reward Points */}
            {
              data.mlm && (
                <div className="mb-8">
                  <RewardPointsBadge
                    affiliateId={data.affiliate.id}
                    initialPoints={data.affiliate.reward_points}
                  />
                </div>
              )
            }

            {/* MLM Referrals & Earnings */}
            {
              data.mlm && (
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
              )
            }

            {/* Performance Cards - Expandable */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Last 30 Days Performance */}
              <ExpandableBentoCard
                title="Last 30 Days"
                icon={<CalendarIcon className="w-4 h-4" />}
                details={
                  <>
                    <AdminBentoRow
                      label="Total Orders"
                      value={data.overview.total_commissions}
                    />
                    <AdminBentoRow
                      label="7-Day Trend"
                      value={
                        <span className={`flex items-center gap-1 ${data.overview.profit_trend_7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          <ArrowTrendingUpIcon className={`w-3 h-3 ${data.overview.profit_trend_7d < 0 ? 'rotate-180' : ''}`} />
                          {Math.abs(data.overview.profit_trend_7d).toFixed(1)}%
                        </span>
                      }
                    />
                    {data.overview.best_day && (
                      <AdminBentoRow
                        label="Best Day"
                        value={
                          <div className="flex justify-between w-full">
                            <span>{new Date(data.overview.best_day.date).toLocaleDateString()}</span>
                            <span className="text-white/60">${data.overview.best_day.profit.toFixed(2)}</span>
                          </div>
                        }
                      />
                    )}
                  </>
                }
              >
                <div className="space-y-4 pt-2">
                  <AdminBentoRow
                    label="Commission Earned"
                    value={`$${data.overview.total_commission_amount.toFixed(2)}`}
                  />
                  <AdminBentoRow
                    label="Profit Generated"
                    value={`$${data.overview.total_profit_generated.toFixed(2)}`}
                  />
                </div>
              </ExpandableBentoCard>
            </div>

            {/* King Midas Performance - Expandable */}
            <div className="grid grid-cols-1 mb-8">
              <ExpandableBentoCard
                title="King Midas Performance"
                icon={<TrophyIcon className="w-4 h-4" />}
                details={
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Top 3</div>
                      <div className="text-xl font-black text-white tracking-tighter">{data.overview.top_3_finishes}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Paid Out</div>
                      <div className="text-xl font-black text-white tracking-tighter">{data.overview.paid_payouts}</div>
                    </div>
                  </div>
                }
                footer={
                  <div className="text-center">
                    <Link
                      to="/king-midas-leaderboard"
                      className="inline-block px-6 py-2 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition-colors"
                    >
                      View Full Leaderboard →
                    </Link>
                  </div>
                }
              >
                <div className="p-2 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Earned</div>
                      <div className="text-xl font-black text-white tracking-tighter">${data.overview.total_king_midas_earnings.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">1st Place</div>
                      <div className="text-xl font-black text-white tracking-tighter">{data.overview.first_place_finishes}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Current Pool</div>
                      <div className="text-xl font-black text-white tracking-tighter">${(data.overview.current_rank && data.overview.current_rank <= 3) ? (data.king_midas?.recent_stats?.[0]?.pool_share || 0).toFixed(2) : '0.00'}</div>
                    </div>
                  </div>
                </div>
              </ExpandableBentoCard>
            </div>

            {/* Payout Settings */}
            <div className="bg-black border-0 rounded-none p-6 mb-8">
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

              {
                payoutSuccess && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6">
                    Payout settings updated successfully!
                  </div>
                )
              }

              {
                payoutError && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6">
                    {payoutError}
                  </div>
                )
              }

              {
                editingPayout ? (
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
                      <div className="mt-4 bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider">
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

                )
              }
            </div>

            {/* Payout Request Modal */}
            {
              showPayoutRequest && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-black border-0 rounded-none p-8 max-w-md w-full">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Instant Payout</h3>

                    {payoutRequestError && (
                      <div className="bg-white/10 border border-white/20 text-white px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6">
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
              )
            }

            {/* Recent Commissions */}
            <div className="bg-black border-0 rounded-none overflow-hidden mb-8">
              <div className="p-6">
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
                              <span className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-widest ${commission.status === 'paid' ? 'border-green-500 text-green-500' :
                                commission.status === 'cancelled' ? 'border-red-500 text-red-500' :
                                  commission.status_label?.includes('Available') ? 'border-green-500 text-green-500' :
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
          </div>
        )}
        {/* End Overview Tab Content */}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/king-midas-leaderboard"
            className="bg-black border-0 rounded-none p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <TrophyIcon className="w-8 h-8 text-white mb-4 group-hover:text-black transition-colors" />
            <h3 className="text-sm font-bold uppercase tracking-widest mb-2">
              View Leaderboard
            </h3>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider group-hover:text-black/60">
              See how you rank against other affiliates
            </p>
          </Link>

          <Link
            to="/affiliate-profile"
            className="bg-black border-0 rounded-none p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <CursorArrowRaysIcon className="w-8 h-8 text-white mb-4 group-hover:text-black transition-colors" />
            <h3 className="text-sm font-bold uppercase tracking-widest mb-2">
              My Profile
            </h3>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider group-hover:text-black/60">
              View and edit your affiliate profile
            </p>
          </Link>

          <div className="bg-black border-0 rounded-none p-6 opacity-50 cursor-not-allowed">
            <CurrencyDollarIcon className="w-8 h-8 text-white mb-4" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">
              Marketing Tools
            </h3>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
              Coming soon: Banners, email templates
            </p>
          </div>
        </div>
      </div>
    </div >
  )
}


