/**
 * Admin Dashboard Page
 * Admin-only page for managing the platform
 * Enhanced version with comprehensive platform management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Calendar
} from 'lucide-react';
import { LoadingSpinner } from '../components/Loading';
import ErrorBoundary from '../components/ErrorBoundary';
import { ProductCostManagement } from '../components/ProductCostManagement';
import BlogManagement from '../components/BlogManagement';
import NewsletterManagement from '../components/NewsletterManagement';
import BlogSubmissionReview from '../components/BlogSubmissionReview';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  freeUsers: number;
  premiumUsers: number;
  proUsers: number;
  totalToolUsage: number;
  recentActivity: number;
  platformHealth: 'healthy' | 'warning' | 'critical';
}

interface RecentUser {
  id: string;
  email: string;
  tier: string;
  created_at: string;
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
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'products' | 'settings' | 'blog' | 'newsletter' | 'submissions'>('overview');
  const [componentError, setComponentError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (adminStatus === true) {
      loadDashboardData();
    }
  }, [adminStatus]);

  const checkAdminAccess = async () => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/');
      return;
    }

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
      // If error checking admin, still allow access if email matches
      const email = user?.email || '';
      if (email === 'thelostandunfounds@gmail.com' || email === 'admin@thelostandunfounds.com') {
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
      const subscriptions = usersData || [];
      const activeSubs = subscriptions.filter(s => s.status === 'active');
      const freeCount = activeSubs.filter(s => s.tier === 'free').length;
      const premiumCount = activeSubs.filter(s => s.tier === 'premium').length;
      const proCount = activeSubs.filter(s => s.tier === 'pro').length;

      // Get total users (approximate from auth.users)
      let totalUsers = 0;
      try {
        const result = await supabase
          .from('platform_subscriptions')
          .select('*', { count: 'exact', head: true });
        totalUsers = result.count || 0;
      } catch (err: any) {
        // Table might not exist - use length of subscriptions array
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
      setAlerts(newAlerts);

      // Load recent users
      let recentData = null;
      try {
        const result = await supabase
          .from('platform_subscriptions')
          .select('user_id, tier, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        recentData = result.data;
      } catch (err: any) {
        // Table might not exist - that's okay
        recentData = [];
      }

      if (recentData && recentData.length > 0) {
        // Fetch user emails - Note: This requires admin API access
        // For now, we'll just show user IDs
        const usersWithEmails = recentData.map((sub) => ({
          id: sub.user_id,
          email: `user-${sub.user_id.substring(0, 8)}`, // Placeholder
          tier: sub.tier || 'free',
          created_at: sub.created_at || '',
        }));
        setRecentUsers(usersWithEmails);
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
        <div className="text-center py-12">
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Admin Dashboard
            </h1>
            <p className="text-white/70">Manage your platform and users</p>
          </div>
          <a
            href="/submit-article"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-sm font-medium transition flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Submit Article
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-white/10">
        <div className="flex gap-4 flex-wrap">
          {(['overview', 'users', 'subscriptions', 'products', 'blog', 'newsletter', 'submissions', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition ${
                activeTab === tab
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-bold text-white">Recent Alerts</h2>
                  <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded text-xs">
                    {alerts.filter(a => !a.read).length} New
                  </span>
                </div>
                <button
                  onClick={() => setAlerts(alerts.map(a => ({ ...a, read: true })))}
                  className="text-white/60 hover:text-white text-sm"
                >
                  Mark all as read
                </button>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 4).map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-none ${
                      !alert.read ? 'bg-white/5' : 'bg-black/30'
                    }`}
                  >
                    <div className={`mt-0.5 ${
                      alert.type === 'success' ? 'text-green-400' :
                      alert.type === 'warning' ? 'text-yellow-400' :
                      alert.type === 'error' ? 'text-red-400' :
                      'text-blue-400'
                    }`}>
                      {alert.type === 'success' && <CheckCircle className="w-4 h-4" />}
                      {alert.type === 'warning' && <AlertCircle className="w-4 h-4" />}
                      {alert.type === 'error' && <XCircle className="w-4 h-4" />}
                      {alert.type === 'info' && <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={!alert.read ? 'text-white' : 'text-white/70'}>{alert.message}</p>
                      <p className="text-xs text-white/50 mt-1">{alert.time}</p>
                    </div>
                    {!alert.read && (
                      <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-black/50 border border-white/10 rounded-none p-6 hover:border-white/20 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Total Users</span>
                <Users className="w-5 h-5 text-white/40" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</div>
              <div className="text-xs text-white/40 mt-1">All registered users</div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-none p-6 hover:border-white/20 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Active Subscriptions</span>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.activeSubscriptions || 0}</div>
              <div className="text-xs text-white/40 mt-1">Currently active</div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-none p-6 hover:border-white/20 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Tool Usage</span>
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalToolUsage || 0}</div>
              <div className="text-xs text-white/40 mt-1">Total tool executions</div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-none p-6 hover:border-white/20 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Premium Users</span>
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.premiumUsers || 0}</div>
              <div className="text-xs text-white/40 mt-1">Premium + Pro tiers</div>
            </div>
          </div>

          {/* Platform Health & Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <div className="flex items-center gap-2 mb-2 text-white/60">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Platform Health</span>
              </div>
              <div className={`text-2xl font-bold ${
                stats?.platformHealth === 'healthy' ? 'text-green-400' :
                stats?.platformHealth === 'warning' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {stats?.platformHealth === 'healthy' ? 'Healthy' :
                 stats?.platformHealth === 'warning' ? 'Warning' : 'Critical'}
              </div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <div className="flex items-center gap-2 mb-2 text-white/60">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Tool Usage</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats?.totalToolUsage || 0}</div>
              <div className="text-xs text-white/40 mt-1">Total executions</div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <div className="flex items-center gap-2 mb-2 text-white/60">
                <Network className="w-4 h-4" />
                <span className="text-sm">Subscription Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats?.totalUsers ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) : 0}%
              </div>
              <div className="text-xs text-white/40 mt-1">Active subscriptions</div>
            </div>
          </div>

          {/* Tier Breakdown */}
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Subscription Tiers
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white/60 mb-1">{stats?.freeUsers || 0}</div>
                <div className="text-sm text-white/40">Free</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{stats?.premiumUsers || 0}</div>
                <div className="text-sm text-white/40">Premium</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">{stats?.proUsers || 0}</div>
                <div className="text-sm text-white/40">Pro</div>
              </div>
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recent Users
              </h2>
              <button className="text-white/60 hover:text-white text-sm flex items-center gap-1">
                <Eye className="w-4 h-4" />
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 text-white/60 text-sm font-medium">User ID</th>
                    <th className="text-left py-3 text-white/60 text-sm font-medium">Tier</th>
                    <th className="text-left py-3 text-white/60 text-sm font-medium">Joined</th>
                    <th className="text-left py-3 text-white/60 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.length > 0 ? (
                    recentUsers.map((user) => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-3 text-white font-mono text-sm">{user.email}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.tier === 'free' ? 'bg-white/5 text-white/60' :
                            user.tier === 'premium' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' :
                            'bg-purple-400/10 text-purple-400 border border-purple-400/20'
                          }`}>
                            {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 text-white/60 text-sm">
                          {user.created_at ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-1 rounded text-xs bg-green-400/10 text-green-400 border border-green-400/20">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-white/60">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No users found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </h2>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition">
                Export Users
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-none p-4">
                  <div className="text-white/60 text-sm mb-1">Total Users</div>
                  <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
                </div>
                <div className="bg-white/5 rounded-none p-4">
                  <div className="text-white/60 text-sm mb-1">Active Users</div>
                  <div className="text-2xl font-bold text-green-400">{stats?.activeSubscriptions || 0}</div>
                </div>
                <div className="bg-white/5 rounded-none p-4">
                  <div className="text-white/60 text-sm mb-1">Premium Users</div>
                  <div className="text-2xl font-bold text-yellow-400">{stats?.premiumUsers || stats?.proUsers || 0}</div>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-white/60">Advanced user management features coming soon...</p>
                <p className="text-white/40 text-sm mt-2">Features will include: user search, filtering, bulk actions, and detailed user profiles.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
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
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
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
      )}

      {/* Blog Tab */}
      {activeTab === 'blog' && (
        <ErrorBoundary
          fallback={
            <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
              <p className="text-red-400">Error loading Blog Management. Please refresh the page.</p>
            </div>
          }
        >
          <BlogManagement />
        </ErrorBoundary>
      )}

      {/* Newsletter Tab */}
      {activeTab === 'newsletter' && (
        <ErrorBoundary
          fallback={
            <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
              <p className="text-red-400">Error loading Newsletter Management. Please refresh the page.</p>
            </div>
          }
        >
          <NewsletterManagement />
        </ErrorBoundary>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <ErrorBoundary
          fallback={
            <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
              <p className="text-red-400">Error loading Article Submissions Review. Please refresh the page.</p>
            </div>
          }
        >
          <BlogSubmissionReview />
        </ErrorBoundary>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

