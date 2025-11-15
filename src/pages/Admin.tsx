/**
 * Admin Dashboard Page
 * Admin-only page for managing the platform
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
  Loader
} from 'lucide-react';
import { LoadingSpinner } from '../components/Loading';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  freeUsers: number;
  premiumUsers: number;
  proUsers: number;
  totalToolUsage: number;
}

interface RecentUser {
  id: string;
  email: string;
  tier: string;
  created_at: string;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'settings'>('overview');

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

    const admin = await isAdmin();
    setAdminStatus(admin);
    setLoading(false);

    if (!admin) {
      showError('Access denied. Admin privileges required.');
      navigate('/');
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load user stats
      const { data: usersData, error: usersError } = await supabase
        .from('platform_subscriptions')
        .select('user_id, tier, status')
        .catch(() => ({ data: null, error: null }));

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
      const { count: totalUsers } = await supabase
        .from('platform_subscriptions')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: 0 })) as { count: number | null };

      // Get tool usage stats
      const { count: toolUsage } = await supabase
        .from('tool_usage')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: 0 })) as { count: number | null };

      setStats({
        totalUsers: totalUsers || subscriptions.length,
        activeSubscriptions: activeSubs.length,
        freeUsers: freeCount,
        premiumUsers: premiumCount,
        proUsers: proCount,
        totalToolUsage: toolUsage || 0,
      });

      // Load recent users
      const { data: recentData } = await supabase
        .from('platform_subscriptions')
        .select('user_id, tier, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
        .catch(() => ({ data: [] })) as { data: any[] | null };

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
    } catch (error) {
      console.warn('Error loading dashboard data:', error);
      // Set default stats if tables don't exist
      setStats({
        totalUsers: 0,
        activeSubscriptions: 0,
        freeUsers: 0,
        premiumUsers: 0,
        proUsers: 0,
        totalToolUsage: 0,
      });
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
    return null; // Will redirect
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8" />
          Admin Dashboard
        </h1>
        <p className="text-white/70">Manage your platform and users</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-white/10">
        <div className="flex gap-4">
          {(['overview', 'users', 'subscriptions', 'settings'] as const).map((tab) => (
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
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-black border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Total Users</span>
                <Users className="w-5 h-5 text-white/40" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</div>
            </div>

            <div className="bg-black border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Active Subscriptions</span>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.activeSubscriptions || 0}</div>
            </div>

            <div className="bg-black border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Tool Usage</span>
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalToolUsage || 0}</div>
            </div>

            <div className="bg-black border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Premium Users</span>
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.premiumUsers || 0}</div>
            </div>
          </div>

          {/* Tier Breakdown */}
          <div className="bg-black border border-white/10 rounded-lg p-6">
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
          <div className="bg-black border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent Users
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-white/60 text-sm font-medium">Email</th>
                    <th className="text-left py-2 text-white/60 text-sm font-medium">Tier</th>
                    <th className="text-left py-2 text-white/60 text-sm font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.length > 0 ? (
                    recentUsers.map((user) => (
                      <tr key={user.id} className="border-b border-white/5">
                        <td className="py-2 text-white">{user.email}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.tier === 'free' ? 'bg-white/5 text-white/60' :
                            user.tier === 'premium' ? 'bg-yellow-400/10 text-yellow-400' :
                            'bg-purple-400/10 text-purple-400'
                          }`}>
                            {user.tier}
                          </span>
                        </td>
                        <td className="py-2 text-white/60 text-sm">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-white/60">
                        No users found
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
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">User Management</h2>
          <p className="text-white/60">User management features coming soon...</p>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Subscription Management</h2>
          <p className="text-white/60">Subscription management features coming soon...</p>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Settings
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-medium mb-2">Platform Configuration</h3>
              <p className="text-white/60 text-sm">Platform settings and configuration options coming soon...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

