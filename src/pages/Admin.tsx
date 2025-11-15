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
  Shield, 
  FileText,
  ShoppingBag,
  Users,
  Settings,
  Wrench,
  BarChart3,
  BookOpen,
  CheckSquare,
  Lightbulb,
  HelpCircle,
  Code,
  LayoutDashboard
} from 'lucide-react';
import { LoadingSpinner } from '../components/Loading';
import DashboardOverview from '../components/admin/DashboardOverview';
import BlogPostManagement from '../components/admin/BlogPostManagement';
import ProductManagement from '../components/admin/ProductManagement';
import AffiliateManagement from '../components/admin/AffiliateManagement';
import DailyJournal from '../components/admin/DailyJournal';
import TaskManagement from '../components/admin/TaskManagement';
import IdeaBoard from '../components/admin/IdeaBoard';
import HelpCenter from '../components/admin/HelpCenter';
import DeveloperTools from '../components/admin/DeveloperTools';
import AnalyticsCarousel from '../components/admin/AnalyticsCarousel';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  freeUsers: number;
  premiumUsers: number;
  proUsers: number;
  totalToolUsage: number;
  totalRevenue?: number;
  monthlyRevenue?: number;
  totalProducts?: number;
  totalBlogPosts?: number;
}

type AdminTab = 'dashboard' | 'blog' | 'products' | 'affiliates' | 'journal' | 'tasks' | 'ideas' | 'tools' | 'analytics' | 'help' | 'developer' | 'settings';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

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

      // Get total users
      const { count: totalUsers } = await supabase
        .from('platform_subscriptions')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: 0 })) as { count: number | null };

      // Get tool usage stats
      const { count: toolUsage } = await supabase
        .from('tool_usage')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: 0 })) as { count: number | null };

      // Get product count
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: 0 })) as { count: number | null };

      // Get blog post count
      const { count: blogPostCount } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: 0 })) as { count: number | null };

      setStats({
        totalUsers: totalUsers || subscriptions.length,
        activeSubscriptions: activeSubs.length,
        freeUsers: freeCount,
        premiumUsers: premiumCount,
        proUsers: proCount,
        totalToolUsage: toolUsage || 0,
        totalProducts: productCount || 0,
        totalBlogPosts: blogPostCount || 0,
        totalRevenue: 0, // TODO: Calculate from orders
        monthlyRevenue: 0, // TODO: Calculate from orders this month
      });
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
        totalProducts: 0,
        totalBlogPosts: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
      });
    }
  };

  if (loading || authLoading || adminStatus === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (adminStatus === false) {
    return null; // Will redirect
  }

  const tabs: { id: AdminTab; label: string; icon: any; category?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Overview' },
    { id: 'blog', label: 'Blog Posts', icon: FileText, category: 'Content' },
    { id: 'products', label: 'Products', icon: ShoppingBag, category: 'E-commerce' },
    { id: 'affiliates', label: 'Affiliates', icon: Users, category: 'E-commerce' },
    { id: 'journal', label: 'Daily Journal', icon: BookOpen, category: 'Productivity' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, category: 'Productivity' },
    { id: 'ideas', label: 'Ideas', icon: Lightbulb, category: 'Productivity' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, category: 'Analytics' },
    { id: 'help', label: 'Help Center', icon: HelpCircle, category: 'Resources' },
    { id: 'developer', label: 'Developer Tools', icon: Code, category: 'Resources' },
    { id: 'settings', label: 'Settings', icon: Settings, category: 'Configuration' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'blog':
        return <BlogPostManagement />;
      case 'products':
        return <ProductManagement />;
      case 'affiliates':
        return <AffiliateManagement />;
      case 'journal':
        return <DailyJournal />;
      case 'tasks':
        return <TaskManagement />;
      case 'ideas':
        return <IdeaBoard />;
      case 'analytics':
        return stats ? (
          <AnalyticsCarousel data={stats} />
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        );
      case 'help':
        return <HelpCenter />;
      case 'developer':
        return <DeveloperTools />;
      case 'settings':
        return (
          <div className="bg-black border border-white/10 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Admin Settings
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-medium mb-2">Platform Configuration</h3>
                <p className="text-white/60 text-sm">Platform settings and configuration options coming soon...</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Group tabs by category
  const tabsByCategory = tabs.reduce((acc, tab) => {
    const category = tab.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tab);
    return acc;
  }, {} as Record<string, typeof tabs>);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Admin Dashboard
          </h1>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Tabs */}
        <div className="w-64 border-r border-white/10 bg-black/50 overflow-y-auto">
          <nav className="p-4 space-y-4">
            {Object.entries(tabsByCategory).map(([category, categoryTabs]) => (
              <div key={category}>
                <div className="px-2 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                  {category}
                </div>
                <div className="space-y-1">
                  {categoryTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                          activeTab === tab.id
                            ? 'bg-white text-black'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

