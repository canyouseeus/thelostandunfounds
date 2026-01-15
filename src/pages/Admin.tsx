/**
 * Admin Dashboard Page
 * Admin-only page for managing the platform
 * Enhanced version with comprehensive platform management
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { isAdmin } from '../utils/admin';
import { supabase } from '../lib/supabase';
import {
  Users,
  Shield,
  BarChart3,
  Settings,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Bell,
  Clock,
  DollarSign,
  Zap,
  Network,
  Eye,
  Mail,
  Calendar,
  FileText,
  User,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  CheckSquare,
  Square,
  Package,
  BookOpen,
  Send,
  FolderOpen,
  ArrowUp,
  Maximize2,
  Inbox,
  Image as ImageIcon
} from 'lucide-react';
import { LoadingSpinner } from '../components/Loading';
import ErrorBoundary from '../components/ErrorBoundary';
import { ProductCostManagement } from '../components/ProductCostManagement';
import BlogManagement from '../components/BlogManagement';
import NewsletterManagement from '../components/NewsletterManagement';
import BlogSubmissionReview from '../components/BlogSubmissionReview';
import SendExistingPublicationEmailsButton from '../components/SendExistingPublicationEmailsButton';
import SendWelcomeEmailsButton from '../components/SendWelcomeEmailsButton';
import BrandAssets from '../components/BrandAssets';
import SecretSantaAdmin from '../components/admin/SecretSantaAdmin';
import AffiliateAdminView from '../components/admin/AffiliateAdminView';
import AffiliateEmailComposer from '../components/admin/AffiliateEmailComposer';
import { AdminBentoCard, AdminBentoRow } from '../components/ui/admin-bento-card';
import { SidePanel } from '../components/ui/side-panel';
import { SortableList } from '../components/ui/sortable-list';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../components/ui/expandable-screen';
import { AnimatedNumber } from '../components/ui/animated-number';
import { cn } from '../components/ui/utils';
import AdminUsersView from '../components/admin/AdminUsersView';
import AdminSettingsView from '../components/admin/AdminSettingsView';
import AdminMailView from '../components/admin/AdminMailView';
import { ArrowLeft } from 'lucide-react';
import AdminOverviewView from '../components/admin/AdminOverviewView';
import { DashboardCharts } from '../components/admin/DashboardCharts';
import AdminGalleryView from '../components/admin/AdminGalleryView';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  freeUsers: number;
  premiumUsers: number;
  proUsers: number;
  totalToolUsage: number;
  recentActivity: number;
  platformHealth: 'healthy' | 'warning' | 'critical';
  newsletterSubscribers: number;
  history: { revenue: string[]; newsletter: string[]; affiliates: string[]; };
  // Blog-specific metrics
  blogWriters?: number;
  totalBlogPosts?: number;
  publishedThisMonth?: number;
  affiliateRevenue?: number;
  galleryRevenue?: number;
  contributorDetails?: Array<{
    authorId: string;
    authorName: string;
    email: string;
    postCount: number;
    latestPost: string;
  }>;
}

interface RecentUser {
  id: string;
  email: string;
  username: string | null;
  tier: string;
  isAdmin: boolean;
  created_at: string;
}

interface BookClubPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  subdomain: string | null;
  published: boolean;
}

interface LostArchivesPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  published: boolean;
}

interface Alert {
  id: number;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  time: string;
  read: boolean;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedUser, setSelectedUser] = useState<RecentUser | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [expandedPost, setExpandedPost] = useState<BookClubPost | LostArchivesPost | null>(null);
  const [bookClubPosts, setBookClubPosts] = useState<BookClubPost[]>([]);
  const [loadingBookClubPosts, setLoadingBookClubPosts] = useState(false);
  const [lostArchivesPosts, setLostArchivesPosts] = useState<LostArchivesPost[]>([]);
  const [loadingLostArchivesPosts, setLoadingLostArchivesPosts] = useState(false);
  const [registeredWriters, setRegisteredWriters] = useState<number>(0);
  const [pendingSubmissions, setPendingSubmissions] = useState<number>(0);
  const [recentPosts, setRecentPosts] = useState<Array<{ title: string; author: string; date: string }>>([]);
  const [newestSubscribers, setNewestSubscribers] = useState<Array<{ email: string; created_at: string }>>([]);
  const [affiliateStats, setAffiliateStats] = useState<{
    totalAffiliates: number;
    activeAffiliates: number;
    totalEarnings: number;
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    pendingPayouts: number;
    totalMLMEarnings: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'products' | 'settings' | 'blog' | 'newsletter' | 'submissions' | 'assets' | 'secret-santa' | 'affiliates' | 'mail' | 'gallery' | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<RecentUser[]>([]);


  const unreadAlertsCount = alerts.filter(a => !a.read).length;


  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (adminStatus === true) {
      loadDashboardData();
      loadBookClubPosts();
      loadLostArchivesPosts();
      loadBlogStats();

      // Set up auto-refresh every 30 seconds
      const refreshInterval = setInterval(() => {
        loadDashboardData();
        if (activeTab === 'blog') {
          loadBlogStats();
          loadBookClubPosts();
          loadLostArchivesPosts();
        }
      }, 30000);

      return () => clearInterval(refreshInterval);
    }
  }, [adminStatus, user, activeTab]);

  // Listen for new blog submissions
  useEffect(() => {
    if (adminStatus !== true) return;

    const channel = supabase
      .channel('admin_dashboard_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blog_submissions'
        },
        (payload) => {
          const newSubmission = payload.new as any;
          if (newSubmission.status === 'pending') {
            // Add new alert
            setAlerts(prev => [
              {
                id: Date.now(),
                type: 'info',
                message: `New blog submission: "${newSubmission.title}"`,
                time: 'Just now',
                read: false
              },
              ...prev
            ]);

            // Show toast
            success(`New submission received: ${newSubmission.title}`);

            // Refresh data if needed
            // loadDashboardData(); 
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminStatus, success]);

  // Load user subdomain for profile link
  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const { data } = await supabase
            .from('user_subdomains')
            .select('subdomain')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data?.subdomain) {
            setUserSubdomain(data.subdomain);
          }
        } catch (error) {
          // Ignore errors
          console.error('Error loading subdomain:', error);
        }
      })();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    if (authLoading) return;

    if (!user) {
      navigate('/');
      return;
    }

    // First check: email match (fastest, no database query)
    const email = user?.email || '';
    const isAdminEmail = email === 'thelostandunfounds@gmail.com' || email === 'admin@thelostandunfounds.com';

    if (isAdminEmail) {
      // Email matches admin - allow access immediately
      setAdminStatus(true);
      setLoading(false);
      return;
    }

    // Second check: try database check
    try {
      const admin = await isAdmin();
      setAdminStatus(admin);
      setLoading(false);

      if (!admin) {
        showError('Access denied. Admin privileges required.');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Error checking admin access:', error);
      // If database check fails, fall back to email check
      if (isAdminEmail) {
        setAdminStatus(true);
        setLoading(false);
      } else {
        setAdminStatus(false);
        setLoading(false);
        showError('Access denied. Admin privileges required.');
        navigate('/');
      }
    }
  };

  const loadDashboardData = async () => {
    try {
      setComponentError(null);

      // Load user stats with better error handling
      let usersData = null;
      let usersError = null;
      try {
        const result = await supabase
          .from('platform_subscriptions')
          .select('user_id, tier, status');
        usersData = result.data;
        usersError = result.error;
      } catch (err: any) {
        // Table might not exist - that's okay, continue with defaults
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          console.warn('platform_subscriptions table does not exist, using defaults');
          usersError = null;
          usersData = [];
        } else {
          usersError = err;
        }
      }

      if (usersError && usersError.code !== 'PGRST116') {
        console.warn('Error loading subscriptions:', usersError);
      }

      // Calculate stats
      const subscriptions: any[] = usersData || [];
      const activeSubs = subscriptions.filter((s: any) => s.status === 'active');
      const freeCount = activeSubs.filter(s => s.tier === 'free').length;
      const premiumCount = activeSubs.filter(s => s.tier === 'premium').length;
      const proCount = activeSubs.filter(s => s.tier === 'pro').length;

      // Get total users (try multiple sources for accuracy)
      let totalUsers = 0;
      try {
        // Source 1: platform_subscriptions
        const subResult = await supabase
          .from('platform_subscriptions')
          .select('*', { count: 'exact', head: true });

        // Source 2: user_roles (often more complete)
        const rolesResult = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true });

        // Source 3: user_subdomains
        const domainsResult = await supabase
          .from('user_subdomains')
          .select('*', { count: 'exact', head: true });

        const subCount = subResult.count || 0;
        const roleCount = rolesResult.count || 0;
        const domainCount = domainsResult.count || 0;

        // Use the highest count found
        totalUsers = Math.max(subCount, roleCount, domainCount);

        // If all DB counts fail/return 0, fallback to local array
        if (totalUsers === 0) {
          totalUsers = subscriptions.length;
        }
      } catch (err: any) {
        console.warn('Error counting total users:', err);
        // Fallback
        totalUsers = subscriptions.length;
      }

      // Get tool usage stats
      let toolUsage = 0;
      try {
        const result = await supabase
          .from('tool_usage')
          .select('*', { count: 'exact', head: true });
        toolUsage = result.count || 0;
      } catch (err: any) {
        // Table might not exist - that's okay
        toolUsage = 0;
      }

      // Get newsletter subscriber count and newest subscribers
      let newsletterCount = 0;
      let newestSubs: Array<{ email: string; created_at: string }> = [];
      try {
        const { count } = await supabase
          .from('newsletter_subscribers')
          .select('*', { count: 'exact', head: true })
          .eq('verified', true);
        newsletterCount = count || 0;

        // Fetch newest 3 subscribers
        const { data: subsData } = await supabase
          .from('newsletter_subscribers')
          .select('email, created_at')
          .eq('verified', true)
          .order('created_at', { ascending: false })
          .limit(3);

        if (subsData) {
          newestSubs = subsData.map(sub => ({
            email: sub.email,
            created_at: sub.created_at
          }));
        }
      } catch (err) {
        console.warn('Error loading newsletter subscribers:', err);
      }

      setNewestSubscribers(newestSubs);

      // Get affiliate stats
      let affiliateStatsData = {
        totalAffiliates: 0,
        activeAffiliates: 0,
        totalEarnings: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0,
        pendingPayouts: 0,
        totalMLMEarnings: 0,
      };
      try {
        // Get all affiliates
        const { data: affiliates, count: affiliateCount } = await supabase
          .from('affiliates')
          .select('*', { count: 'exact' });

        if (affiliates) {
          affiliateStatsData.totalAffiliates = affiliateCount || affiliates.length;
          affiliateStatsData.activeAffiliates = affiliates.filter(a => a.status === 'active').length;

          // Aggregate stats
          affiliateStatsData.totalEarnings = affiliates.reduce((sum, a) => sum + parseFloat(a.total_earnings?.toString() || '0'), 0);
          affiliateStatsData.totalClicks = affiliates.reduce((sum, a) => sum + (a.total_clicks || 0), 0);
          affiliateStatsData.totalConversions = affiliates.reduce((sum, a) => sum + (a.total_conversions || 0), 0);
          affiliateStatsData.totalMLMEarnings = affiliates.reduce((sum, a) => sum + parseFloat(a.total_mlm_earnings?.toString() || '0'), 0);

          // Calculate conversion rate
          affiliateStatsData.conversionRate = affiliateStatsData.totalClicks > 0
            ? (affiliateStatsData.totalConversions / affiliateStatsData.totalClicks) * 100
            : 0;
        }

        // Get pending payout requests
        const { count: pendingCount } = await supabase
          .from('payout_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        affiliateStatsData.pendingPayouts = pendingCount || 0;
      } catch (err) {
        console.warn('Error loading affiliate stats:', err);
      }

      setAffiliateStats(affiliateStatsData);


      // Fetch history data for charts
      let historyData: { revenue: string[]; newsletter: string[]; affiliates: string[] } = { revenue: [], newsletter: [], affiliates: [] };
      try {
        const [subsHist, newsHist, affHist] = await Promise.all([
          supabase.from('platform_subscriptions').select('created_at').order('created_at', { ascending: true }),
          supabase.from('newsletter_subscribers').select('created_at').order('created_at', { ascending: true }),
          supabase.from('affiliates').select('created_at').order('created_at', { ascending: true })
        ]);

        historyData = {
          revenue: subsHist.data?.map((r: any) => r.created_at) || [],
          newsletter: newsHist.data?.map((r: any) => r.created_at) || [],
          affiliates: affHist.data?.map((r: any) => r.created_at) || []
        };
      } catch (hErr) {
        console.warn('Error loading history data:', hErr);
      }

      // Calculate platform health
      const totalSubs = activeSubs.length;
      const premiumRatio = totalSubs > 0 ? (premiumCount + proCount) / totalSubs : 0;
      const platformHealth = premiumRatio > 0.3 ? 'healthy' : premiumRatio > 0.1 ? 'warning' : 'critical';

      // Calculate recent activity (actions in last 24h)
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      const recentSubsCount = activeSubs.filter(s => s.created_at && s.created_at > oneDayAgo).length;
      const recentNewsletterCount = newestSubs.filter(s => s.created_at && s.created_at > oneDayAgo).length;

      // Add recent blog posts to activity
      const recentBlogCount = [
        ...bookClubPosts.filter(p => p.created_at > oneDayAgo),
        ...lostArchivesPosts.filter(p => p.created_at > oneDayAgo)
      ].length;

      // Calculate blog-specific metrics
      let blogWritersCount = 0;
      let totalBlogPostsCount = 0;
      let publishedThisMonthCount = 0;
      let affiliateRevenueTotal = 0;
      let galleryRevenueTotal = 0;
      let contributorDetailsArray: Array<{
        authorId: string;
        authorName: string;
        email: string;
        postCount: number;
        latestPost: string;
      }> = [];

      try {
        // Get unique blog writers count (authors who have published posts)
        const { data: blogPosts } = await supabase
          .from('blog_posts')
          .select('author_id, user_id, created_at, published_at')
          .eq('published', true);

        if (blogPosts) {
          // Count unique authors (try author_id first, fallback to user_id)
          const uniqueAuthors = new Set(
            blogPosts.map(p => p.author_id || p.user_id).filter(Boolean)
          );
          blogWritersCount = uniqueAuthors.size;
          totalBlogPostsCount = blogPosts.length;

          // Count posts published this month
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          publishedThisMonthCount = blogPosts.filter(p => {
            const publishDate = new Date(p.published_at || p.created_at);
            return publishDate >= startOfMonth;
          }).length;

          // Get contributor details
          const authorIds = Array.from(uniqueAuthors);
          console.log('Author IDs:', authorIds);

          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', authorIds);

          console.log('Profiles data:', profiles, 'Error:', profileError);

          // Create contributor details even if profiles are missing
          contributorDetailsArray = authorIds.map(authorId => {
            const profile = profiles?.find(p => p.id === authorId);
            const authorPosts = blogPosts.filter(p => (p.author_id || p.user_id) === authorId);
            const latestPost = authorPosts.sort((a, b) =>
              new Date(b.published_at || b.created_at).getTime() -
              new Date(a.published_at || a.created_at).getTime()
            )[0];

            return {
              authorId: authorId as string,
              authorName: profile?.full_name || profile?.email?.split('@')[0] || `Author ${authorId.substring(0, 8)}`,
              email: profile?.email || 'No email available',
              postCount: authorPosts.length,
              latestPost: latestPost?.published_at || latestPost?.created_at || new Date().toISOString(),
            };
          }).sort((a, b) => b.postCount - a.postCount); // Sort by post count descending

          console.log('Contributor details array:', contributorDetailsArray);
        }

        // Platform launch date - filter out test data before this date
        const PLATFORM_LAUNCH_DATE = '2026-01-15';

        // Helper to identify test emails
        const isTestEmail = (email: string | null | undefined) => {
          if (!email) return false;
          const testPatterns = ['test', 'demo', 'admin', 'dev', 'staging', 'dummy'];
          return testPatterns.some(pattern =>
            email.toLowerCase().includes(pattern)
          );
        };

        // Get affiliate revenue with email and date filtering
        const { data: affiliates, error: affError } = await supabase
          .from('affiliates')
          .select('total_earnings, email, created_at');

        console.log('Affiliate data:', affiliates, 'Error:', affError);

        if (affiliates) {
          // Filter out test data
          const realAffiliates = affiliates.filter(a =>
            !isTestEmail(a.email) &&
            new Date(a.created_at) >= new Date(PLATFORM_LAUNCH_DATE)
          );

          console.log('Real affiliates (filtered):', realAffiliates);

          affiliateRevenueTotal = realAffiliates.reduce((sum, a) => {
            const earnings = typeof a.total_earnings === 'string'
              ? parseFloat(a.total_earnings)
              : (a.total_earnings || 0);
            return sum + (isNaN(earnings) ? 0 : earnings);
          }, 0);
          console.log('Total affiliate revenue (real customers only):', affiliateRevenueTotal);
        }

        // Get gallery revenue with email and date filtering
        const { data: orders, error: ordersError } = await supabase
          .from('photo_orders')
          .select('total_amount_cents, email, created_at, payment_status');

        console.log('Gallery orders:', orders, 'Error:', ordersError);

        if (orders) {
          // Filter out test data
          const realOrders = orders.filter(o =>
            !isTestEmail(o.email) &&
            new Date(o.created_at) >= new Date(PLATFORM_LAUNCH_DATE) &&
            o.payment_status === 'completed'
          );

          console.log('Real orders (filtered):', realOrders);

          galleryRevenueTotal = realOrders.reduce((sum, o) =>
            sum + (o.total_amount_cents || 0), 0
          ) / 100;
          console.log('Total gallery revenue (real customers only):', galleryRevenueTotal);
        }
      } catch (err) {
        console.warn('Error loading blog metrics:', err);
      }

      setStats({
        totalUsers: totalUsers || subscriptions.length,
        activeSubscriptions: activeSubs.length,
        freeUsers: freeCount,
        premiumUsers: premiumCount,
        proUsers: proCount,
        totalToolUsage: toolUsage || 0,
        recentActivity: recentSubsCount + recentNewsletterCount + recentBlogCount,
        platformHealth,
        newsletterSubscribers: newsletterCount,
        history: historyData,
        // Blog-specific metrics
        blogWriters: blogWritersCount,
        totalBlogPosts: totalBlogPostsCount,
        publishedThisMonth: publishedThisMonthCount,
        affiliateRevenue: affiliateRevenueTotal,
        galleryRevenue: galleryRevenueTotal,
        contributorDetails: contributorDetailsArray,
      });

      // Generate alerts based on stats
      const newAlerts: Alert[] = [];
      if (platformHealth === 'critical') {
        newAlerts.push({
          id: 1,
          type: 'warning',
          message: 'Low premium subscription ratio - consider promotional campaigns',
          time: 'Just now',
          read: false,
        });
      }
      if (toolUsage === 0) {
        newAlerts.push({
          id: 2,
          type: 'info',
          message: 'No tool usage recorded yet - tools may need promotion',
          time: 'Just now',
          read: false,
        });
      }
      if (activeSubs.length > 0) {
        newAlerts.push({
          id: 3,
          type: 'success',
          message: `Platform is operational with ${activeSubs.length} active subscriptions`,
          time: 'Just now',
          read: true,
        });
      }

      // Check for pending blog submissions
      try {
        const { count } = await supabase
          .from('blog_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (count && count > 0) {
          newAlerts.push({
            id: 4,
            type: 'info',
            message: `${count} new blog submission${count > 1 ? 's' : ''} pending review`,
            time: 'Just now',
            read: false
          });
        }

        setPendingSubmissions(count || 0);
      } catch (err) {
        console.error('Error checking pending submissions:', err);
      }

      setAlerts(newAlerts);

      // Load recent users
      let recentData: any[] | null = null;
      try {
        // Try platform_subscriptions first
        const result = await supabase
          .from('platform_subscriptions')
          .select('user_id, tier, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        recentData = result.data || [];

        // If empty or sparse, try user_roles
        if (!recentData || recentData.length === 0) {
          const roleResult = await supabase
            .from('user_roles')
            .select('user_id, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

          if (roleResult.data && roleResult.data.length > 0) {
            recentData = roleResult.data.map((r: any) => ({
              user_id: r.user_id,
              tier: 'free', // Default since we don't have sub info
              created_at: r.created_at
            }));
          }
        }
      } catch (err: any) {
        // Table might not exist - try to get users from auth.users via RPC or fallback
        try {
          // Try to get recent users from user_roles or user_subdomains as fallback
          const fallbackResult = await supabase
            .from('user_subdomains')
            .select('user_id, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
          if (fallbackResult.data) {
            recentData = fallbackResult.data.map((row: any) => ({
              user_id: row.user_id,
              tier: 'free',
              created_at: row.created_at,
            }));
          }
        } catch (fallbackErr) {
          recentData = [];
        }
      }

      if (recentData && recentData.length > 0) {
        // Fetch user info including metadata
        const usersWithInfo = await Promise.all(
          recentData.map(async (sub: any) => {
            const userId = sub.user_id;

            // Try to get user metadata and admin status
            let username = null;
            let isAdmin = false;
            let email = `user-${userId.substring(0, 8)}`;

            try {
              // Check user_roles for admin status
              const roleResult = await supabase
                .from('user_roles')
                .select('is_admin, email')
                .eq('user_id', userId)
                .maybeSingle();

              if (roleResult.data) {
                isAdmin = roleResult.data.is_admin === true;
                if (roleResult.data.email) {
                  email = roleResult.data.email;
                }
              }

              // Check user_subdomains for username (author_name might be in metadata)
              // We can't directly query auth.users, but we can check user_metadata via user_subdomains
              // For now, we'll use email as fallback and check if we can get author_name

              // Check if user has author_name in user_subdomains or try to infer from email
              const subdomainResult = await supabase
                .from('user_subdomains')
                .select('subdomain')
                .eq('user_id', userId)
                .maybeSingle();

              if (subdomainResult.data?.subdomain) {
                // Use subdomain as username hint, but we need actual author_name
                // Since we can't query auth.users directly, we'll use email prefix
                username = subdomainResult.data.subdomain;
              }
            } catch (metaErr: any) {
              // If we can't get metadata, that's okay - use defaults
              console.warn('Error fetching user metadata:', metaErr);
            }

            // Check admin email list
            if (email === 'thelostandunfounds@gmail.com' || email === 'admin@thelostandunfounds.com') {
              isAdmin = true;
            }

            return {
              id: userId,
              email: email,
              username: username || email.split('@')[0] || 'Unknown',
              tier: sub.tier || 'free',
              isAdmin: isAdmin,
              created_at: sub.created_at || '',
            };
          })
        );

        setRecentUsers(usersWithInfo);
        setAllUsers(usersWithInfo);
      } else {
        // If no subscription data, try to show users from user_subdomains
        try {
          const subdomainResult = await supabase
            .from('user_subdomains')
            .select('user_id, subdomain, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

          if (subdomainResult.data && subdomainResult.data.length > 0) {
            const usersFromSubdomains = await Promise.all(
              subdomainResult.data.map(async (row: any) => {
                const userId = row.user_id;
                let isAdmin = false;
                let email = `user-${userId.substring(0, 8)}`;

                try {
                  const roleResult = await supabase
                    .from('user_roles')
                    .select('is_admin, email')
                    .eq('user_id', userId)
                    .maybeSingle();

                  if (roleResult.data) {
                    isAdmin = roleResult.data.is_admin === true;
                    if (roleResult.data.email) {
                      email = roleResult.data.email;
                    }
                  }

                  if (email === 'thelostandunfounds@gmail.com' || email === 'admin@thelostandunfounds.com') {
                    isAdmin = true;
                  }
                } catch (e) {
                  // Ignore
                }

                return {
                  id: userId,
                  email: email,
                  username: row.subdomain || email.split('@')[0],
                  tier: 'free',
                  isAdmin: isAdmin,
                  created_at: row.created_at || '',
                };
              })
            );
            setRecentUsers(usersFromSubdomains);
            setAllUsers(usersFromSubdomains);
          }
        } catch (subdomainErr) {
          // Ignore - no users to show
        }
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      const errorMsg = error?.message || 'Unknown error';

      // Set default stats if tables don't exist
      setStats({
        totalUsers: 0,
        activeSubscriptions: 0,
        freeUsers: 0,
        premiumUsers: 0,
        proUsers: 0,
        totalToolUsage: 0,
        recentActivity: 0,
        platformHealth: 'warning',
        newsletterSubscribers: 0,
        history: { revenue: [], newsletter: [], affiliates: [] },
      });
      setAlerts([{
        id: 1,
        type: 'warning',
        message: 'Some platform data could not be loaded. This is normal if database tables are still being set up.',
        time: 'Just now',
        read: false,
      }]);

      // Only set component error for unexpected errors
      if (!errorMsg.includes('does not exist') && !errorMsg.includes('permission denied') && !errorMsg.includes('403')) {
        setComponentError(`Error loading dashboard: ${errorMsg}`);
      }
    }
  };

  const loadBookClubPosts = async () => {
    try {
      setLoadingBookClubPosts(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, published_at, created_at, subdomain, published, status')
        .not('subdomain', 'is', null)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading book club posts:', error);
        return;
      }

      // Filter to only published posts
      const publishedPosts = (data || []).filter((post: any) => {
        const isPublished = post.published === true ||
          (post.published === undefined && post.status === 'published');
        return isPublished;
      });

      setBookClubPosts(publishedPosts);
    } catch (err: any) {
      console.error('Error loading book club posts:', err);
    } finally {
      setLoadingBookClubPosts(false);
    }
  };

  const loadLostArchivesPosts = async () => {
    try {
      setLoadingLostArchivesPosts(true);
      if (!user) return;

      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, published_at, created_at, published, status, author_id, user_id, subdomain')
        .is('subdomain', null)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading THE LOST ARCHIVES posts:', error);
        return;
      }

      // Filter to published posts (no subdomain)
      // Since admin is the only writer for THE LOST ARCHIVES, show all published posts without subdomain
      const filteredPosts = (data || []).filter((post: any) => {
        const isPublished = post.published === true ||
          (post.published === undefined && post.status === 'published');
        return isPublished; // All published posts without subdomain are THE LOST ARCHIVES
      });

      setLostArchivesPosts(filteredPosts);
    } catch (err: any) {
      console.error('Error loading THE LOST ARCHIVES posts:', err);
    } finally {
      setLoadingLostArchivesPosts(false);
    }
  };

  const loadBlogStats = async () => {
    try {
      // Count registered writers (users with blog posts or user_subdomains with blog_title)
      const [writersResult, recentPostsResult, subdomainResult] = await Promise.all([
        // Get all blog posts with author_id to count unique authors
        supabase
          .from('blog_posts')
          .select('author_id')
          .not('author_id', 'is', null),
        // Get most recent posts with author info
        supabase
          .from('blog_posts')
          .select('title, author_id, published_at, created_at, subdomain')
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5),
        // Get users with user_subdomains who have blog_title set
        supabase
          .from('user_subdomains')
          .select('user_id, blog_title, author_name')
          .not('blog_title', 'is', null)
      ]);

      // Count unique authors from blog_posts
      const authorIds = new Set<string>();
      if (writersResult.data) {
        writersResult.data.forEach((post: any) => {
          if (post.author_id) authorIds.add(post.author_id);
        });
      }

      // Also count users with user_subdomains who have blog_title set
      if (subdomainResult.data) {
        subdomainResult.data.forEach((sub: any) => {
          if (sub.user_id) authorIds.add(sub.user_id);
        });
      }

      console.log('Registered writers count:', authorIds.size, 'Authors:', Array.from(authorIds));
      setRegisteredWriters(authorIds.size);

      // Process recent posts
      if (recentPostsResult.data) {
        const postsWithAuthors = await Promise.all(
          recentPostsResult.data.map(async (post: any) => {
            let authorName = 'Unknown';
            if (post.subdomain) {
              // Try to get author name from user_subdomains
              const { data: subdomainData } = await supabase
                .from('user_subdomains')
                .select('author_name, blog_title')
                .eq('subdomain', post.subdomain)
                .maybeSingle();

              if (subdomainData?.author_name) {
                authorName = subdomainData.author_name;
              } else if (subdomainData?.blog_title) {
                authorName = post.subdomain;
              }
            } else {
              authorName = 'Lost Archives';
            }

            return {
              title: post.title || 'Untitled',
              author: authorName,
              date: post.published_at || post.created_at || new Date().toISOString()
            };
          })
        );
        setRecentPosts(postsWithAuthors);
      }
    } catch (err: any) {
      console.error('Error loading blog stats:', err);
    }
  };

  if (loading || authLoading || adminStatus === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (adminStatus === false) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-left py-12">
          <p className="text-white/70">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  // If there's a component error, show it
  if (componentError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Admin Dashboard</h2>
          <p className="text-red-300 mb-4">{componentError}</p>
          <button
            onClick={() => {
              setComponentError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Default to overview tab if admin status is confirmed
  if (!stats && adminStatus === true) {
    // Stats haven't loaded yet, but we're confirmed admin - show loading state
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 uppercase">
            ADMIN DASHBOARD
          </h1>
          <p className="text-white/70">Manage your platform and users</p>
        </div>
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-black text-white max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 uppercase">
              ADMIN DASHBOARD
            </h1>
            <p className="text-white/70">Manage your platform and users</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={userSubdomain ? `/${userSubdomain}/bookclubprofile` : "/bookclubprofile"}
              className="px-4 py-2 bg-white text-black hover:bg-white/90 font-bold rounded-none text-sm transition flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
          </div>
        </div>
      </div>


      {activeTab === 'overview' && (
        <AdminOverviewView stats={stats} alerts={alerts} onBack={() => setActiveTab(null)} />
      )}

      {activeTab === 'users' && (
        <AdminUsersView
          users={allUsers}
          stats={stats}
          onSelectUser={(u) => { setSelectedUser(u); setSidePanelOpen(true); }}
          onBack={() => setActiveTab(null)}
        />
      )}

      {activeTab === 'settings' && (
        <AdminSettingsView stats={stats} onBack={() => setActiveTab(null)} />
      )}

      {activeTab === 'blog' && (
        <div className="space-y-6">
          <button onClick={() => setActiveTab(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <ErrorBoundary fallback={<div className="p-4 text-red-400">Error loading Blog Management</div>}>
            <BlogManagement />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'newsletter' && (
        <div className="space-y-6">
          <button onClick={() => setActiveTab(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <ErrorBoundary fallback={<div className="p-4 text-red-400">Error loading Newsletter Management</div>}>
            <NewsletterManagement />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <button onClick={() => setActiveTab(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <ErrorBoundary fallback={<div className="p-4 text-red-400">Error loading Product Management</div>}>
            <ProductCostManagement />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <button onClick={() => setActiveTab(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <ErrorBoundary fallback={<div className="p-4 text-red-400">Error loading Submissions</div>}>
            <BlogSubmissionReview />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'affiliates' && (
        <div className="space-y-6">
          <button onClick={() => setActiveTab(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <ErrorBoundary fallback={<div className="p-4 text-red-400">Error loading Affiliates</div>}>
            <div className="space-y-6">
              <AffiliateAdminView />
              <AffiliateEmailComposer />
            </div>
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'mail' && (
        <ErrorBoundary fallback={<div className="p-4 text-red-400">Error loading Mail</div>}>
          <AdminMailView onBack={() => setActiveTab(null)} />
        </ErrorBoundary>
      )}

      {activeTab === 'gallery' && (
        <AdminGalleryView onBack={() => setActiveTab(null)} />
      )}

      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <button onClick={() => setActiveTab(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Subscription Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-none p-4">
                <div className="text-white/60 text-sm mb-1">Free Tier</div>
                <div className="text-2xl font-bold text-white/60">{stats?.freeUsers || 0}</div>
              </div>
              <div className="bg-white/5 rounded-none p-4 border border-yellow-400/20">
                <div className="text-white/60 text-sm mb-1">Premium Tier</div>
                <div className="text-2xl font-bold text-yellow-400">{stats?.premiumUsers || 0}</div>
              </div>
              <div className="bg-white/5 rounded-none p-4 border border-purple-400/20">
                <div className="text-white/60 text-sm mb-1">Pro Tier</div>
                <div className="text-2xl font-bold text-purple-400">{stats?.proUsers || 0}</div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-white/60">Advanced subscription management features coming soon...</p>
            </div>
          </div>
        </div>
      )}

      {!activeTab && (

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[240px] mb-8">
          {/* Overview - 3x2 */}
          <AdminBentoCard
            title="Platform Overview"
            icon={<BarChart3 className="w-4 h-4" />}
            colSpan={3}
            rowSpan={2}
            className="md:col-span-3 md:row-span-2"
            action={
              <button
                onClick={() => setActiveTab('overview')}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-none transition"
              >
                Full Report
              </button>
            }
          >
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0 mb-4">
                <DashboardCharts stats={{
                  revenue: (stats?.activeSubscriptions || 0) * 9.99,
                  newsletter: stats?.newsletterSubscribers || 0,
                  affiliates: affiliateStats?.totalAffiliates || 0
                }}
                  history={stats?.history} />
              </div>
              <div className="flex-none grid grid-cols-2 md:grid-cols-4 gap-4 items-start pb-4">
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Contributors</div>
                  <div className="text-2xl font-bold text-white"><AnimatedNumber value={stats?.totalUsers || 0} /></div>
                </div>
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Subscribers</div>
                  <div className="text-2xl font-bold text-white"><AnimatedNumber value={stats?.activeSubscriptions || 0} /></div>
                </div>
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Revenue</div>
                  <div className="text-2xl font-bold text-green-400">$<AnimatedNumber value={(stats?.activeSubscriptions || 0) * 9.99} /></div>
                </div>
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Health</div>
                  <div className={`text-2xl font-bold ${stats?.platformHealth === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                    {stats?.platformHealth === 'healthy' ? 'Good' : 'Action Needed'}
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <AdminBentoRow label="Newsletter" value={stats?.newsletterSubscribers || 0} className="border-0 p-0" />
                <AdminBentoRow label="Tool Usage" value={stats?.totalToolUsage || 0} className="border-0 p-0" />
                <AdminBentoRow label="Premium" value={stats?.premiumUsers || 0} className="border-0 p-0" />
                <AdminBentoRow label="Pro" value={stats?.proUsers || 0} className="border-0 p-0" />
              </div>
            </div>
          </AdminBentoCard>

          {/* Alerts - 1x2 */}
          <AdminBentoCard
            title="System Alerts"
            icon={<Bell className="w-4 h-4" />}
            colSpan={1}
            rowSpan={2}
            className="md:col-span-1 md:row-span-2"
            footer={
              <button
                onClick={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}
                className="w-full text-xs text-white/60 hover:text-white text-center"
              >
                Mark all as read
              </button>
            }
          >
            <div className="space-y-2">
              {alerts.length > 0 ? alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="p-3 bg-white/5 border border-white/5 border-l-2 border-l-yellow-400">
                  <p className="text-xs text-white/90 line-clamp-2">{alert.message}</p>
                  <span className="text-[10px] text-white/40 mt-1 block">{alert.time}</span>
                </div>
              )) : (
                <div className="text-center text-white/40 text-xs py-8">No active alerts</div>
              )}
            </div>
          </AdminBentoCard>

          {/* Users - 1x1 */}
          <AdminBentoCard
            title="Contributor Management"
            icon={<Users className="w-4 h-4" />}
            action={<span className="text-xs font-mono text-white/40">{allUsers.length}</span>}
            footer={
              <button onClick={() => setActiveTab('users')} className="w-full text-center text-xs hover:text-white text-white/60">Manage Users →</button>
            }
          >
            <div className="space-y-0">
              <AdminBentoRow label="New (24h)" value={recentUsers.filter(u => new Date(u.created_at).getTime() > Date.now() - 86400000).length} />
              <AdminBentoRow label="Free" value={stats?.freeUsers || 0} />
              <AdminBentoRow label="Premium" value={stats?.premiumUsers || 0} valueClassName="text-yellow-400" />
              <AdminBentoRow label="Pro" value={stats?.proUsers || 0} valueClassName="text-purple-400" />
            </div>
          </AdminBentoCard>

          {/* Subscriptions - 1x1 */}
          <AdminBentoCard
            title="Subscriptions"
            icon={<DollarSign className="w-4 h-4" />}
            action={<span className="text-xs font-mono text-green-400">{stats?.activeSubscriptions}</span>}
            footer={
              <button onClick={() => setActiveTab('subscriptions')} className="w-full text-center text-xs hover:text-white text-white/60">Manage Plans →</button>
            }
          >
            <div className="space-y-0">
              <AdminBentoRow label="Active" value={stats?.activeSubscriptions || 0} valueClassName="text-green-400" />
              <AdminBentoRow label="Churn Rate" value="0.0%" />
              <AdminBentoRow label="MRR" value={`$${((stats?.activeSubscriptions || 0) * 9.99).toFixed(0)}`} />
            </div>
          </AdminBentoCard>

          {/* Products - 1x1 */}
          <AdminBentoCard
            title="Products"
            icon={<Package className="w-4 h-4" />}
            footer={
              <button onClick={() => setActiveTab('products')} className="w-full text-center text-xs hover:text-white text-white/60">Catalog →</button>
            }
          >
            <div className="space-y-0 text-left h-full">
              <AdminBentoRow label="Catalog Items" value="0" />
              <AdminBentoRow label="Inventory" value="IN STOCK" valueClassName="text-green-400" />
              <AdminBentoRow label="Cost Basis" value="$0.00" />
              <div className="mt-4 pt-2 border-t border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-none">Status</p>
                <p className="text-xs text-white/60 mt-1 uppercase">Operational</p>
              </div>
            </div>
          </AdminBentoCard>

          {/* Blog - 1x1 */}
          <AdminBentoCard
            title="Blog"
            icon={<BookOpen className="w-4 h-4" />}
            action={<span className="text-xs font-mono text-white/40">{bookClubPosts.length + lostArchivesPosts.length}</span>}
            footer={
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('blog')} className="flex-1 text-center text-xs hover:text-white text-white/60">Manage Content →</button>
                {pendingSubmissions > 0 && (
                  <button onClick={() => setActiveTab('submissions')} className="flex-1 text-center text-xs hover:text-white text-yellow-400 font-bold">Review ({pendingSubmissions}) →</button>
                )}
              </div>
            }
          >
            <div className="space-y-0">
              <AdminBentoRow label="Writers" value={registeredWriters} />
              <AdminBentoRow label="Book Club" value={bookClubPosts.length} />
              <AdminBentoRow label="Archives" value={lostArchivesPosts.length} />
              <AdminBentoRow label="Pending" value={pendingSubmissions} valueClassName={pendingSubmissions > 0 ? "text-yellow-400 font-bold" : ""} />
            </div>
          </AdminBentoCard>

          {/* Newsletter - 1x1 */}
          <AdminBentoCard
            title="Newsletter"
            icon={<Mail className="w-4 h-4" />}
            action={<span className="text-xs font-mono text-blue-400">{stats?.newsletterSubscribers}</span>}
            footer={
              <button onClick={() => setActiveTab('newsletter')} className="w-full text-center text-xs hover:text-white text-white/60">Campaigns →</button>
            }
          >
            <div className="space-y-2 mt-1">
              {newestSubscribers.slice(0, 2).map((sub, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="truncate text-white/60 max-w-[120px]">{sub.email}</span>
                  <span className="text-white/30 text-[10px]">{new Date(sub.created_at).toLocaleDateString()}</span>
                </div>
              ))}
              {newestSubscribers.length === 0 && <p className="text-xs text-white/40">No recent subscribers</p>}
            </div>
          </AdminBentoCard>


          {/* Gallery Ops */}
          <div
            onClick={() => setActiveTab('gallery')}
            className="col-span-1 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-6 flex flex-col justify-between cursor-pointer group transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-pink-400/10 rounded-sm">
                <ImageIcon className="w-5 h-5 text-pink-400" />
              </div>
              <ArrowUp className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:rotate-45 transition-all" />
            </div>
            <div>
              <h3 className="text-white font-bold uppercase text-sm mb-1 tracking-wider">Gallery Ops</h3>
              <p className="text-white/40 text-xs">Manage photos & sales</p>
            </div>
          </div>

          {/* Mail System */}
          <div
            onClick={() => setActiveTab('mail')}
            className="cursor-pointer"
          >
            <AdminBentoCard
              title="Webmail"
              icon={<Send className="w-4 h-4" />}
              footer={
                <span className="w-full text-center text-xs hover:text-white text-white/60">Open Inbox →</span>
              }
            >
              <div className="space-y-0 text-left h-full">
                <AdminBentoRow label="Provider" value="ZOHO MAIL" />
                <AdminBentoRow label="Status" value="CONNECTED" valueClassName="text-green-400" />
                <AdminBentoRow label="Storage" value="0.0 GB" />
                <div className="mt-4 pt-2 border-t border-white/5 flex gap-2">
                  <div className="px-2 py-1 bg-white/5 border border-white/10 text-[10px] text-white/40 uppercase">
                    INBOX
                  </div>
                  <div className="px-2 py-1 bg-white/5 border border-white/10 text-[10px] text-white/40 uppercase">
                    SENT
                  </div>
                </div>
              </div>
            </AdminBentoCard>
          </div>

          {/* Settings - 1x1 */}
          <AdminBentoCard
            title="System"
            icon={<Settings className="w-4 h-4" />}
            colSpan={2}
            className="md:col-span-2"
            footer={
              <button onClick={() => setActiveTab('settings')} className="w-full text-center text-xs hover:text-white text-white/60">Configuration →</button>
            }
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-2 bg-white/5 border border-white/10">
                <span className="text-xs text-white/60">Status</span>
                <span className="text-xs text-green-400">Operational</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 border border-white/10">
                <span className="text-xs text-white/60">Database</span>
                <span className="text-xs text-green-400">Connected</span>
              </div>
            </div>
          </AdminBentoCard>
        </div>

      )}


      {/* Side Panel for User Details */}
      <SidePanel
        isOpen={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        title="User Details"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 flex items-center justify-center rounded-full">
                <User className="w-8 h-8 text-white/60" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedUser.username || 'No Username'}</h3>
                <p className="text-white/60">{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-none">
                  <div className="text-xs text-white/40 mb-1 uppercase tracking-tighter">Tier</div>
                  <div className="text-lg font-semibold text-white capitalize">{selectedUser.tier}</div>
                </div>
                <div className="p-4 bg-white/5 rounded-none">
                  <div className="text-xs text-white/40 mb-1 uppercase tracking-tighter">Status</div>
                  <div className="text-lg font-semibold text-green-400">ACTIVE</div>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-none">
                <div className="text-xs text-white/40 mb-1 uppercase tracking-tighter">Admin Status</div>
                <div className="text-lg font-semibold text-white">
                  {selectedUser.isAdmin ? 'ADMIN' : 'USER'}
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-none">
                <div className="text-xs text-white/40 mb-1 uppercase tracking-tighter">Subdomain</div>
                <div className="font-mono text-sm text-white/80">
                  {selectedUser.username || 'NONE'}
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-none">
                <div className="text-xs text-white/40 mb-1 uppercase tracking-tighter">User ID</div>
                <div className="font-mono text-xs text-white/80 break-all">{selectedUser.id}</div>
              </div>

              <div className="p-4 bg-white/5 rounded-none">
                <div className="text-xs text-white/40 mb-1 uppercase tracking-tighter">Joined Date</div>
                <div className="text-white/80 text-sm">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  success('User edit feature coming soon');
                }}
                className="flex-1 px-4 py-3 bg-white text-black font-bold hover:bg-white/90 transition rounded-none uppercase text-xs"
              >
                Edit User
              </button>
              <button
                onClick={() => {
                  if (confirm(`Ban user ${selectedUser.email}?`)) {
                    success(`User ${selectedUser.email} banned`);
                    setSidePanelOpen(false);
                  }
                }}
                className="flex-1 px-4 py-3 bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30 transition rounded-none uppercase text-xs font-bold"
              >
                Ban User
              </button>
            </div>
          </div>
        )}
      </SidePanel>

      {/* Expandable Screen for Post Details */}
      <ExpandableScreen
        isOpen={!!expandedPost}
        onOpenChange={(open) => {
          if (!open) setExpandedPost(null);
        }}
      >
        {expandedPost && (
          <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                {'subdomain' in expandedPost && expandedPost.subdomain && (
                  <span className="px-3 py-1 bg-white/10 text-white/80 border border-white/20 rounded-full text-sm">
                    {expandedPost.subdomain}
                  </span>
                )}
                <span className="text-white/60 text-sm">
                  {expandedPost.published_at
                    ? new Date(expandedPost.published_at).toLocaleDateString()
                    : new Date(expandedPost.created_at).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-6">{expandedPost.title}</h1>
              {expandedPost.excerpt && (
                <p className="text-xl text-white/70 leading-relaxed mb-8">{expandedPost.excerpt}</p>
              )}
            </div>

            <div className="prose prose-invert max-w-none">
              <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-white/60 italic">
                  Full content preview is not available in this quick view.
                  <a
                    href={'subdomain' in expandedPost
                      ? `/blog/${expandedPost.subdomain}/${expandedPost.slug}`
                      : `/thelostandunfounds/${expandedPost.slug}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline ml-1"
                  >
                    Open full article
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </ExpandableScreen>
    </div>
  );
}

