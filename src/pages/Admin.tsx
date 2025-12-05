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
  Maximize2
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
import { BentoGrid, BentoCard } from '../components/ui/bento-grid';
import { DynamicIsland } from '../components/ui/dynamic-island';
import { SidePanel } from '../components/ui/side-panel';
import { SortableList } from '../components/ui/sortable-list';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../components/ui/expandable-screen';
import { Expandable, ExpandableTrigger, ExpandableCard, ExpandableCardHeader, ExpandableCardContent, ExpandableContent, ExpandableCloseButton } from '../components/ui/expandable';
import { AnimatedNumber } from '../components/ui/animated-number';
import { cn } from '../components/ui/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [recentPosts, setRecentPosts] = useState<Array<{title: string; author: string; date: string}>>([]);
  const [newestSubscribers, setNewestSubscribers] = useState<Array<{email: string; created_at: string}>>([]);
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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'products' | 'settings' | 'blog' | 'newsletter' | 'submissions' | 'assets' | 'secret-santa' | 'affiliates' | null>(null);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState<string | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);
  
  // User management state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'free' | 'premium' | 'pro'>('all');
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admin' | 'user'>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [allUsers, setAllUsers] = useState<RecentUser[]>([]);

  // Filter and search users
  const filteredUsers = allUsers.filter(user => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Tier filter
    const matchesTier = filterTier === 'all' || user.tier === filterTier;
    
    // Admin filter
    const matchesAdmin = filterAdmin === 'all' || 
      (filterAdmin === 'admin' && user.isAdmin) ||
      (filterAdmin === 'user' && !user.isAdmin);
    
    return matchesSearch && matchesTier && matchesAdmin;
  });
  
  const sortedUsers = filteredUsers;
  const sortedBookClubPosts = bookClubPosts;
  const sortedLostArchivesPosts = lostArchivesPosts;
  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  const handleUserReorder = (newOrder: RecentUser[]) => {
    setRecentUsers(newOrder);
  };

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
      let newestSubs: Array<{email: string; created_at: string}> = [];
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

      // Calculate platform health
      const totalSubs = activeSubs.length;
      const premiumRatio = totalSubs > 0 ? (premiumCount + proCount) / totalSubs : 0;
      const platformHealth = premiumRatio > 0.3 ? 'healthy' : premiumRatio > 0.1 ? 'warning' : 'critical';

      setStats({
        totalUsers: totalUsers || subscriptions.length,
        activeSubscriptions: activeSubs.length,
        freeUsers: freeCount,
        premiumUsers: premiumCount,
        proUsers: proCount,
        totalToolUsage: toolUsage || 0,
        recentActivity: 0, // Can be enhanced with actual activity tracking
        platformHealth,
        newsletterSubscribers: newsletterCount,
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
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Admin Dashboard
          </h1>
          <p className="text-white/70">Manage your platform and users</p>
        </div>
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const renderTabContent = (tab: typeof activeTab) => {
    switch (tab) {
      case 'overview':
  return (
        <BentoGrid columns={4} gap="md">
            {/* Hero Metric Card - Dialed In Expandable Card */}
            <div style={{ gridColumn: 'span 3', gridRow: 'span 2', minHeight: '260px' }}>
              <Expandable expandDirection="vertical">
                <ExpandableCard
                  collapsedSize={{ width: '100%', height: '100%' }}
                  expandedSize={{ width: '100%', height: 'auto' }}
                  className="dark:bg-black bg-black border border-white rounded-none flex flex-col relative overflow-visible transition-all duration-300 group shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] w-full cursor-pointer hover:-translate-y-1 hover:scale-[1.02] p-6"
                  style={{ minHeight: '100%' }}
                >
                  <ExpandableTrigger>
                    <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Platform Overview
                </h2>
                          <p className="text-white/60 text-sm">Platform statistics and health</p>
              </div>
              <div className={`px-3 py-1 border text-xs ${
                stats?.platformHealth === 'healthy' ? 'bg-green-400/20 text-green-400 border-green-400/30' :
                stats?.platformHealth === 'warning' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' :
                'bg-red-400/20 text-red-400 border-red-400/30'
              }`}>
                {stats?.platformHealth === 'healthy' ? 'Healthy' :
                 stats?.platformHealth === 'warning' ? 'Warning' : 'Critical'}
              </div>
            </div>
            <div className="flex-1 flex items-end">
                        <div>
                          <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">Total Users</div>
              <div className="text-6xl font-bold text-white">
                <AnimatedNumber value={stats?.totalUsers || 0} />
              </div>
            </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
              <div>
                          <div className="text-xs text-white/60 mb-1 uppercase">Subscribers</div>
                <div className="text-xl font-bold text-white">
                  <AnimatedNumber value={stats?.activeSubscriptions || 0} />
                </div>
              </div>
              <div>
                          <div className="text-xs text-white/60 mb-1 uppercase">Tool Usage</div>
                <div className="text-xl font-bold text-white">
                  <AnimatedNumber value={stats?.totalToolUsage || 0} />
                </div>
              </div>
              <div>
                          <div className="text-xs text-white/60 mb-1 uppercase">Newsletter</div>
                          <div className="text-xl font-bold text-blue-400">
                            <AnimatedNumber value={stats?.newsletterSubscribers || 0} />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-white/60 mb-1 uppercase">Quick Stats</div>
                <div className="text-xl font-bold text-yellow-400">
                  <AnimatedNumber value={(stats?.premiumUsers || 0) + (stats?.proUsers || 0)} />
                </div>
              </div>
            </div>
                    </div>
                  </ExpandableTrigger>
                  <ExpandableContent>
                    <div 
                      className="pt-6 mt-6 border-t border-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">Quick Stats</h3>
                        <ExpandableCloseButton className="text-white/60 hover:text-white transition text-2xl leading-none">
                          ×
                        </ExpandableCloseButton>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 border border-white/10">
                          <div className="text-xs text-white/60 mb-1 uppercase">Active Subs</div>
                          <div className="text-2xl font-bold text-white">
                            <AnimatedNumber value={stats?.activeSubscriptions || 0} />
                          </div>
                        </div>
                        <div className="bg-white/5 p-4 border border-white/10">
                          <div className="text-xs text-white/60 mb-1 uppercase">Tool Usage</div>
                          <div className="text-2xl font-bold text-white">
                            <AnimatedNumber value={stats?.totalToolUsage || 0} />
                          </div>
                        </div>
                        <div className="bg-white/5 p-4 border border-white/10">
                          <div className="text-xs text-white/60 mb-1 uppercase">Premium</div>
                          <div className="text-2xl font-bold text-yellow-400">
                            <AnimatedNumber value={(stats?.premiumUsers || 0) + (stats?.proUsers || 0)} />
                          </div>
                        </div>
                        <div className="bg-white/5 p-4 border border-white/10">
                          <div className="text-xs text-white/60 mb-1 uppercase">Newsletter</div>
                          <div className="text-2xl font-bold text-blue-400">
                            <AnimatedNumber value={stats?.newsletterSubscribers || 0} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableContent>
                </ExpandableCard>
              </Expandable>
            </div>

          {/* Alerts Card - Tall (1x2) */}
          <BentoCard colSpan={1} rowSpan={2}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold text-white">Alerts</h3>
              </div>
              {unreadAlertsCount > 0 && (
                <span className="w-2 h-2 bg-yellow-400"></span>
              )}
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {alerts.length > 0 ? alerts.slice(0, 5).map(alert => (
                <div
                  key={alert.id}
                  className={`p-2 border border-white/10 ${
                    !alert.read ? 'bg-white/5' : 'bg-black/30'
                  }`}
                >
                  <div className={`text-xs mb-1 ${
                    alert.type === 'success' ? 'text-green-400' :
                    alert.type === 'warning' ? 'text-yellow-400' :
                    alert.type === 'error' ? 'text-red-400' :
                    'text-blue-400'
                  }`}>
                    {alert.type === 'success' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                    {alert.type === 'warning' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                    {alert.type === 'error' && <XCircle className="w-3 h-3 inline mr-1" />}
                    {alert.type === 'info' && <Bell className="w-3 h-3 inline mr-1" />}
                    {alert.message.substring(0, 40)}...
                  </div>
                  <div className="text-xs text-white/50">{alert.time}</div>
                </div>
              )) : (
                <div className="text-white/40 text-sm text-center py-4">No alerts</div>
              )}
            </div>
            <button
              onClick={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}
              className="mt-4 w-full px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs transition"
            >
              Mark all as read
            </button>
          </BentoCard>

          {/* Tier Breakdown - Wide (4x1) */}
          <BentoCard colSpan={4} rowSpan={1}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Subscription Tiers
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  <AnimatedNumber value={stats?.freeUsers || 0} />
                </div>
                <div className="text-sm text-white/40">Free</div>
                {stats?.totalUsers && (
                  <div className="text-xs text-white/30 mt-1">
                    {Math.round((stats.freeUsers / stats.totalUsers) * 100)}% of total
                  </div>
                )}
              </div>
              <div className="text-center border-l border-r border-white/10">
                <div className="text-3xl font-bold text-yellow-400">
                  <AnimatedNumber value={stats?.premiumUsers || 0} />
                </div>
                <div className="text-sm text-white/40">Premium</div>
                {stats?.totalUsers && (
                  <div className="text-xs text-white/30 mt-1">
                    {Math.round((stats.premiumUsers / stats.totalUsers) * 100)}% of total
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  <AnimatedNumber value={stats?.proUsers || 0} />
                </div>
                <div className="text-sm text-white/40">Pro</div>
                {stats?.totalUsers && (
                  <div className="text-xs text-white/30 mt-1">
                    {Math.round((stats.proUsers / stats.totalUsers) * 100)}% of total
                  </div>
                )}
              </div>
            </div>
          </BentoCard>

          {/* Recent Users - Full Width (4x2) */}
          <BentoCard colSpan={4} rowSpan={2}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recent Users
              </h3>
              <button
                onClick={() => setActiveTab('users')}
                className="text-white/60 hover:text-white text-sm flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                View All
              </button>
            </div>
            {sortedUsers.length > 0 ? (
              <SortableList
                items={sortedUsers}
                onReorder={(items) => handleUserReorder(items as RecentUser[])}
                renderItem={(user) => (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-white/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate">{user.username || user.email}</span>
                          {user.isAdmin && (
                            <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              ADMIN
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] border ${
                            user.tier === 'free' ? 'bg-white/5 text-white/60 border-white/10' :
                            user.tier === 'premium' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
                            'bg-purple-400/10 text-purple-400 border-purple-400/20'
                          }`}>
                            {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/40 mt-0.5">
                          <span className="font-mono">{user.email}</span>
                          {user.created_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(user as RecentUser);
                        setSidePanelOpen(true);
                      }}
                      className="p-2 hover:bg-white/10 transition rounded ml-2"
                    >
                      <Eye className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                )}
              />
            ) : (
              <div className="text-center py-12 text-white/60">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No users found</p>
              </div>
            )}
          </BentoCard>

          {/* Book Club Posts - Wide (3x1) */}
          {sortedBookClubPosts.length > 0 && (
            <BentoCard colSpan={3} rowSpan={1}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Book Club Posts
                </h3>
                <Link
                  to="/bookclub"
                  className="text-white/60 hover:text-white text-sm flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  View All
                </Link>
              </div>
              {loadingBookClubPosts ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedBookClubPosts.slice(0, 3).map((post) => (
                    <div
                      key={post.id}
                      className="p-3 border border-white/10 hover:bg-white/5 transition cursor-pointer flex justify-between items-center"
                      onClick={() => setExpandedPost(post)}
                    >
                      <div>
                        <h4 className="text-white font-bold mb-1 truncate max-w-[300px]">{post.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          {post.subdomain && (
                            <span className="px-2 py-0.5 bg-white/10 text-white/60">
                              {post.subdomain}
                            </span>
                          )}
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(post.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Eye className="w-4 h-4 text-white/40" />
                    </div>
                  ))}
                </div>
              )}
            </BentoCard>
          )}

          {/* THE LOST ARCHIVES - Tall (1x1) */}
          {sortedLostArchivesPosts.length > 0 && (
            <BentoCard colSpan={1} rowSpan={1}>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Archives
              </h3>
              <div className="text-3xl font-bold text-white mb-1">
                <AnimatedNumber value={sortedLostArchivesPosts.length} />
              </div>
              <div className="text-xs text-white/60">Published articles</div>
              <Link
                to="/thelostarchives"
                className="mt-4 inline-block text-white/60 hover:text-white text-sm flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                View All
              </Link>
            </BentoCard>
          )}
        </BentoGrid>
        );
      case 'users':
        return (
        <div className="space-y-6">
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white uppercase">
                USER MANAGEMENT
              </h2>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-none text-white text-sm transition">
                Export Users
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-none p-4">
                <div className="text-white/60 text-sm mb-1">Total Users</div>
                  <div className="text-2xl font-bold text-white">
                    {allUsers.length > 0 ? allUsers.length : (stats?.totalUsers || 0)}
                  </div>
              </div>
              <div className="bg-white/5 rounded-none p-4">
                <div className="text-white/60 text-sm mb-1">Active Users</div>
                  <div className="text-2xl font-bold text-green-400">
                    {allUsers.length > 0 ? allUsers.filter(u => u.tier !== 'inactive').length : (stats?.activeSubscriptions || 0)}
                  </div>
              </div>
              <div className="bg-white/5 rounded-none p-4">
                <div className="text-white/60 text-sm mb-1">Premium Users</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {allUsers.length > 0 
                      ? allUsers.filter(u => u.tier === 'premium' || u.tier === 'pro').length 
                      : ((stats?.premiumUsers || 0) + (stats?.proUsers || 0))}
                  </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search by email or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterTier}
                    onChange={(e) => setFilterTier(e.target.value as any)}
                    className="px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                  >
                    <option value="all">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="pro">Pro</option>
                  </select>
                  <select
                    value={filterAdmin}
                    onChange={(e) => setFilterAdmin(e.target.value as any)}
                    className="px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                  >
                    <option value="all">All Users</option>
                    <option value="admin">Admins</option>
                    <option value="user">Regular Users</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {selectedUsers.size > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-none p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white/80 text-sm">
                      {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setSelectedUsers(new Set())}
                      className="text-white/60 hover:text-white text-sm"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        success(`Bulk action performed on ${selectedUsers.size} users`);
                        setSelectedUsers(new Set());
                      }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-none text-white text-sm transition"
                    >
                      Export Selected
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Ban ${selectedUsers.size} selected users?`)) {
                          success(`Banned ${selectedUsers.size} users`);
                          setSelectedUsers(new Set());
                        }
                      }}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-none text-red-400 text-sm transition"
                    >
                      Ban Selected
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="border-t border-white/10 pt-4">
              <div className="space-y-2">
                {sortedUsers.length > 0 ? (
                  sortedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-4 bg-black/30 border border-white/10 rounded-none hover:bg-white/5 transition"
                    >
                      <button
                        onClick={() => {
                          const newSelected = new Set(selectedUsers);
                          if (newSelected.has(user.id)) {
                            newSelected.delete(user.id);
                          } else {
                            newSelected.add(user.id);
                          }
                          setSelectedUsers(newSelected);
                        }}
                        className="flex-shrink-0"
                      >
                        {selectedUsers.has(user.id) ? (
                          <CheckSquare className="w-5 h-5 text-white" />
                        ) : (
                          <Square className="w-5 h-5 text-white/40" />
                        )}
                      </button>
                      <div className="w-10 h-10 bg-white/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium truncate">{user.username || user.email}</span>
                          {user.isAdmin && (
                            <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              ADMIN
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] border ${
                            user.tier === 'free' ? 'bg-white/5 text-white/60 border-white/10' :
                            user.tier === 'premium' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
                            'bg-purple-400/10 text-purple-400 border-purple-400/20'
                          }`}>
                            {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span className="font-mono truncate">{user.email}</span>
                          {user.created_at && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <Calendar className="w-3 h-3" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setSidePanelOpen(true);
                          }}
                          className="p-2 hover:bg-white/10 transition rounded-none"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-white/60" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setSidePanelOpen(true);
                          }}
                          className="p-2 hover:bg-white/10 transition rounded-none"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4 text-white/60" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Ban user ${user.email}?`)) {
                              success(`User ${user.email} banned`);
                            }
                          }}
                          className="p-2 hover:bg-red-500/20 transition rounded-none"
                          title="Ban User"
                        >
                          <Ban className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-white/60">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No users found</p>
                    {searchQuery || filterTier !== 'all' || filterAdmin !== 'all' ? (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilterTier('all');
                          setFilterAdmin('all');
                        }}
                        className="mt-2 text-white/80 hover:text-white underline text-sm"
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      case 'subscriptions':
        return (
        <div className="space-y-6">
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Subscription Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-none p-4">
                <div className="text-white/60 text-sm mb-1">Free Tier</div>
                <div className="text-2xl font-bold text-white/60">{stats?.freeUsers || 0}</div>
                <div className="text-xs text-white/40 mt-1">
                  {stats?.totalUsers ? Math.round((stats.freeUsers / stats.totalUsers) * 100) : 0}% of total
                </div>
              </div>
              <div className="bg-white/5 rounded-none p-4 border border-yellow-400/20">
                <div className="text-white/60 text-sm mb-1">Premium Tier</div>
                <div className="text-2xl font-bold text-yellow-400">{stats?.premiumUsers || 0}</div>
                <div className="text-xs text-white/40 mt-1">
                  {stats?.totalUsers ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0}% of total
                </div>
              </div>
              <div className="bg-white/5 rounded-none p-4 border border-purple-400/20">
                <div className="text-white/60 text-sm mb-1">Pro Tier</div>
                <div className="text-2xl font-bold text-purple-400">{stats?.proUsers || 0}</div>
                <div className="text-xs text-white/40 mt-1">
                  {stats?.totalUsers ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0}% of total
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-white/60">Advanced subscription management features coming soon...</p>
              <p className="text-white/40 text-sm mt-2">Features will include: subscription analytics, upgrade/downgrade management, and billing history.</p>
            </div>
          </div>
        </div>
        );
      case 'products':
        return (
        <div className="space-y-6">
          <ErrorBoundary
            fallback={
              <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
                <p className="text-red-400">Error loading Product Cost Management. Please refresh the page.</p>
              </div>
            }
          >
            <ProductCostManagement />
          </ErrorBoundary>
        </div>
        );
      case 'blog':
        return (
        <ErrorBoundary
          fallback={
            <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
              <p className="text-red-400">Error loading Blog Management. Please refresh the page.</p>
            </div>
          }
        >
          <BlogManagement />
        </ErrorBoundary>
        );
      case 'newsletter':
        return (
        <ErrorBoundary
          fallback={
            <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
              <p className="text-red-400">Error loading Newsletter Management. Please refresh the page.</p>
            </div>
          }
        >
          <NewsletterManagement />
        </ErrorBoundary>
        );
      case 'submissions':
        return (
        <ErrorBoundary
          fallback={
            <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
              <p className="text-red-400">Error loading Article Submissions Review. Please refresh the page.</p>
            </div>
          }
        >
          <BlogSubmissionReview />
        </ErrorBoundary>
        );
      case 'settings':
        return (
        <div className="space-y-6">
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Admin Settings
            </h2>
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Platform Configuration
                </h3>
                <p className="text-white/60 text-sm mb-4">Manage platform-wide settings and policies</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                    <span className="text-white/80">Platform Status</span>
                    <span className="px-2 py-1 bg-green-400/20 text-green-400 rounded text-xs">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                    <span className="text-white/80">Database Connection</span>
                    <span className="px-2 py-1 bg-green-400/20 text-green-400 rounded text-xs">Connected</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                    <span className="text-white/80">Platform Health</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      stats?.platformHealth === 'healthy' ? 'bg-green-400/20 text-green-400' :
                      stats?.platformHealth === 'warning' ? 'bg-yellow-400/20 text-yellow-400' :
                      'bg-red-400/20 text-red-400'
                    }`}>
                      {stats?.platformHealth === 'healthy' ? 'Healthy' :
                       stats?.platformHealth === 'warning' ? 'Warning' : 'Critical'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-b border-white/10 pb-4">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Tool Management
                </h3>
                <p className="text-white/60 text-sm mb-4">Configure tool usage limits and policies</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                    <span className="text-white/80">Total Tool Usage</span>
                    <span className="text-white font-mono">{stats?.totalToolUsage || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                    <span className="text-white/80">Tool Status</span>
                    <span className="px-2 py-1 bg-green-400/20 text-green-400 rounded text-xs">Active</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  User Management
                </h3>
                <p className="text-white/60 text-sm mb-4">Advanced user management features</p>
                <p className="text-white/40 text-sm">Additional configuration options coming soon...</p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Quick Navigation
                </h3>
                <p className="text-white/60 text-sm mb-4">Access admin tools and resources</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link
                    to="/sagemode"
                    className="px-4 py-3 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/30 rounded-none text-yellow-400 font-medium transition flex items-center justify-center gap-2"
                  >
                    <span>SAGE MODE</span>
                    <span className="text-yellow-400/60">→</span>
                  </Link>
                  <Link
                    to="/designsystem"
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center justify-center gap-2"
                  >
                    <span>Design System</span>
                    <span className="text-white/60">→</span>
                  </Link>
                  <Link
                    to="/qr"
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center justify-center gap-2"
                  >
                    <span>QR Codes</span>
                    <span className="text-white/60">→</span>
                  </Link>
                  <Link
                    to="/sql"
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center justify-center gap-2"
                  >
                    <span>SQL Scripts</span>
                    <span className="text-white/60">→</span>
                  </Link>
                </div>
              </div>
            </div>
            </div>
          </div>
        );
      case 'affiliates':
        return (
          <ErrorBoundary
            fallback={
              <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
                <p className="text-red-400">Error loading Affiliate Management. Please refresh the page.</p>
              </div>
            }
          >
            <div className="space-y-6">
            <AffiliateAdminView />
              <AffiliateEmailComposer />
            </div>
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      {/* Admin Section Cards - Bento Style Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8 auto-rows-fr">
        {([
          { 
            id: 'overview', 
            label: 'Overview', 
            icon: BarChart3, 
            description: 'Platform statistics and health',
            preview: () => (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-white/5 rounded-none p-2.5 border border-white/10 flex flex-col justify-between min-h-[60px]">
                  <div className="text-[10px] text-white/60 mb-1.5 uppercase tracking-wider font-medium">Total Users</div>
                  <div className="text-2xl font-bold text-white leading-none">
                    <AnimatedNumber value={stats?.totalUsers || 0} />
                  </div>
                </div>
                <div className="bg-white/5 rounded-none p-2.5 border border-white/10 flex flex-col justify-between min-h-[60px]">
                  <div className="text-[10px] text-white/60 mb-1.5 uppercase tracking-wider font-medium">Subscribers</div>
                  <div className="text-2xl font-bold text-white leading-none">
                    <AnimatedNumber value={stats?.activeSubscriptions || 0} />
                  </div>
                </div>
                <div className="bg-white/5 rounded-none p-2.5 border border-white/10 flex flex-col justify-between min-h-[60px]">
                  <div className="text-[10px] text-white/60 mb-1.5 uppercase tracking-wider font-medium">Newsletter</div>
                  <div className="text-2xl font-bold text-white leading-none">
                    <AnimatedNumber value={stats?.newsletterSubscribers || 0} />
                  </div>
                </div>
                <div className="bg-white/5 rounded-none p-2.5 border border-white/10 flex flex-col justify-between min-h-[60px]">
                  <div className="text-[10px] text-white/60 mb-1.5 uppercase tracking-wider font-medium">Tool Usage</div>
                  <div className="text-2xl font-bold text-white leading-none">
                    <AnimatedNumber value={stats?.totalToolUsage || 0} />
                  </div>
                </div>
              </div>
            )
          },
          { 
            id: 'users', 
            label: 'Users', 
            icon: Users, 
            description: 'Manage user accounts and permissions',
            preview: () => {
              // Use live data from allUsers if available, otherwise fall back to stats
              const totalUsersCount = allUsers.length > 0 ? allUsers.length : (stats?.totalUsers || 0);
              const freeCount = allUsers.length > 0 ? allUsers.filter(u => u.tier === 'free').length : (stats?.freeUsers || 0);
              const premiumCount = allUsers.length > 0 ? allUsers.filter(u => u.tier === 'premium').length : (stats?.premiumUsers || 0);
              const proCount = allUsers.length > 0 ? allUsers.filter(u => u.tier === 'pro').length : (stats?.proUsers || 0);
              
              return (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 truncate">Total Users</span>
                    <span className="text-white font-semibold ml-2">{totalUsersCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 truncate">Free Tier</span>
                    <span className="text-white font-semibold ml-2">{freeCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 truncate">Premium</span>
                    <span className="text-yellow-400 font-semibold ml-2">{premiumCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 truncate">Pro</span>
                    <span className="text-purple-400 font-semibold ml-2">{proCount}</span>
                  </div>
                </div>
              );
            }
          },
          { 
            id: 'subscriptions', 
            label: 'Subscriptions', 
            icon: DollarSign, 
            description: 'View and manage subscriptions',
            preview: () => (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 truncate">Active</span>
                  <span className="text-green-400 font-semibold ml-2">{stats?.activeSubscriptions || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 truncate">Free</span>
                  <span className="text-white font-semibold ml-2">{stats?.freeUsers || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 truncate">Premium</span>
                  <span className="text-yellow-400 font-semibold ml-2">{stats?.premiumUsers || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 truncate">Pro</span>
                  <span className="text-purple-400 font-semibold ml-2">{stats?.proUsers || 0}</span>
                </div>
              </div>
            )
          },
          { 
            id: 'products', 
            label: 'Products', 
            icon: Package, 
            description: 'Manage product catalog and costs',
            preview: () => (
              <div className="mt-3 text-xs text-white/60 line-clamp-2">
                Click to manage product catalog, pricing, and cost analysis
              </div>
            )
          },
          { 
            id: 'blog', 
            label: 'Blog', 
            icon: BookOpen, 
            description: 'Manage blog posts and content',
            preview: () => (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-white/60 truncate">Registered Writers</span>
                  <span className="text-white font-semibold ml-2">{registeredWriters}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 truncate">Book Club</span>
                    <span className="text-white font-semibold ml-1">{bookClubPosts.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 truncate">Lost Archives</span>
                    <span className="text-white font-semibold ml-1">{lostArchivesPosts.length}</span>
                  </div>
                </div>
                {recentPosts.length > 0 && (
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1.5">Recent Posts</div>
                    <div className="space-y-1">
                      {recentPosts.slice(0, 2).map((post, idx) => (
                        <div key={idx} className="text-[10px] text-white/70 truncate" title={post.title}>
                          <span className="text-white/50">{post.author}:</span> {post.title}
                        </div>
                      ))}
          </div>
        </div>
      )}
              </div>
            )
          },
          { 
            id: 'newsletter', 
            label: 'Newsletter', 
            icon: Mail, 
            description: 'Create and send newsletters',
            preview: () => (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 truncate">Subscribers</span>
                  <span className="text-white font-semibold ml-2">{stats?.newsletterSubscribers || 0}</span>
                </div>
                <div className="text-[10px] text-white/40 mt-1 line-clamp-1">
                  Click to create and manage campaigns
                </div>
              </div>
            )
          },
          { 
            id: 'submissions', 
            label: 'Submissions', 
            icon: FileText, 
            description: 'Review blog submissions',
            preview: () => (
              <div className="mt-3 text-xs text-white/60 line-clamp-2">
                Review and approve pending blog submissions
              </div>
            )
          },
          { 
            id: 'settings', 
            label: 'Settings', 
            icon: Settings, 
            description: 'Platform configuration',
            preview: () => (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 truncate">Platform Health</span>
                  <span className={cn(
                    "font-semibold ml-2",
                    stats?.platformHealth === 'healthy' ? "text-green-400" :
                    stats?.platformHealth === 'warning' ? "text-yellow-400" : "text-red-400"
                  )}>
                    {stats?.platformHealth === 'healthy' ? 'Healthy' :
                     stats?.platformHealth === 'warning' ? 'Warning' : 'Critical'}
                  </span>
                </div>
              </div>
            )
          },
          { 
            id: 'affiliates', 
            label: 'Affiliates', 
            icon: TrendingUp, 
            description: 'Manage affiliate program',
            preview: () => (
              <div className="mt-3 text-xs text-white/60 line-clamp-2">
                Manage affiliates, commissions, and payouts
              </div>
            )
          },
        ] as const).map((section, index) => {
          const Icon = section.icon;
          // Bento grid layout - Overview gets 2 columns, others get 1
          const colSpan = section.id === 'overview' ? 'md:col-span-2 lg:col-span-2' : '';
          // Remove row-span to prevent large gaps
          
          return (
            <div key={section.id} className={cn(colSpan)}>
              <Expandable
                expanded={activeTab === section.id}
                onToggle={() => {
                  const newActiveTab = activeTab === section.id ? null : section.id as typeof activeTab;
                  setActiveTab(newActiveTab);
                  // Close drawer when expanding card
                  if (newActiveTab) {
                    setShowDrawer(null);
                  }
                  // Refresh data when opening a card to ensure live data
                  if (newActiveTab && adminStatus === true) {
                    loadDashboardData(); // This refreshes all stats including users
                    if (newActiveTab === 'blog') {
                      loadBlogStats();
                      loadBookClubPosts();
                      loadLostArchivesPosts();
                    }
                  }
                }}
                expandDirection="both"
                expandBehavior="replace"
              >
                {({ isExpanded }) => (
                  <>
                    {activeTab === section.id && (
                      <div 
                        className="fixed inset-0 bg-black/80 z-40"
                        onClick={() => setActiveTab(null)}
                      />
                    )}
                    <ExpandableTrigger>
                      <ExpandableCard
                className={cn(
                          "dark:bg-black bg-black border border-white rounded-none h-full flex flex-col relative overflow-hidden transition-all duration-300 group",
                          "shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]",
                          activeTab === section.id 
                            ? "fixed inset-0 z-50 !w-screen !h-screen m-0 cursor-default hover:translate-y-0 hover:scale-100 shadow-[0_0_40px_rgba(255,255,255,0.2)]" 
                            : "w-full hover:-translate-y-1 hover:scale-[1.02]"
                        )}
                        collapsedSize={{ width: '100%', height: section.id === 'overview' ? 260 : 240 }}
                        expandedSize={{ 
                          width: activeTab === section.id ? '100vw' : '100%', 
                          height: activeTab === section.id ? '100vh' : 600 
                        }}
                        hoverToExpand={false}
                        expandDelay={200}
                        collapseDelay={300}
                      >
                    <ExpandableCardHeader 
                      className={cn(
                        "px-4 pt-3 pb-0",
                        section.id === 'overview' && "pb-0",
                        activeTab === section.id && "border-b border-white/10"
                      )}
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        // Allow header click to collapse when expanded (except on close button)
                        if (activeTab === section.id && !(e.target as HTMLElement).closest('button')) {
                          setActiveTab(null);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "p-2 rounded-full border-2 flex-shrink-0",
                            activeTab === section.id 
                              ? "bg-white text-black border-white" 
                              : "bg-black/50 text-white border-white/20"
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1 text-white truncate">
                              {section.label}
                            </h3>
                            <p className="text-sm text-white/60 line-clamp-1">
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isExpanded && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab(section.id as typeof activeTab);
                              }}
                              className="p-1 hover:bg-white/10 rounded-none transition"
                              type="button"
                              aria-label="Expand"
                            >
                              <Maximize2 className="w-4 h-4 text-white/40" />
                            </button>
                          )}
                          {activeTab === section.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab(null);
                              }}
                              className="p-2 hover:bg-white/10 rounded-none transition text-white/60 hover:text-white"
                              aria-label="Close"
                              type="button"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          )}
                          {isExpanded && activeTab !== section.id && (
                            <ExpandableCloseButton className="p-2 hover:bg-white/10 rounded-none transition text-white/60 hover:text-white">
                              <XCircle className="w-5 h-5" />
                            </ExpandableCloseButton>
                          )}
        </div>
        </div>
                    </ExpandableCardHeader>
                    <ExpandableCardContent 
                      className={cn(
                        "px-4 pt-0 pb-4 relative",
                        section.id === 'overview' && "pb-3",
                        !isExpanded && "pb-[140px]", // Add bottom padding to prevent drawer from covering content (40px drawer + 100px spacing)
                        !isExpanded && showDrawer === section.id && "pb-[190px]", // Extra padding when drawer is open (87px drawer + 103px spacing)
                        activeTab === section.id && "overflow-y-auto h-[calc(100vh-120px)] pb-4"
                      )}
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        if (activeTab === section.id) {
                          e.stopPropagation();
                        }
                        // Close drawer when clicking on card content (but not on the drawer itself)
                        const drawerToast = (e.target as HTMLElement).closest('.drawer-toast');
                        const drawerHeader = (e.target as HTMLElement).closest('.drawer-header');
                        const drawerContent = (e.target as HTMLElement).closest('.drawer-content');
                        
                        // If clicking anywhere in the drawer toast area, don't close
                        if (drawerToast || drawerHeader || drawerContent) {
                          return;
                        }
                        
                        // Only close drawer if clicking outside the drawer
                        if (!isExpanded && showDrawer === section.id) {
                          setShowDrawer(null);
                        }
                      }}
                    >
                      {!isExpanded && section.preview && (
                        <div className={cn(
                          "mt-0 relative z-10",
                          section.id === 'overview' && "mt-0"
                        )}>
                          {section.preview()}
                        </div>
                      )}
                      
                      <ExpandableContent preset="fade">
                        <div className={cn(
                          activeTab === section.id ? "mt-0" : "mt-0",
                          !isExpanded && "mb-[140px]", // Add margin-bottom to ensure content is above drawer
                          !isExpanded && showDrawer === section.id && "mb-[190px]" // Extra margin when drawer is open
                        )}>
                          {renderTabContent(section.id as typeof activeTab)}
                        </div>
                      </ExpandableContent>
                    </ExpandableCardContent>
                    
                    {/* Drawer Prompt - Toast-style pop-up - Always Visible - Positioned relative to card */}
                    {!isExpanded && (
                      <motion.div 
                        className="drawer-toast absolute bottom-0 left-0 right-0 bg-black/98 border-t border-white/30 shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-lg flex flex-col z-[100] overflow-hidden"
                        style={{ 
                          pointerEvents: 'auto'
                        }}
                        initial={{ maxHeight: "40px" }}
                        animate={{ 
                          maxHeight: showDrawer === section.id ? "87px" : "40px" // 1/3 of 260px card height
                        }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 30,
                            duration: 0.3
                          }}
                          onClick={(e) => {
                            // Always stop propagation to prevent card content handlers from firing
                            e.stopPropagation();
                            e.preventDefault();
                            if (e.nativeEvent) {
                              e.nativeEvent.stopImmediatePropagation();
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (e.nativeEvent) {
                              e.nativeEvent.stopImmediatePropagation();
                            }
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (e.nativeEvent) {
                              e.nativeEvent.stopImmediatePropagation();
                            }
                          }}
                        >
                          {/* Toast Header - Always Visible */}
                          <div 
                            className={cn(
                              "drawer-header flex items-center justify-between p-2.5 flex-shrink-0 bg-white cursor-pointer",
                              showDrawer === section.id && "border-b border-black/20"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              // Stop all event propagation including native handlers
                              if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                              }
                              // Toggle drawer when clicking header - open if closed, close if open
                              const currentDrawer = showDrawer === section.id ? null : section.id;
                              setShowDrawer(currentDrawer);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                              }
                            }}
                            onMouseUp={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                              <span className="text-[10px] text-black font-semibold uppercase tracking-wider">Quick Stats</span>
                            </div>
                            {showDrawer === section.id && (
                              <div className="flex items-center gap-1">
                                {section.id === 'overview' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('overview');
                                      setShowDrawer(null);
                                    }}
                                    className="px-2 py-0.5 text-[9px] bg-white text-black hover:bg-white/90 rounded-none transition font-medium"
                                  >
                                    View Full
                                  </button>
                                )}
                                {section.id === 'users' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab('users');
                                        setShowDrawer(null);
                                      }}
                                      className="px-2 py-0.5 text-[9px] bg-white text-black hover:bg-white/90 rounded-none transition font-medium"
                                    >
                                      View All
                                    </button>
                                  </>
                                )}
                                {section.id === 'subscriptions' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('subscriptions');
                                      setShowDrawer(null);
                                    }}
                                    className="px-2 py-0.5 text-[9px] bg-white text-black hover:bg-white/90 rounded-none transition font-medium"
                                  >
                                    Manage
                                  </button>
                                )}
                                {section.id === 'products' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('products');
                                      setShowDrawer(null);
                                    }}
                                    className="px-2 py-0.5 text-[9px] bg-white text-black hover:bg-white/90 rounded-none transition font-medium"
                                  >
                                    Manage
                                  </button>
                                )}
                                {section.id === 'blog' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab('blog');
                                        setShowDrawer(null);
                                      }}
                                      className="px-2 py-0.5 text-[9px] bg-white text-black hover:bg-white/90 rounded-none transition font-medium"
                                    >
                                      Manage
                                    </button>
                                  </>
                                )}
                                {section.id === 'newsletter' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab('newsletter');
                                        setShowDrawer(null);
                                      }}
                                      className="px-2 py-0.5 text-[9px] bg-white text-black hover:bg-white/90 rounded-none transition font-medium"
                                    >
                                      Campaigns
                                    </button>
                                  </>
                                )}
                                {section.id === 'submissions' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('submissions');
                                      setShowDrawer(null);
                                    }}
                                    className="px-2 py-0.5 text-[9px] bg-white text-black hover:bg-white/90 rounded-none transition font-medium"
                                  >
                                    Review
                                  </button>
                                )}
                                {section.id === 'settings' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('settings');
                                      setShowDrawer(null);
                                    }}
                                    className="px-2 py-0.5 text-[9px] bg-white text-black hover:bg-white/90 rounded-none transition font-medium"
                                  >
                                    Configure
                                  </button>
                                )}
                                {section.id === 'affiliates' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab('affiliates');
                                        setShowDrawer(null);
                                      }}
                                      className="px-2 py-0.5 text-[9px] bg-white text-black hover:bg-white/90 rounded-none transition font-medium"
                                    >
                                      Dashboard
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Toast Content - Only visible when expanded */}
                          {showDrawer === section.id && (
                          <div 
                            className="drawer-content p-3 overflow-y-auto max-h-[260px] min-h-[100px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                              }
                              // Don't close drawer when clicking content
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                              }
                            }}
                            onMouseUp={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                              }
                            }}
                          >
                            <div className="space-y-0 text-[11px]">
                            {section.id === 'overview' && (
                              <>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Platform Health</span>
                                  <span className={cn(
                                    "font-semibold",
                                    stats?.platformHealth === 'healthy' ? "text-green-400" :
                                    stats?.platformHealth === 'warning' ? "text-yellow-400" : "text-red-400"
                                  )}>
                                    {stats?.platformHealth === 'healthy' ? '✓ Healthy' :
                                     stats?.platformHealth === 'warning' ? '⚠ Warning' : '✗ Critical'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Active Subs</span>
                                  <span className="text-white font-semibold">{stats?.activeSubscriptions || 0}</span>
                                </div>
                              </>
                            )}
                            {section.id === 'users' && (
                              <>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">New Today</span>
                                  <span className="text-white font-semibold">
                                    {recentUsers.filter(u => {
                                      const created = new Date(u.created_at);
                                      const today = new Date();
                                      return created.toDateString() === today.toDateString();
                                    }).length}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Admins</span>
                                  <span className="text-purple-400 font-semibold">
                                    {recentUsers.filter(u => u.isAdmin).length}
                                  </span>
                                </div>
                              </>
                            )}
                            {section.id === 'subscriptions' && (
                              <>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Active</span>
                                  <span className="text-green-400 font-semibold">{stats?.activeSubscriptions || 0}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Premium+</span>
                                  <span className="text-yellow-400 font-semibold">
                                    {(stats?.premiumUsers || 0) + (stats?.proUsers || 0)}
                                  </span>
                                </div>
                              </>
                            )}
                            {section.id === 'blog' && (
                              <>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Writers</span>
                                  <span className="text-white font-semibold">{registeredWriters}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Recent Posts</span>
                                  <span className="text-white font-semibold">{recentPosts.length}</span>
                                </div>
                              </>
                            )}
                            {section.id === 'newsletter' && (
                              <>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Subscribers</span>
                                  <span className="text-white font-semibold">{stats?.newsletterSubscribers || 0}</span>
                                </div>
                                <div className="space-y-1.5 pt-2">
                                  {newestSubscribers.length > 0 ? (
                                    newestSubscribers.map((sub, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-[10px] py-1 border-b border-white/5">
                                        <span className="text-white/70 truncate flex-1 mr-2">{sub.email}</span>
                                        <span className="text-white/40 text-[9px]">
                                          {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-white/40 text-[10px] py-1">No recent subscribers</div>
                                  )}
                                </div>
                              </>
                            )}
                            {section.id === 'submissions' && (
                              <>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Pending</span>
                                  <span className="text-yellow-400 font-semibold">
                                    {alerts.filter(a => a.message.includes('submission')).length || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Review Needed</span>
                                  <span className="text-red-400 font-semibold">!</span>
                                </div>
                              </>
                            )}
                            {section.id === 'affiliates' && (
                              <>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Total Affiliates</span>
                                  <span className="text-white font-semibold">{affiliateStats?.totalAffiliates || 0}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Active</span>
                                  <span className="text-green-400 font-semibold">{affiliateStats?.activeAffiliates || 0}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Total Earnings</span>
                                  <span className="text-yellow-400 font-semibold">
                                    ${(affiliateStats?.totalEarnings || 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Clicks</span>
                                  <span className="text-white font-semibold">{affiliateStats?.totalClicks || 0}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Conversions</span>
                                  <span className="text-white font-semibold">{affiliateStats?.totalConversions || 0}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Conv. Rate</span>
                                  <span className={cn(
                                    "font-semibold",
                                    (affiliateStats?.conversionRate || 0) > 5 ? "text-green-400" :
                                    (affiliateStats?.conversionRate || 0) > 2 ? "text-yellow-400" : "text-red-400"
                                  )}>
                                    {(affiliateStats?.conversionRate || 0).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/10">
                                  <span className="text-white/70">Pending Payouts</span>
                                  <span className="text-yellow-400 font-semibold">{affiliateStats?.pendingPayouts || 0}</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                  <span className="text-white/70">MLM Earnings</span>
                                  <span className="text-purple-400 font-semibold">
                                    ${(affiliateStats?.totalMLMEarnings || 0).toFixed(2)}
                                  </span>
                                </div>
                              </>
                            )}
                            {(section.id === 'products' || section.id === 'settings') && (
                              <>
                                <div className="flex items-center justify-between py-2">
                                  <span className="text-white/70">Click to manage</span>
                                  <span className="text-white font-semibold">→</span>
                                </div>
                              </>
                            )}
                            </div>
                            
                            {/* Quick Action Buttons */}
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                              {section.id === 'overview' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('overview');
                                    setShowDrawer(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition font-medium"
                                >
                                  View Full Dashboard
                                </button>
                              )}
                              {section.id === 'users' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('users');
                                      setShowDrawer(null);
                                    }}
                                    className="flex-1 px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition font-medium"
                                  >
                                    Manage Users
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // TODO: Export users functionality
                                    }}
                                    className="px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition"
                                  >
                                    Export
                                  </button>
                                </>
                              )}
                              {section.id === 'subscriptions' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('subscriptions');
                                    setShowDrawer(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition font-medium"
                                >
                                  Manage Subscriptions
                                </button>
                              )}
                              {section.id === 'products' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('products');
                                    setShowDrawer(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition font-medium"
                                >
                                  Manage Products
                                </button>
                              )}
                              {section.id === 'blog' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('blog');
                                      setShowDrawer(null);
                                    }}
                                    className="flex-1 px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition font-medium"
                                  >
                                    Manage Blog
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open('/blog/new', '_blank');
                                    }}
                                    className="px-3 py-1.5 text-[10px] bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-none transition border border-green-500/30"
                                  >
                                    New Post
                                  </button>
                                </>
                              )}
                              {section.id === 'newsletter' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('newsletter');
                                      setShowDrawer(null);
                                    }}
                                    className="flex-1 px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition font-medium"
                                  >
                                    Manage Campaigns
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('newsletter');
                                      setShowDrawer(null);
                                      // Scroll to new campaign button
                                      setTimeout(() => {
                                        const newCampaignBtn = document.querySelector('[data-new-campaign]');
                                        newCampaignBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }, 100);
                                    }}
                                    className="px-3 py-1.5 text-[10px] bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-none transition border border-green-500/30"
                                  >
                                    New Campaign
                                  </button>
                                </>
                              )}
                              {section.id === 'submissions' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('submissions');
                                    setShowDrawer(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition font-medium"
                                >
                                  Review Submissions
                                </button>
                              )}
                              {section.id === 'settings' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('settings');
                                    setShowDrawer(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition font-medium"
                                >
                                  Open Settings
                                </button>
                              )}
                              {section.id === 'affiliates' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('affiliates');
                                      setShowDrawer(null);
                                    }}
                                    className="flex-1 px-3 py-1.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/90 rounded-none transition font-medium"
                                  >
                                    View Dashboard
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab('affiliates');
                                      setShowDrawer(null);
                                      // Scroll to payouts section
                                      setTimeout(() => {
                                        const payoutsSection = document.querySelector('[data-payouts-section]');
                                        payoutsSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }, 100);
                                    }}
                                    className="px-3 py-1.5 text-[10px] bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-none transition border border-yellow-500/30"
                                  >
                                    Payouts
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          )}
                        </motion.div>
                      )}
                    </ExpandableCard>
                </ExpandableTrigger>
                </>
              )}
            </Expandable>
            </div>
          );
        })}
      </div>

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
                <div className="p-4 bg-white/5 rounded">
                  <div className="text-xs text-white/40 mb-1">Tier</div>
                  <div className="text-lg font-semibold text-white capitalize">{selectedUser.tier}</div>
                </div>
                <div className="p-4 bg-white/5 rounded">
                  <div className="text-xs text-white/40 mb-1">Status</div>
                  <div className="text-lg font-semibold text-green-400">Active</div>
                </div>
              </div>
              
              <div className="p-4 bg-white/5 rounded">
                <div className="text-xs text-white/40 mb-1">User ID</div>
                <div className="font-mono text-sm text-white/80">{selectedUser.id}</div>
              </div>

              <div className="p-4 bg-white/5 rounded">
                <div className="text-xs text-white/40 mb-1">Joined Date</div>
                <div className="text-white/80">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-none">
                  <div className="text-xs text-white/40 mb-1">Admin Status</div>
                  <div className="text-lg font-semibold text-white">
                    {selectedUser.isAdmin ? 'Admin' : 'User'}
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-none">
                  <div className="text-xs text-white/40 mb-1">Account Status</div>
                  <div className="text-lg font-semibold text-green-400">Active</div>
                </div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-none">
                <div className="text-xs text-white/40 mb-1">Subdomain</div>
                <div className="font-mono text-sm text-white/80">
                  {selectedUser.username || 'None'}
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-none">
                <div className="text-xs text-white/40 mb-1">User ID</div>
                <div className="font-mono text-sm text-white/80 break-all">{selectedUser.id}</div>
              </div>

              <div className="p-4 bg-white/5 rounded-none">
                <div className="text-xs text-white/40 mb-1">Joined Date</div>
                <div className="text-white/80">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button 
                onClick={() => {
                  success('User edit feature coming soon');
                }}
                className="flex-1 px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition rounded-none"
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
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition rounded-none"
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

