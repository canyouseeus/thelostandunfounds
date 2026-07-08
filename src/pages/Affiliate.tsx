/**
 * Affiliate Page - User Profile + Affiliate Dashboard (merged)
 * View and manage account information across all apps,
 * with the full affiliate dashboard inlined for the affiliate section.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  BookOpenIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardIcon,
  CheckIcon,
  QuestionMarkCircleIcon,
  ArrowTrendingUpIcon,
  CameraIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  ClockIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  WalletIcon,
  CreditCardIcon,
  ShareIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TrashIcon,
  CalendarIcon,
  CursorArrowRaysIcon,
  ShoppingCartIcon,
  TrophyIcon,
  StarIcon,
  GiftIcon,
  TagIcon,
  XMarkIcon,
  DocumentCheckIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../components/ui/utils';
import AdminGalleryView from '../components/admin/AdminGalleryView';
import { AffiliateRevenueTracker } from '../components/affiliate/AffiliateRevenueTracker';
import { LoadingSpinner, LoadingOverlay, SkeletonCard } from '../components/Loading';
import { SubscriptionTier } from '../types/index';
import { isAdmin } from '../utils/admin';
import { supabase } from '../lib/supabase';
import { AdminBentoCard, AdminBentoRow } from '../components/ui/admin-bento-card';
import { ClockWidget } from '../components/ui/clock-widget';
import { CalendarWidget } from '../components/ui/calendar-widget';
import { RevenueTracker } from '../components/ui/revenue-tracker';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import SEOHead from '../components/SEOHead';
import EmployeeDiscount from '../components/affiliate/EmployeeDiscount';
import RewardPointsBadge from '../components/affiliate/RewardPointsBadge';
import ReferralLink from '../components/affiliate/ReferralLink';
import CustomerList from '../components/affiliate/CustomerList';
import ReferralTree from '../components/affiliate/ReferralTree';
import MLMEarningsTable from '../components/affiliate/MLMEarningsTable';
import DeepLinkGenerator from '../components/affiliate/DeepLinkGenerator';
import AffiliateGuide from '../components/affiliate/AffiliateGuide';
import PayoutHistoryTable from '../components/affiliate/PayoutHistoryTable';
import LeaderboardView from '../components/affiliate/LeaderboardView';
import { ExpandableBentoCard } from '../components/ui/expandable-bento-card';
import { ExpandableScreen, ExpandableScreenContent } from '../components/ui/expandable-screen';
import AuthModal from '../components/auth/AuthModal';
import AffiliateSignupWizard from '../components/affiliate/AffiliateSignupWizard';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  subdomain: string | null;
  excerpt: string | null;
}

interface UserGallery {
  id: string;
  name: string;
  slug: string;
  photo_count?: number;
  google_drive_folder_id?: string;
}

interface AffiliateData {
  id: string;
  code: string;
  status: string;
  total_earnings: number;
  total_clicks: number;
  total_conversions: number;
  commission_rate: number;
  network_size?: number;
}

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

export default function Affiliate() {
  const { user, tier, signOut, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Core state
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [revenueView, setRevenueView] = useState<'admin' | 'affiliate'>('admin');
  // Pre-open a section if ?section= is in the URL (e.g. /dashboard?section=affiliate)
  const initialSection = searchParams.get('section') || '';
  const [activeApp, setActiveApp] = useState<string | null>(initialSection || null);

  const [loading, setLoading] = useState(false);

  // App-specific data
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [userPosts, setUserPosts] = useState<BlogPost[]>([]);
  const [userGalleries, setUserGalleries] = useState<UserGallery[]>([]);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [galleryRevenueTotal, setGalleryRevenueTotal] = useState(0);
  const [history, setHistory] = useState<{
    revenue: (string | { date: string; amount: number })[];
    newsletter: string[];
    affiliates: string[];
  }>({
    revenue: [],
    newsletter: [],
    affiliates: []
  });

  // Loading states
  const [loadingGalleries, setLoadingGalleries] = useState(false);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [syncingGallery, setSyncingGallery] = useState<string | null>(null);

  // UI state
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // ---- Affiliate Dashboard (inlined) state ----
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payoutSettings, setPayoutSettings] = useState<{
    payment_threshold: number;
  } | null>(null);
  const [editingPayout, setEditingPayout] = useState(false);
  const [paymentThreshold, setPaymentThreshold] = useState(10);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    onboarded: boolean;
    status: 'pending' | 'restricted' | 'active' | 'rejected';
    stripe_account_id: string | null;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    details_submitted?: boolean;
    requirements?: string[];
  } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeRedirecting, setStripeRedirecting] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [showPayoutRequest, setShowPayoutRequest] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutRequestError, setPayoutRequestError] = useState<string | null>(null);
  const [payoutRequestSuccess, setPayoutRequestSuccess] = useState(false);
  const [payoutConfirmed, setPayoutConfirmed] = useState<{ amount: number } | null>(null);
  const [editingCode, setEditingCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [updatingCode, setUpdatingCode] = useState(false);
  const [affiliateTab, setAffiliateTab] = useState<'overview' | 'marketing' | 'payouts' | 'leaderboard' | 'guide'>('overview');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Affiliate signup wizard state (triggered by ?join=affiliate in URL)
  const [showAffiliateWizard, setShowAffiliateWizard] = useState(false);

  // Load all profile data on mount
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  // Auto-open a panel based on URL query params (?section=... is already handled
  // by the activeApp initial state; ?stripe=... fires after a Stripe Connect redirect).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('stripe')) {
      setActiveApp('affiliate');
    }
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const admin = await isAdmin();
        setUserIsAdmin(admin);
      }
    };
    checkAdminStatus();
  }, [user]);

  // Show affiliate signup wizard when ?join=affiliate is in URL and user has no affiliate account
  useEffect(() => {
    if (!authLoading && user && !loadingAffiliate) {
      const join = searchParams.get('join');
      if (join === 'affiliate' && !affiliateData) {
        setShowAffiliateWizard(true);
        navigate('/dashboard', { replace: true });
      }
    }
  }, [loadingAffiliate, authLoading, user]);

  // Lazy-load affiliate dashboard when section opens
  useEffect(() => {
    if (activeApp === 'affiliate' && affiliateData?.code && !dashData && !dashLoading) {
      loadDashboard(affiliateData.code);
      loadPayoutSettings();
      loadStripeStatus();
    }
  }, [activeApp, affiliateData?.code]);

  const loadAllData = async () => {
    if (!user) return;

    const [subdomain, galleries, posts, affiliate] = await Promise.all([
      loadUserSubdomain(),
      loadUserGalleries(),
      loadUserPosts(),
      checkAffiliateStatus(),
    ]);

    await loadUserHistory(affiliate?.id);
  };

  const loadUserSubdomain = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_subdomains')
        .select('subdomain, blog_title, blog_title_display')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setUserSubdomain(data.subdomain || null);
        setBlogTitle(data.blog_title_display || data.blog_title || '');
      }
    } catch (err) {
      console.warn('Error loading subdomain:', err);
    }
  };

  const loadUserGalleries = async () => {
    if (!user?.id) return;

    setLoadingGalleries(true);
    try {
      const { data: galleries, error } = await supabase
        .from('photo_libraries')
        .select('id, name, slug, google_drive_folder_id')
        .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading galleries:', error);
        return;
      }

      if (galleries && galleries.length > 0) {
        const galleriesWithCounts = await Promise.all(
          galleries.map(async (gallery) => {
            const { count } = await supabase
              .from('photos')
              .select('*', { count: 'exact', head: true })
              .eq('library_id', gallery.id);
            return { ...gallery, photo_count: count || 0 };
          })
        );
        setUserGalleries(galleriesWithCounts);
      } else {
        setUserGalleries([]);
      }
    } catch (err) {
      console.error('Error loading galleries:', err);
    } finally {
      setLoadingGalleries(false);
    }
  };

  const checkAffiliateStatus = async () => {
    if (!user?.id) return null;

    setLoadingAffiliate(true);
    try {
      const { data: affiliate, error } = await supabase
        .from('affiliates')
        .select('id, code, status, total_earnings, total_clicks, total_conversions, commission_rate')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking affiliate status:', error);
      } else if (affiliate) {
        let networkSize = 0;
        try {
          const mlmRes = await fetch(`/api/affiliates/mlm-dashboard?affiliate_id=${affiliate.id}`);
          if (mlmRes.ok) {
            const mlmJson = await mlmRes.json();
            networkSize = mlmJson.network?.total_network || 0;
          }
        } catch (mlmErr) {
          console.warn('Failed to fetch MLM network data:', mlmErr);
        }

        const enrichedAffiliate = { ...affiliate, network_size: networkSize };
        setAffiliateData(enrichedAffiliate);
        return enrichedAffiliate;
      }
    } catch (err) {
      console.error('Error checking affiliate status:', err);
    } finally {
      setLoadingAffiliate(false);
    }
    return null;
  };

  const loadUserHistory = async (affiliateId?: string) => {
    if (!user?.id) return;

    setLoadingHistory(true);
    try {
      let commissionsData: any[] = [];
      if (affiliateId) {
        const { data: commissions } = await supabase
          .from('affiliate_commissions')
          .select('created_at, amount')
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: true });
        commissionsData = commissions || [];
      }

      const { data: purchases } = await supabase
        .from('photo_orders')
        .select('created_at, total_amount_cents')
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: true });

      const { data: sales, error: salesError } = await supabase
        .rpc('get_seller_orders', { p_user_id: user.id });

      if (salesError) {
        console.warn('Error fetching seller orders RPC:', salesError);
      }

      const salesData = sales || [];
      const galleryTotal = salesData.reduce((sum: any, o: any) => sum + (o.total_amount_cents || 0), 0) / 100;
      setGalleryRevenueTotal(galleryTotal);

      const revenueHistory: { date: string; amount: number }[] = [
        ...commissionsData.map(c => ({ date: c.created_at, amount: Number(c.amount) })),
        ...salesData.map((o: any) => ({ date: o.created_at, amount: (o.total_amount_cents || 0) / 100 }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const affiliateHistory = commissionsData.map(c => c.created_at);

      setHistory({
        revenue: revenueHistory,
        newsletter: [],
        affiliates: affiliateHistory
      });
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadUserPosts = async () => {
    if (!user) return;

    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, published, published_at, created_at, subdomain, excerpt')
        .or(`author_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!error) {
        setUserPosts(data || []);
      }
    } catch (err) {
      console.error('Error loading user posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleSyncGallery = async (galleryId: string) => {
    setSyncingGallery(galleryId);
    try {
      const response = await fetch('/api/gallery/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryId: galleryId })
      });

      if (!response.ok) throw new Error('Sync failed');

      success('Gallery synced successfully!');
      await loadUserGalleries();
    } catch (err: any) {
      showError(err.message || 'Failed to sync gallery');
    } finally {
      setSyncingGallery(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(label);
      success(`${label} copied!`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      showError('Failed to copy');
    }
  };

  // ---- Affiliate Dashboard functions ----

  const loadDashboard = async (code?: string) => {
    const affiliateCode = code || affiliateData?.code;
    if (!affiliateCode) return;

    try {
      setDashLoading(true);
      setDashError(null);

      const response = await fetch(`/api/affiliates/dashboard?affiliate_code=${affiliateCode}`);
      const result = await response.json();

      if (result.error) {
        setDashError(result.error);
        setDashData(null);
      } else {
        const mlmResponse = await fetch(`/api/affiliates/mlm-dashboard?affiliate_id=${result.affiliate.id}`);
        const mlmResult = await mlmResponse.json();

        setDashData({
          ...result,
          affiliate: {
            ...result.affiliate,
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
        });
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setDashError('Failed to load dashboard');
      setDashData(null);
    } finally {
      setDashLoading(false);
    }
  };

  const loadPayoutSettings = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/affiliates/payout-settings?userId=${user.id}`);
      const result = await response.json();

      if (result.settings) {
        setPayoutSettings(result.settings);
        setPaymentThreshold(result.settings.payment_threshold);
      }
    } catch (err) {
      console.error('Error loading payout settings:', err);
    }
  };

  const loadStripeStatus = async () => {
    if (!user?.id) return;
    setStripeLoading(true);
    setStripeError(null);
    try {
      const response = await fetch(`/api/affiliates/connect-onboarding?userId=${user.id}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to load Stripe status');
      }
      setStripeStatus(result);
    } catch (err: any) {
      console.error('Error loading Stripe status:', err);
      setStripeError(err.message || 'Failed to load Stripe status');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!user?.id) return;
    setStripeError(null);
    setStripeRedirecting(true);
    try {
      const response = await fetch('/api/affiliates/connect-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          returnPath: '/dashboard?stripe=connected',
          refreshPath: '/dashboard?stripe=refresh',
        }),
      });
      const result = await response.json();
      console.log('[connect-onboarding] response:', result);
      if (!response.ok || !result.onboarding_url) {
        throw new Error(result.message || result.error || 'Failed to start Stripe onboarding');
      }
      window.location.href = result.onboarding_url;
    } catch (err: any) {
      console.error('Error starting Stripe onboarding:', err);
      setStripeError(err.message || 'Failed to start Stripe onboarding');
      setStripeRedirecting(false);
    }
  };

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
  };

  const checkPayoutEligibility = () => {
    if (!dashData || !payoutSettings) return false;
    const stripeReady = !!stripeStatus?.payouts_enabled;
    const availableBalance = dashData.balance?.available_balance || 0;
    const hasEnoughEarnings = availableBalance >= payoutSettings.payment_threshold;
    const hasAvailableCommissions = availableBalance > 0;
    return stripeReady && hasEnoughEarnings && hasAvailableCommissions;
  };

  const handleRequestPayout = async () => {
    if (!user?.id || !dashData) return;

    setPayoutRequestError(null);
    setPayoutRequestSuccess(false);
    setRequestingPayout(true);

    try {
      const amount = payoutAmount || dashData.affiliate.total_earnings;

      const response = await fetch('/api/affiliates/request-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          affiliateCode: dashData.affiliate.code,
          amount: amount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to request payout');
      }

      // Show success confirmation inside the modal for 3 seconds before closing
      setPayoutConfirmed({ amount });

      // Optimistically zero-out the available balance so the UI reflects the payout immediately
      setDashData(prev => prev ? {
        ...prev,
        balance: {
          ...prev.balance,
          available_balance: Math.max(0, (prev.balance?.available_balance ?? 0) - amount),
          total_paid: (prev.balance?.total_paid ?? 0) + amount,
        },
        affiliate: {
          ...prev.affiliate,
          available_balance: Math.max(0, (prev.affiliate.available_balance ?? 0) - amount),
        },
      } : prev);

      // After 3 seconds dismiss the modal and show the inline success banner + toast
      setTimeout(() => {
        setPayoutConfirmed(null);
        setShowPayoutRequest(false);
        setPayoutAmount(0);
        setPayoutRequestSuccess(true);
        success(`$${amount.toFixed(2)} payout sent to your Stripe account.`);
        setTimeout(() => setPayoutRequestSuccess(false), 5000);
        // Reload to sync server state, then re-apply the balance decrement
        // (in preview mode the mock always returns the original balance, so we subtract again)
        loadDashboard().then(() => {
          setDashData(prev => prev ? {
            ...prev,
            balance: {
              ...prev.balance,
              available_balance: Math.max(0, (prev.balance?.available_balance ?? 0) - amount),
              total_paid: (prev.balance?.total_paid ?? 0) + amount,
            },
            affiliate: {
              ...prev.affiliate,
              available_balance: Math.max(0, (prev.affiliate.available_balance ?? 0) - amount),
            },
          } : prev);
        });
      }, 3000);
    } catch (err: any) {
      console.error('Error requesting payout:', err);
      setPayoutRequestError(err.message || 'Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  const copyReferralLink = () => {
    const code = dashData?.affiliate.code;
    if (!code) return;
    const referralLink = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditCode = () => {
    if (dashData) {
      setNewCode(dashData.affiliate.code);
      setEditingCode(true);
      setCodeError(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCode(false);
    setNewCode('');
    setCodeError(null);
  };

  const handleSaveCode = async () => {
    if (!user || !dashData) return;

    const codeRegex = /^[A-Z0-9]{4,12}$/;
    const cleanedCode = newCode.toUpperCase().trim();

    if (!codeRegex.test(cleanedCode)) {
      setCodeError('Code must be 4-12 uppercase letters/numbers only');
      return;
    }

    if (cleanedCode === dashData.affiliate.code) {
      setCodeError('This is already your affiliate code');
      return;
    }

    setUpdatingCode(true);
    setCodeError(null);

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
      });

      const result = await response.json();

      if (result.error) {
        setCodeError(result.error);
        setUpdatingCode(false);
        return;
      }

      if (result.affiliate && result.affiliate.code) {
        await loadDashboard(result.affiliate.code);
      } else {
        await loadDashboard();
      }
      setEditingCode(false);
      setNewCode('');
      setCodeError(null);
      setUpdatingCode(false);
    } catch (err) {
      console.error('Error updating affiliate code:', err);
      setCodeError('Failed to update affiliate code. Please try again.');
      setUpdatingCode(false);
    }
  };

  const getRankBadge = (rank: number | null) => {
    if (!rank) return null;
    if (rank === 1) return <TrophyIcon className="w-5 h-5 text-white" />;
    if (rank === 2) return <TrophyIcon className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <TrophyIcon className="w-5 h-5 text-white/60" />;
    return null;
  };

  if (authLoading && !user) {
    return <LoadingOverlay />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <AuthModal isOpen={true} onClose={() => {}} required />
      </div>
    );
  }

  const hasGallery = userGalleries.length > 0 || userIsAdmin;
  const hasBookClub = !!userSubdomain || userIsAdmin;
  const hasAffiliate = !!affiliateData || userIsAdmin;

  return (
    <>
      <AffiliateSignupWizard
        isOpen={showAffiliateWizard}
        onSuccess={() => {
          checkAffiliateStatus().then(() => {
            setActiveApp('affiliate');
          });
        }}
        onClose={() => setShowAffiliateWizard(false)}
      />
      <SEOHead
        title="My Dashboard"
        description="User dashboard and profile."
        canonicalPath="/dashboard"
        noIndex={true}
      />
      <div className="min-h-screen bg-black text-white selection:bg-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Main Grid Layout - 12 Columns */}
          <div className="grid grid-cols-12 gap-6 auto-rows-min">

            {/* Header Card */}
            <div className="col-span-12 bg-[#0a0a0a] p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <Avatar className="w-12 h-12 sm:w-16 sm:h-16 shrink-0">
                    <AvatarImage src={user.user_metadata?.avatar_url || '/logo.png'} alt="Profile" />
                    <AvatarFallback className="bg-white text-black font-black text-2xl">
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tighter">My Dashboard</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white/40 text-xs sm:text-sm font-mono uppercase truncate max-w-full block">{user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/settings"
                    className="p-3 hover:bg-white hover:text-black transition-all group/settings"
                    title="Settings"
                  >
                    <Cog6ToothIcon className="w-5 h-5 group-hover/settings:rotate-90 transition-transform duration-500" />
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="p-3 hover:bg-red-500 hover:text-white transition-all"
                    title="Sign Out"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-6 text-sm font-mono text-white/40">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span>SYSTEM ONLINE</span>
                </div>
                <span>•</span>
                <span>ID: {user.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>

            {/* Revenue & Widgets Row */}
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6">
              <div className="md:col-span-8 lg:col-span-9 space-y-4">
                {userIsAdmin && hasAffiliate && (
                  <div className="flex bg-[#0a0a0a] w-fit">
                    {(['admin', 'affiliate'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setRevenueView(mode)}
                        className={cn(
                          'px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors',
                          revenueView === mode ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                        )}
                      >
                        {mode === 'admin' ? 'Site Revenue' : 'My Affiliate'}
                      </button>
                    ))}
                  </div>
                )}

                {userIsAdmin && revenueView === 'admin' && (hasAffiliate || hasGallery) && (
                  <RevenueTracker
                    affiliateRevenue={parseFloat(String(affiliateData?.total_earnings || 0))}
                    galleryRevenue={galleryRevenueTotal}
                    subscriberRevenue={0}
                    galleryPhotoCount={userGalleries.reduce((sum, g) => sum + (g.photo_count || 0), 0)}
                    usersCount={affiliateData?.network_size || 0}
                    stats={{
                      revenue: parseFloat(String(affiliateData?.total_earnings || 0)) + galleryRevenueTotal,
                      newsletter: 0,
                      affiliates: (affiliateData?.total_conversions || 0)
                    }}
                    history={history}
                  />
                )}

                {(!userIsAdmin || revenueView === 'affiliate') && affiliateData && (
                  <AffiliateRevenueTracker
                    affiliateId={affiliateData.id}
                    affiliateCode={affiliateData.code}
                    totalEarnings={parseFloat(String(affiliateData.total_earnings || 0))}
                    totalClicks={affiliateData.total_clicks || 0}
                    totalConversions={affiliateData.total_conversions || 0}
                    networkSize={affiliateData.network_size || 0}
                    availableBalance={dashData?.balance?.available_balance ?? dashData?.affiliate?.available_balance}
                    pendingBalance={dashData?.balance?.pending_balance ?? dashData?.affiliate?.pending_balance}
                  />
                )}
              </div>
              <div className="md:col-span-4 lg:col-span-3 grid grid-cols-2 gap-3 md:flex md:flex-col md:gap-6">
                <ClockWidget size="lg" className="md:flex-1" />
                <CalendarWidget className="[zoom:0.6] md:[zoom:1] md:flex-1 md:min-h-[300px]" />
              </div>
            </div>

            {/* Console / My Apps Tab Bar */}
            <div className="col-span-12 flex flex-col items-center pt-8">
              <div className="relative group flex flex-col items-center">
                <h2 className="text-[10px] font-black text-white/40 tracking-[0.4em] uppercase mb-4 text-center">Platform Console</h2>
                <div className="flex items-center gap-2 p-1.5 bg-white/5 backdrop-blur-xl rounded-full">
                  {[
                    { id: 'gallery', icon: CameraIcon, title: 'The Gallery', show: hasGallery },
                    { id: 'writer', icon: BookOpenIcon, title: 'Writer', show: hasBookClub },
                    { id: 'affiliate', icon: ArrowTrendingUpIcon, title: 'Affiliate', show: hasAffiliate },
                    { id: 'settings', icon: Cog6ToothIcon, title: 'Account', show: true }
                  ].filter(app => app.show).map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setActiveApp(app.id)}
                      className={cn(
                        "relative p-3 transition-all duration-300 rounded-full group/btn",
                        activeApp === app.id ? "bg-white text-black scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "text-white/60 hover:text-white hover:bg-white/10"
                      )}
                      title={app.title}
                    >
                      <app.icon className="w-5 h-5" />
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {app.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Console — full-screen overlay for each app, mirrors Admin.tsx's console pattern */}
            <ExpandableScreen
              isOpen={activeApp !== null}
              onOpenChange={(open) => { if (!open) setActiveApp(null); }}
            >
              <ExpandableScreenContent>
                <div className="flex flex-col h-full w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  {activeApp && (() => {
                    const meta: Record<string, { title: string; icon: JSX.Element }> = {
                      gallery: { title: 'The Gallery', icon: <CameraIcon className="w-5 h-5 text-white/40" /> },
                      writer: { title: 'Writer Dashboard', icon: <BookOpenIcon className="w-5 h-5 text-white/40" /> },
                      affiliate: { title: 'Affiliate App', icon: <ArrowTrendingUpIcon className="w-5 h-5 text-white/40" /> },
                      settings: { title: 'Account Settings', icon: <Cog6ToothIcon className="w-5 h-5 text-white/40" /> },
                    };
                    const m = meta[activeApp];
                    if (!m) return null;
                    return (
                      <div className="shrink-0 flex flex-col gap-3 pt-6 pb-4 pr-16">
                        <button
                          onClick={() => setActiveApp(null)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-all duration-300 ease-out group w-fit"
                        >
                          <ArrowLeftIcon className="w-3 h-3 group-hover:-translate-x-1 transition-transform duration-300" />
                          Dashboard
                        </button>
                        <div className="flex items-center gap-3">
                          {m.icon}
                          <h2 className="text-lg font-black text-white tracking-widest uppercase">{m.title}</h2>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-6">
              {/* Gallery Section */}
              {hasGallery && activeApp === 'gallery' && (
                  <AdminGalleryView
                    onBack={() => setActiveApp(null)}
                    isPhotographerView={true}
                  />
              )}

              {/* Writer Section */}
              {hasBookClub && activeApp === 'writer' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-black p-4">
                        <AdminBentoRow
                          label="Author Profile"
                          value={blogTitle || user.user_metadata?.author_name || 'Not Set'}
                        />
                      </div>
                      <div className="bg-black p-4">
                        <AdminBentoRow
                          label="Domain"
                          value={<span className="text-green-400 font-mono text-[10px]">{userSubdomain}.thelostandunfounds.com</span>}
                        />
                      </div>
                      <div className="bg-black p-4">
                        <AdminBentoRow
                          label="Total Articles"
                          value={userPosts.length}
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                      <Link
                        to="/submit-article"
                        className="flex-1 bg-white text-black py-3 px-4 font-black text-[10px] uppercase text-center hover:bg-white/80 transition"
                      >
                        Create New Article
                      </Link>
                      <Link
                        to={`/blog/${userSubdomain}`}
                        className="flex-1 bg-white/10 py-3 px-4 font-black text-[10px] uppercase text-center hover:bg-white/20 transition"
                      >
                        View Public Blog
                      </Link>
                    </div>

                    {/* My Book Club Posts */}
                    <div className="mt-8">
                      <AdminBentoCard
                        title="MY BOOK CLUB POSTS"
                        className="bg-black/20"
                      >
                        <div className="space-y-0">
                          {userPosts.filter(p => p.subdomain).length === 0 ? (
                            <p className="text-white/40 text-xs py-8 text-center uppercase tracking-widest">No articles found</p>
                          ) : (
                            userPosts
                              .filter(p => p.subdomain)
                              .map((post) => (
                                <div
                                  key={post.id}
                                  className="group/item py-4 flex items-start justify-between gap-4 transition-colors"
                                >
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h4 className="text-white font-medium text-sm md:text-base leading-tight truncate">
                                        {post.title}
                                      </h4>
                                      <span className={cn(
                                        "flex-shrink-0 px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-bold",
                                        post.published
                                          ? "text-green-400 bg-green-400/10"
                                          : "text-amber-400 bg-amber-400/10"
                                      )}>
                                        {post.published ? 'Published' : 'Draft'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-[10px] text-white/40 uppercase tracking-wider mb-2">
                                      <span className="flex items-center gap-1">
                                        <CalendarIcon className="w-3 h-3" />
                                        {formatDate(post.published_at || post.created_at)}
                                      </span>
                                      <span>
                                        {blogTitle || user.user_metadata?.author_name || 'Anonymous'}
                                      </span>
                                      {post.subdomain && (
                                        <span className="text-blue-400/60">
                                          {post.subdomain}
                                        </span>
                                      )}
                                    </div>

                                    {post.excerpt && (
                                      <p className="text-white/60 text-xs line-clamp-2 leading-relaxed">
                                        {post.excerpt}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {post.published && (
                                      <>
                                        <a
                                          href={`/blog/${post.subdomain}/${post.slug}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 text-white/30 hover:text-white hover:bg-white/5 transition-all outline-none"
                                          title="View post"
                                        >
                                          <EyeIcon className="w-4 h-4" />
                                        </a>
                                        <button
                                          onClick={() => {
                                            if (confirm('To unpublish this post and return it to review, please use the Admin Dashboard Blog Management section.')) {
                                              navigate('/admin?section=blog');
                                            }
                                          }}
                                          className="p-2 text-amber-500/40 hover:text-amber-400 hover:bg-amber-400/10 transition-all outline-none"
                                          title="Unpublish"
                                        >
                                          <EyeSlashIcon className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => navigate(`/admin?section=blog&edit=${post.id}`)}
                                      className="p-2 text-white/30 hover:text-white hover:bg-white/5 transition-all outline-none"
                                      title="Edit post"
                                    >
                                      <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this post? This cannot be undone.')) {
                                          supabase.from('blog_posts').delete().eq('id', post.id).then(({ error }) => {
                                            if (error) showError(error.message);
                                            else {
                                              success('Post deleted');
                                              loadUserPosts();
                                            }
                                          });
                                        }
                                      }}
                                      className="p-2 text-red-500/40 hover:text-red-400 hover:bg-red-400/10 transition-all outline-none"
                                      title="Delete post"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </AdminBentoCard>
                    </div>
                  </div>
                </div>
              )}

              {/* Affiliate Section */}
              {hasAffiliate && activeApp === 'affiliate' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {dashLoading ? (
                    <div className="text-white/40 text-xs uppercase tracking-widest py-12 text-center animate-pulse">Loading dashboard...</div>
                  ) : dashError || !dashData ? (
                    <div className="text-white/40 text-xs uppercase tracking-widest py-12 text-center">
                      {dashError || (userIsAdmin && !affiliateData ? 'No affiliate account — sign up at /become-affiliate' : 'Failed to load')}
                    </div>
                  ) : (
                    <>
                      {/* Compact Card Grid ↔ Expanded Card View */}
                      {expandedCard ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <button
                            onClick={() => setExpandedCard(null)}
                            className="flex items-center gap-2 mb-8 text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors group"
                          >
                            <ArrowLeftIcon className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            All Sections
                          </button>

                          {/* ── EARNINGS ─────────────────────────────────── */}
                          {expandedCard === 'earnings' && (
                            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                              <AdminBentoCard title="Quick Actions" icon={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}>
                                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-center p-2">
                                  <button
                                    onClick={copyReferralLink}
                                    className="flex items-center justify-center gap-3 px-6 py-3 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-white/90 transition-all"
                                  >
                                    {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                                    {copied ? 'Copied' : 'Copy Affiliate Link'}
                                  </button>
                                  <Link to={`/?ref=${dashData.affiliate.code}`} target="_blank" className="flex items-center justify-center gap-3 px-6 py-3 bg-white/5 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
                                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                    Preview Shop
                                  </Link>
                                </div>
                              </AdminBentoCard>

                              <ExpandableBentoCard
                                title="Last 30 Days"
                                icon={<CalendarIcon className="w-4 h-4" />}
                                details={
                                  <>
                                    <AdminBentoRow label="Total Orders" value={dashData.overview.total_commissions} />
                                    <AdminBentoRow label="7-Day Trend" value={
                                      <span className={`flex items-center gap-1 ${dashData.overview.profit_trend_7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        <ArrowTrendingUpIcon className={`w-3 h-3 ${dashData.overview.profit_trend_7d < 0 ? 'rotate-180' : ''}`} />
                                        {Math.abs(dashData.overview.profit_trend_7d).toFixed(1)}%
                                      </span>
                                    } />
                                    {dashData.overview.best_day && (
                                      <AdminBentoRow label="Best Day" value={
                                        <div className="flex justify-between w-full">
                                          <span>{new Date(dashData.overview.best_day.date).toLocaleDateString()}</span>
                                          <span className="text-white/60">${dashData.overview.best_day.profit.toFixed(2)}</span>
                                        </div>
                                      } />
                                    )}
                                  </>
                                }
                              >
                                <div className="space-y-4 pt-2">
                                  <AdminBentoRow label="Commission Earned" value={`$${dashData.overview.total_commission_amount.toFixed(2)}`} />
                                  <AdminBentoRow label="Profit Generated" value={`$${dashData.overview.total_profit_generated.toFixed(2)}`} />
                                </div>
                              </ExpandableBentoCard>

                              <div className="bg-black border-0 rounded-none overflow-hidden">
                                <div className="p-6"><h2 className="text-lg font-black text-white uppercase tracking-widest">Recent Commissions</h2></div>
                                {dashData.recent_commissions.length === 0 ? (
                                  <div className="px-6 py-12 text-center text-white/40 text-xs font-medium uppercase tracking-widest">No commissions yet. Share your referral link to start earning!</div>
                                ) : (
                                  <>
                                    <div className="md:hidden">
                                      {dashData.recent_commissions.map((commission) => (
                                        <div key={commission.id} className={`p-4 hover:bg-white/5 transition-colors ${commission.status === 'cancelled' ? 'opacity-40' : ''}`}>
                                          <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="min-w-0 flex-1">
                                              <div className="text-white font-mono text-xs truncate">{commission.order_id.substring(0, 16)}...</div>
                                              <div className="text-white/40 text-[10px] font-mono mt-1">{new Date(commission.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap flex-shrink-0 ${commission.status === 'paid' ? 'bg-green-500/20 text-green-400' : commission.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : commission.status_label?.includes('Available') ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>{commission.status_label || commission.status}</span>
                                          </div>
                                          <div className="grid grid-cols-3 gap-2">
                                            <div><div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Commission</div><div className={`font-black text-sm font-mono tracking-tight ${commission.status === 'cancelled' ? 'text-red-500 line-through' : 'text-white'}`}>${commission.amount.toFixed(2)}</div></div>
                                            <div><div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Profit</div><div className="text-white font-mono text-sm font-bold">${commission.profit_generated.toFixed(2)}</div></div>
                                            <div><div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Source</div><div className="text-white/60 capitalize text-xs font-medium uppercase tracking-wider truncate">{commission.source}</div></div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="hidden md:block overflow-x-auto">
                                      <table className="w-full">
                                        <thead className="bg-black">
                                          <tr>
                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-white/40 uppercase tracking-widest">Order ID</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-white/40 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-white/40 uppercase tracking-widest">Commission</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-white/40 uppercase tracking-widest">Profit</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-white/40 uppercase tracking-widest">Source</th>
                                            <th className="px-6 py-4 text-center text-[10px] font-bold text-white/40 uppercase tracking-widest">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {dashData.recent_commissions.map((commission) => (
                                            <tr key={commission.id} className={`hover:bg-white/5 transition-colors ${commission.status === 'cancelled' ? 'opacity-40' : ''}`}>
                                              <td className="px-6 py-4 text-white font-mono text-xs">{commission.order_id.substring(0, 16)}...</td>
                                              <td className="px-6 py-4 text-white/60 text-xs font-mono">{new Date(commission.created_at).toLocaleDateString()}</td>
                                              <td className={`px-6 py-4 text-right font-black text-xs font-mono tracking-tight ${commission.status === 'cancelled' ? 'text-red-500 line-through' : 'text-white'}`}>${commission.amount.toFixed(2)}</td>
                                              <td className="px-6 py-4 text-right text-white font-mono text-xs font-bold">${commission.profit_generated.toFixed(2)}</td>
                                              <td className="px-6 py-4 text-white/60 capitalize text-xs font-medium uppercase tracking-wider">{commission.source}</td>
                                              <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${commission.status === 'paid' ? 'bg-green-500/20 text-green-400' : commission.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : commission.status_label?.includes('Available') ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>{commission.status_label || commission.status}</span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ── NETWORK ──────────────────────────────────── */}
                          {expandedCard === 'network' && (
                            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                              {dashData.mlm && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <AdminBentoCard title="Customers" icon={<UsersIcon className="w-4 h-4" />}>
                                    <div className="text-center py-2"><p className="text-4xl font-black text-white tracking-tighter">{dashData.mlm.network.total_customers}</p><p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">ACTIVE</p></div>
                                  </AdminBentoCard>
                                  <AdminBentoCard title="Level 1" icon={<UsersIcon className="w-4 h-4" />}>
                                    <div className="text-center py-2"><p className="text-4xl font-black text-white tracking-tighter">{dashData.mlm.network.level1_affiliates}</p><p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">DIRECT</p></div>
                                  </AdminBentoCard>
                                  <AdminBentoCard title="Level 2" icon={<UsersIcon className="w-4 h-4" />}>
                                    <div className="text-center py-2"><p className="text-4xl font-black text-white tracking-tighter">{dashData.mlm.network.level2_affiliates}</p><p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">INDIRECT</p></div>
                                  </AdminBentoCard>
                                  <AdminBentoCard title="MLM Earnings" icon={<CurrencyDollarIcon className="w-4 h-4" />}>
                                    <div className="text-center py-2"><p className="text-4xl font-black text-white tracking-tighter">${dashData.mlm.earnings.total_mlm.toFixed(2)}</p><p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">TOTAL</p></div>
                                  </AdminBentoCard>
                                </div>
                              )}
                              <MLMEarningsTable affiliateId={dashData.affiliate.id} />
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <ReferralTree affiliateId={dashData.affiliate.id} />
                                <CustomerList affiliateId={dashData.affiliate.id} />
                              </div>
                            </div>
                          )}

                          {/* ── KING MIDAS ───────────────────────────────── */}
                          {expandedCard === 'kingmidas' && (
                            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                              <ExpandableBentoCard
                                title="King Midas Performance"
                                icon={<TrophyIcon className="w-4 h-4" />}
                                details={
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Top 3</div><div className="text-xl font-black text-white tracking-tighter">{dashData.overview.top_3_finishes}</div></div>
                                    <div><div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Paid Out</div><div className="text-xl font-black text-white tracking-tighter">{dashData.overview.paid_payouts}</div></div>
                                  </div>
                                }
                              >
                                <div className="p-2 space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Earned</div><div className="text-xl font-black text-white tracking-tighter">${dashData.overview.total_king_midas_earnings.toFixed(2)}</div></div>
                                    <div><div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">1st Place</div><div className="text-xl font-black text-white tracking-tighter">{dashData.overview.first_place_finishes}</div></div>
                                    <div><div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Current Pool</div><div className="text-xl font-black text-white tracking-tighter">${(dashData.overview.current_rank && dashData.overview.current_rank <= 3) ? (dashData.king_midas?.recent_stats?.[0]?.pool_share || 0).toFixed(2) : '0.00'}</div></div>
                                  </div>
                                </div>
                              </ExpandableBentoCard>
                              <LeaderboardView highlightAffiliateCode={dashData.affiliate.code} />
                            </div>
                          )}

                          {/* ── PAYOUTS ──────────────────────────────────── */}
                          {expandedCard === 'payouts' && (
                            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AdminBentoCard title="Available to Payout" icon={<CurrencyDollarIcon className="w-4 h-4" />}>
                                  <div className="mt-2 text-center py-6">
                                    <div className="text-5xl font-black text-green-400 tracking-tighter mb-2">${(dashData.balance?.available_balance || 0).toFixed(2)}</div>
                                    <button
                                      onClick={() => { setPayoutAmount(dashData.balance?.available_balance || 0); setPayoutRequestError(null); setShowPayoutRequest(true); }}
                                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition-all mt-4"
                                    >
                                      <CurrencyDollarIcon className="w-4 h-4" />
                                      Request Payout
                                    </button>
                                  </div>
                                </AdminBentoCard>
                                <AdminBentoCard title="Pending Balance" icon={<CalendarIcon className="w-4 h-4" />}>
                                  <div className="mt-2 text-center py-6 opacity-60">
                                    <div className="text-4xl font-black text-white tracking-tighter mb-2">${(dashData.balance?.pending_balance || 0).toFixed(2)}</div>
                                    <div className="text-[10px] font-bold text-white uppercase tracking-widest">Held for Security (30 Days)</div>
                                  </div>
                                </AdminBentoCard>
                              </div>

                              <div className="bg-black border-0 rounded-none p-6">
                                <div className="flex items-center justify-between mb-6">
                                  <h3 className="text-lg font-black text-white uppercase tracking-widest">Stripe Connect</h3>
                                  <button onClick={loadStripeStatus} disabled={stripeLoading} className="text-[10px] font-bold text-white/60 hover:text-white uppercase tracking-widest transition-colors disabled:opacity-40">{stripeLoading ? 'Refreshing…' : 'Refresh'}</button>
                                </div>
                                {stripeError && <div className="bg-white/10 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6 text-white">{stripeError}</div>}
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center pb-4"><span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Account Status</span><span className="text-white font-mono uppercase tracking-widest text-xs">{stripeStatus ? stripeStatus.status : (stripeLoading ? 'Loading…' : 'Not connected')}</span></div>
                                  <div className="flex justify-between items-center pb-4"><span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Payouts Enabled</span><span className="text-white font-mono uppercase tracking-widest text-xs">{stripeStatus?.payouts_enabled ? 'Yes' : 'No'}</span></div>
                                  <div className="flex justify-between items-center pb-4"><span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Charges Enabled</span><span className="text-white font-mono uppercase tracking-widest text-xs">{stripeStatus?.charges_enabled ? 'Yes' : 'No'}</span></div>
                                  <div className="flex justify-between items-center pb-4"><span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Details Submitted</span><span className="text-white font-mono uppercase tracking-widest text-xs">{stripeStatus?.details_submitted ? 'Yes' : 'No'}</span></div>
                                  {stripeStatus?.requirements && stripeStatus.requirements.length > 0 && (
                                    <div className="pb-4 bg-yellow-500/5 px-4 py-3">
                                      <p className="text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest">Action Required — Complete your Stripe profile to unlock payouts</p>
                                    </div>
                                  )}
                                  <button onClick={handleConnectStripe} disabled={stripeRedirecting} className="w-full px-4 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-white/90 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                                    {stripeRedirecting ? 'Redirecting to Stripe…' : stripeStatus?.stripe_account_id ? (stripeStatus.payouts_enabled ? 'Update Stripe Account' : 'Continue Stripe Onboarding') : 'Connect Stripe'}
                                  </button>
                                </div>
                              </div>

                              <div className="bg-black border-0 rounded-none p-6">
                                <div className="flex items-center justify-between mb-6">
                                  <h3 className="text-lg font-black text-white uppercase tracking-widest">Payout Settings</h3>
                                  {!editingPayout && <button onClick={() => setEditingPayout(true)} className="text-[10px] font-bold text-white/60 hover:text-white uppercase tracking-widest transition-colors">Edit</button>}
                                </div>
                                {payoutSuccess && <div className="bg-green-500/10 text-green-500 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6">Payout settings updated successfully!</div>}
                                {payoutError && <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6">{payoutError}</div>}
                                {editingPayout ? (
                                  <div className="space-y-6">
                                    <div>
                                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Payment Threshold (minimum $10)</label>
                                      <input type="number" min="10" step="0.01" value={paymentThreshold} onChange={(e) => setPaymentThreshold(parseFloat(e.target.value))} className="w-full px-4 py-3 bg-white/5 rounded-none text-white focus:outline-none transition-colors font-mono text-sm" />
                                    </div>
                                    <div className="flex gap-4">
                                      <button onClick={handleSavePayoutSettings} className="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-colors">Save</button>
                                      <button onClick={() => { setEditingPayout(false); setPaymentThreshold(payoutSettings?.payment_threshold || 10); setPayoutError(null); }} className="px-6 py-2 bg-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center pb-4"><span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Payment Threshold</span><span className="text-white font-mono">${payoutSettings?.payment_threshold || 10}</span></div>
                                )}
                              </div>

                              <PayoutHistoryTable affiliateId={dashData.affiliate.id} />
                            </div>
                          )}

                          {/* ── REWARDS ──────────────────────────────────── */}
                          {expandedCard === 'rewards' && (
                            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                              <EmployeeDiscount affiliateId={dashData.affiliate.id} affiliateCode={dashData.affiliate.code} creditBalance={dashData.affiliate.discount_credit_balance} />
                              <RewardPointsBadge affiliateId={dashData.affiliate.id} initialPoints={dashData.affiliate.reward_points} />
                            </div>
                          )}

                          {/* ── LINKS & GUIDE ─────────────────────────────── */}
                          {expandedCard === 'links' && (
                            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                              <div>
                                <h3 className="text-white text-lg font-bold uppercase tracking-widest mb-4">Your Identity</h3>
                                <div className="bg-[#0a0a0a] p-6 rounded-none">
                                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Your Affiliate Code</div>
                                  {editingCode ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <input type="text" value={newCode} onChange={(e) => { setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setCodeError(null); }} maxLength={12} className="text-2xl md:text-3xl font-black text-white bg-black px-3 py-2 focus:outline-none font-mono rounded-none flex-1 min-w-0" placeholder="CODE" autoFocus />
                                        <button onClick={handleSaveCode} disabled={updatingCode} className="p-2 hover:bg-white/10 transition-colors">{updatingCode ? <LoadingSpinner size="sm" /> : <DocumentCheckIcon className="w-4 h-4" />}</button>
                                        <button onClick={handleCancelEdit} disabled={updatingCode} className="p-2 hover:bg-white/10 transition-colors"><XMarkIcon className="w-4 h-4" /></button>
                                      </div>
                                      {codeError && <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{codeError}</div>}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-3 group">
                                      <div className="text-2xl md:text-3xl font-black text-white font-mono tracking-tighter break-all">{dashData.affiliate.code}</div>
                                      <button onClick={handleEditCode} className="flex-shrink-0 p-2 hover:bg-white/10 transition-all"><PencilSquareIcon className="w-4 h-4 text-white/40 hover:text-white" /></button>
                                    </div>
                                  )}
                                  <div className="text-xs text-white/40 font-medium uppercase tracking-wider mt-3">Share this code to earn {dashData.affiliate.commission_rate}% of the profit on every sale.</div>
                                </div>
                              </div>
                              <div>
                                <h3 className="text-white text-lg font-bold uppercase tracking-widest mb-4">Link Generator</h3>
                                <DeepLinkGenerator affiliateCode={dashData.affiliate.code} commissionRate={dashData.affiliate.commission_rate ?? 42} />
                              </div>
                              <div>
                                <h3 className="text-white text-lg font-bold uppercase tracking-widest mb-4">Standard Links</h3>
                                <ReferralLink affiliateCode={dashData.affiliate.code} />
                              </div>
                              <div>
                                <h3 className="text-white text-lg font-bold uppercase tracking-widest mb-4">Affiliate Guide</h3>
                                <AffiliateGuide />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ── COMPACT CARD GRID ─────────────────────────────── */
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                          {/* EARNINGS */}
                          <button
                            onClick={() => setExpandedCard('earnings')}
                            className="group bg-[#0a0a0a] p-5 text-left hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10"
                          >
                            <div className="flex items-start justify-between mb-5">
                              <CurrencyDollarIcon className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                              <ChevronRightIcon className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none mb-1">
                              ${(dashData.balance?.total_lifetime ?? dashData.affiliate.total_earnings ?? 0).toFixed(2)}
                            </div>
                            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Lifetime Earnings</div>
                            <div className="mt-3 text-[9px] font-bold text-green-400/70 uppercase tracking-widest">
                              ${(dashData.balance?.available_balance ?? 0).toFixed(2)} available
                            </div>
                          </button>

                          {/* NETWORK */}
                          {dashData.mlm && (
                            <button
                              onClick={() => setExpandedCard('network')}
                              className="group bg-[#0a0a0a] p-5 text-left hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10"
                            >
                              <div className="flex items-start justify-between mb-5">
                                <UsersIcon className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                                <ChevronRightIcon className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                              </div>
                              <div className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none mb-1">
                                {dashData.mlm.network.total_network}
                              </div>
                              <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Downline</div>
                              <div className="mt-3 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                {dashData.mlm.network.total_customers} customers · ${dashData.mlm.earnings.total_mlm.toFixed(2)} MLM
                              </div>
                            </button>
                          )}

                          {/* KING MIDAS */}
                          <button
                            onClick={() => setExpandedCard('kingmidas')}
                            className="group bg-[#0a0a0a] p-5 text-left hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10"
                          >
                            <div className="flex items-start justify-between mb-5">
                              <TrophyIcon className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                              <ChevronRightIcon className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none mb-1">
                              ${dashData.overview.total_king_midas_earnings.toFixed(2)}
                            </div>
                            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">King Midas</div>
                            <div className="mt-3 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                              {dashData.overview.top_3_finishes} top-3 finishes
                            </div>
                          </button>

                          {/* PAYOUTS */}
                          <button
                            onClick={() => setExpandedCard('payouts')}
                            className="group bg-[#0a0a0a] p-5 text-left hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10"
                          >
                            <div className="flex items-start justify-between mb-5">
                              <WalletIcon className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                              <ChevronRightIcon className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none mb-1">
                              ${(dashData.balance?.available_balance ?? 0).toFixed(2)}
                            </div>
                            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Payouts</div>
                            <div className="mt-3">
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${stripeStatus?.status === 'active' ? 'text-green-400/70' : stripeStatus?.status === 'pending' ? 'text-yellow-400/70' : 'text-white/30'}`}>
                                Stripe {stripeStatus?.status || 'not connected'}
                              </span>
                            </div>
                          </button>

                          {/* REWARDS */}
                          <button
                            onClick={() => setExpandedCard('rewards')}
                            className="group bg-[#0a0a0a] p-5 text-left hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10"
                          >
                            <div className="flex items-start justify-between mb-5">
                              <StarIcon className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                              <ChevronRightIcon className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none mb-1">
                              {dashData.affiliate.reward_points}
                            </div>
                            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Rewards</div>
                            <div className="mt-3 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                              ${dashData.affiliate.discount_credit_balance?.toFixed(2) || '0.00'} store credit
                            </div>
                          </button>

                          {/* LINKS */}
                          <button
                            onClick={() => setExpandedCard('links')}
                            className="group bg-[#0a0a0a] p-5 text-left hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10 min-w-0"
                          >
                            <div className="flex items-start justify-between mb-5">
                              <ShareIcon className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                              <ChevronRightIcon className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tighter leading-none mb-1 truncate">
                              {dashData.affiliate.code}
                            </div>
                            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Links & Guide</div>
                            <div className="mt-3 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                              {dashData.affiliate.commission_rate}% commission rate
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Payout Request Modal — lives outside all tab conditionals so it renders on any active tab */}
                      {showPayoutRequest && dashData && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                          <div className="bg-black border-0 rounded-none p-8 max-w-md w-full">

                            {/* ── SUCCESS STATE ── */}
                            {payoutConfirmed ? (
                              <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                                  <CheckIcon className="w-8 h-8 text-green-400" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Payout Sent</h3>
                                <p className="text-green-400 font-black font-mono text-3xl mb-4">
                                  ${payoutConfirmed.amount.toFixed(2)}
                                </p>
                                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">
                                  Transferred to your Stripe account
                                </p>
                                <p className="text-white/20 text-[10px] font-medium uppercase tracking-widest">
                                  This dialog will close automatically…
                                </p>
                                <div className="mt-6 pt-6 flex justify-between text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                  <span>New available balance</span>
                                  <span className="font-mono text-white/50">${Math.max(0, (dashData.balance?.available_balance || 0)).toFixed(2)}</span>
                                </div>
                              </div>
                            ) : (
                            <>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Instant Payout</h3>

                            {payoutRequestError && (
                              <div className="bg-white/10 text-white px-4 py-3 rounded-none text-xs font-bold uppercase tracking-wider mb-6">
                                {payoutRequestError}
                              </div>
                            )}

                            <div className="space-y-6">
                              <div className="bg-white/5 p-4 rounded-none">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Available Now</span>
                                  <span className="text-white font-black font-mono text-lg">
                                    ${(dashData.balance?.available_balance || 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {(dashData.balance?.pending_balance || 0) > 0 && (
                                <div className="bg-white/5 p-4 rounded-none">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pending</span>
                                    <span className="text-white font-mono font-bold">
                                      ${(dashData.balance?.pending_balance || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  {dashData.balance?.upcoming_availability && dashData.balance.upcoming_availability.length > 0 && (
                                    <div className="mt-3 pt-3">
                                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Upcoming:</p>
                                      {dashData.balance.upcoming_availability.slice(0, 3).map((item, idx) => (
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
                                  max={dashData.balance?.available_balance || 0}
                                  step="0.01"
                                  value={payoutAmount}
                                  onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
                                  className="w-full px-4 py-3 bg-white/5 rounded-none text-white focus:outline-none transition-colors font-mono text-sm"
                                />
                                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mt-2">
                                  Min: ${payoutSettings?.payment_threshold || 10} · Max: ${(dashData.balance?.available_balance || 0).toFixed(2)}
                                </p>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                                  Destination
                                </label>
                                <div className="px-4 py-3 bg-white/5 rounded-none text-white font-mono text-sm">
                                  {stripeStatus?.stripe_account_id
                                    ? `Stripe ${stripeStatus.stripe_account_id}`
                                    : 'Stripe account not connected'}
                                </div>
                              </div>

                              <div className="bg-white/5 p-4 rounded-none text-[10px] text-white/60 font-medium uppercase tracking-wider leading-relaxed">
                                <p className="mb-2"><strong>Instant payout:</strong> Transferred to your Stripe Connect account.</p>
                                <p>Physical products: 30-day hold · Digital products: 7-day hold</p>
                              </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                              <button
                                onClick={handleRequestPayout}
                                disabled={requestingPayout || payoutAmount < (payoutSettings?.payment_threshold || 10) || payoutAmount > (dashData.balance?.available_balance || 0)}
                                className="flex-1 px-4 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                              >
                                {requestingPayout ? 'Processing...' : `Send $${payoutAmount.toFixed(2)} to Stripe`}
                              </button>
                              <button
                                onClick={() => {
                                  setShowPayoutRequest(false);
                                  setPayoutRequestError(null);
                                  setPayoutAmount(0);
                                }}
                                disabled={requestingPayout}
                                className="px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-widest hover:bg-white/20 transition-colors disabled:opacity-50 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                            </>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Settings Section */}
              {activeApp === 'settings' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-[#0a0a0a] p-6">
                    <div className="space-y-4 max-w-2xl">
                      <AdminBentoRow label="Tier" value={tier || 'Free'} />
                      <AdminBentoRow label="Status" value={<span className="text-green-500">Active</span>} />
                      <AdminBentoRow label="Invites" value="0 Available" />
                      <div className="pt-4">
                        <Link
                          to="/settings"
                          className="flex items-center justify-between text-xs uppercase font-bold text-white/50 hover:text-white transition bg-black p-4"
                        >
                          Manage Details <ChevronRightIcon className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                  </div>
                </div>
              </ExpandableScreenContent>
            </ExpandableScreen>

          </div>


        </div>
      </div>
    </>
  );
}
