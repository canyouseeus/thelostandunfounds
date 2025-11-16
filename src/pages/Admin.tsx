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
import AuthModal from '../components/auth/AuthModal';
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
  LayoutDashboard,
  Key,
  ChevronLeft,
  ChevronRight,
  X
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
import PasswordGenerator from '../components/admin/PasswordGenerator';

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

type AdminTab = 'dashboard' | 'blog' | 'products' | 'affiliates' | 'journal' | 'tasks' | 'ideas' | 'tools' | 'analytics' | 'help' | 'developer' | 'password' | 'settings';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [overviewStats, setOverviewStats] = useState<{
    tasks: { total: number; completed: number };
    ideas: { total: number };
    journal: { total: number };
    affiliates: { total: number; active: number };
  } | null>(null);
  
  // Browser-like tab history
  const [tabHistory, setTabHistory] = useState<AdminTab[]>(['dashboard']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [openTabs, setOpenTabs] = useState<AdminTab[]>(['dashboard']);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (adminStatus === true) {
      loadDashboardData();
      loadOverviewStats();
    }
  }, [adminStatus]);

  const checkAdminAccess = async () => {
    if (authLoading) return;
    
    if (!user) {
      // Don't redirect - show login prompt instead
      setLoading(false);
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
        .then(r => r)
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
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };

      // Get tool usage stats
      const { count: toolUsage } = await supabase
        .from('tool_usage')
        .select('*', { count: 'exact', head: true })
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };

      // Get product count
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };

      // Get blog post count
      const { count: blogPostCount } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };

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

  const loadOverviewStats = async () => {
    try {
      // Load tasks stats
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };
      
      const { count: completedTasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };

      // Load ideas stats
      const { count: ideasCount } = await supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };

      // Load journal stats
      const { count: journalCount } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };

      // Load affiliates stats
      const { count: affiliatesCount } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };
      
      const { count: activeAffiliatesCount } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .then(r => r)
        .catch(() => ({ count: 0, error: null })) as { count: number | null };

      setOverviewStats({
        tasks: {
          total: tasksCount || 0,
          completed: completedTasksCount || 0,
        },
        ideas: {
          total: ideasCount || 0,
        },
        journal: {
          total: journalCount || 0,
        },
        affiliates: {
          total: affiliatesCount || 0,
          active: activeAffiliatesCount || 0,
        },
      });
    } catch (error) {
      console.warn('Error loading overview stats:', error);
      setOverviewStats({
        tasks: { total: 0, completed: 0 },
        ideas: { total: 0 },
        journal: { total: 0 },
        affiliates: { total: 0, active: 0 },
      });
    }
  };

  // Show loading while checking auth or admin status
  if (loading || authLoading || (user && adminStatus === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingSpinner />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-black border border-white/10 rounded-lg p-8 text-center">
            <Shield className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access Required</h1>
            <p className="text-white/60 mb-6">
              Please log in with an admin account to access the dashboard.
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full px-6 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition font-medium"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/')}
              className="mt-4 w-full px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
            >
              Go to Homepage
            </button>
          </div>
        </div>
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  // Show access denied if not admin
  if (adminStatus === false) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-black border border-white/10 rounded-lg p-8 text-center">
            <Shield className="w-16 h-16 text-red-400/40 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-white/60 mb-6">
              You don't have admin privileges. Please contact an administrator.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only show dashboard if adminStatus is true
  if (adminStatus !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingSpinner />
      </div>
    );
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
    { id: 'password', label: 'Password Generator', icon: Key, category: 'Utilities' },
    { id: 'settings', label: 'Settings', icon: Settings, category: 'Configuration' },
  ];

  const handleTabChange = (tabId: AdminTab) => {
    // Add to open tabs if not already open
    if (!openTabs.includes(tabId)) {
      setOpenTabs([...openTabs, tabId]);
    }
    
    // Update history - remove future history if navigating to a new tab
    const newHistory = tabHistory.slice(0, historyIndex + 1);
    newHistory.push(tabId);
    setTabHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setActiveTab(tabId);
  };

  const handleTabClose = (tabId: AdminTab, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (openTabs.length === 1) {
      // Don't close the last tab
      return;
    }
    
    const newOpenTabs = openTabs.filter(id => id !== tabId);
    setOpenTabs(newOpenTabs);
    
    // If closing active tab, switch to the previous one
    if (tabId === activeTab) {
      const currentIndex = openTabs.indexOf(tabId);
      const newActiveTab = currentIndex > 0 ? openTabs[currentIndex - 1] : newOpenTabs[0];
      setActiveTab(newActiveTab);
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setActiveTab(tabHistory[newIndex]);
    }
  };

  const goForward = () => {
    if (historyIndex < tabHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setActiveTab(tabHistory[newIndex]);
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < tabHistory.length - 1;

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
      case 'password':
        return <PasswordGenerator />;
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-black border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Admin Settings
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Overview Cards */}
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Overview</h3>
                  
                  {/* Dashboard Overview */}
                  <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/20 transition">
                    <div className="flex items-center gap-2 mb-2">
                      <LayoutDashboard className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium text-sm">Dashboard</span>
                    </div>
                    {stats && (
                      <div className="space-y-1 text-xs text-white/60">
                        <div>Users: {stats.totalUsers}</div>
                        <div>Active Subs: {stats.activeSubscriptions}</div>
                        <div>Tool Usage: {stats.totalToolUsage}</div>
                      </div>
                    )}
                  </div>

                  {/* Blog Posts Overview */}
                  <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/20 transition cursor-pointer" onClick={() => setActiveTab('blog')}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-green-400" />
                      <span className="text-white font-medium text-sm">Blog Posts</span>
                    </div>
                    {stats && (
                      <div className="space-y-1 text-xs text-white/60">
                        <div>Total Posts: {stats.totalBlogPosts || 0}</div>
                      </div>
                    )}
                  </div>

                  {/* Products Overview */}
                  <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/20 transition cursor-pointer" onClick={() => setActiveTab('products')}>
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-medium text-sm">Products</span>
                    </div>
                    {stats && (
                      <div className="space-y-1 text-xs text-white/60">
                        <div>Total Products: {stats.totalProducts || 0}</div>
                      </div>
                    )}
                  </div>

                  {/* Affiliates Overview */}
                  <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/20 transition cursor-pointer" onClick={() => setActiveTab('affiliates')}>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-medium text-sm">Affiliates</span>
                    </div>
                    {overviewStats && (
                      <div className="space-y-1 text-xs text-white/60">
                        <div>Total: {overviewStats.affiliates.total}</div>
                        <div>Active: {overviewStats.affiliates.active}</div>
                      </div>
                    )}
                  </div>

                  {/* Analytics Overview */}
                  <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/20 transition cursor-pointer" onClick={() => setActiveTab('analytics')}>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <span className="text-white font-medium text-sm">Analytics</span>
                    </div>
                    {stats && (
                      <div className="space-y-1 text-xs text-white/60">
                        <div>Free: {stats.freeUsers}</div>
                        <div>Premium: {stats.premiumUsers}</div>
                        <div>Pro: {stats.proUsers}</div>
                      </div>
                    )}
                  </div>

                  {/* Tasks Overview */}
                  <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/20 transition cursor-pointer" onClick={() => setActiveTab('tasks')}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="w-4 h-4 text-orange-400" />
                      <span className="text-white font-medium text-sm">Tasks</span>
                    </div>
                    {overviewStats && (
                      <div className="space-y-1 text-xs text-white/60">
                        <div>Total: {overviewStats.tasks.total}</div>
                        <div>Completed: {overviewStats.tasks.completed}</div>
                        {overviewStats.tasks.total > 0 && (
                          <div className="mt-1">
                            <div className="w-full bg-white/10 rounded-full h-1.5">
                              <div 
                                className="bg-orange-400 h-1.5 rounded-full transition-all" 
                                style={{ width: `${(overviewStats.tasks.completed / overviewStats.tasks.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ideas Overview */}
                  <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/20 transition cursor-pointer" onClick={() => setActiveTab('ideas')}>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-medium text-sm">Ideas</span>
                    </div>
                    {overviewStats && (
                      <div className="space-y-1 text-xs text-white/60">
                        <div>Total Ideas: {overviewStats.ideas.total}</div>
                      </div>
                    )}
                  </div>

                  {/* Journal Overview */}
                  <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/20 transition cursor-pointer" onClick={() => setActiveTab('journal')}>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-pink-400" />
                      <span className="text-white font-medium text-sm">Daily Journal</span>
                    </div>
                    {overviewStats && (
                      <div className="space-y-1 text-xs text-white/60">
                        <div>Total Entries: {overviewStats.journal.total}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Settings Content */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold text-white mb-4">Platform Configuration</h3>
                  <div className="space-y-4">
                    <div className="bg-black border border-white/10 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">General Settings</h4>
                      <p className="text-white/60 text-sm">Platform settings and configuration options coming soon...</p>
                    </div>
                    <div className="bg-black border border-white/10 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Security Settings</h4>
                      <p className="text-white/60 text-sm">Security and access control settings coming soon...</p>
                    </div>
                    <div className="bg-black border border-white/10 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Integration Settings</h4>
                      <p className="text-white/60 text-sm">Third-party integrations and API settings coming soon...</p>
                    </div>
                    <div className="bg-black border border-white/10 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Open New Tab</h4>
                      <p className="text-white/60 text-sm mb-4">Click on any section below to open it in a new tab:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {tabs.filter(tab => tab.id !== 'settings').map((tab) => {
                          const Icon = tab.icon;
                          const isOpen = openTabs.includes(tab.id);
                          return (
                            <button
                              key={tab.id}
                              onClick={() => handleTabChange(tab.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded transition text-sm border ${
                                isOpen
                                  ? 'border-white/20 text-white/40 cursor-default bg-white/5'
                                  : 'border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                              }`}
                              disabled={isOpen}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{tab.label}</span>
                              {isOpen && <span className="ml-auto text-xs text-white/30">Open</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
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
        {/* Left Sidebar */}
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
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                          isActive
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

        {/* Right Main View */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Browser-like Tab Bar */}
            {openTabs.length > 0 && (
              <div className="mb-4 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                    <button
                      onClick={goBack}
                      disabled={!canGoBack}
                      className={`p-1.5 rounded transition ${
                        canGoBack
                          ? 'text-white/60 hover:text-white hover:bg-white/10'
                          : 'text-white/20 cursor-not-allowed'
                      }`}
                      title="Go back"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={goForward}
                      disabled={!canGoForward}
                      className={`p-1.5 rounded transition ${
                        canGoForward
                          ? 'text-white/60 hover:text-white hover:bg-white/10'
                          : 'text-white/20 cursor-not-allowed'
                      }`}
                      title="Go forward"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Open Tabs */}
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                    {openTabs.map((tabId) => {
                      const tab = tabs.find(t => t.id === tabId);
                      if (!tab) return null;
                      const Icon = tab.icon;
                      const isActive = activeTab === tabId;
                      
                      return (
                        <div
                          key={tabId}
                          className={`group flex items-center gap-2 px-3 py-1.5 rounded-t transition min-w-[120px] ${
                            isActive
                              ? 'bg-black border-t border-x border-white/10 text-white'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <button
                            onClick={() => handleTabChange(tabId)}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{tab.label}</span>
                          </button>
                          {openTabs.length > 1 && (
                            <button
                              onClick={(e) => handleTabClose(tabId, e)}
                              className={`opacity-0 group-hover:opacity-100 transition p-0.5 rounded hover:bg-white/10 flex-shrink-0 ${
                                isActive ? 'text-white' : 'text-white/60'
                              }`}
                              title="Close tab"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Content Area - Cards Stacked */}
            {activeTab === 'dashboard' ? (
              <div className="space-y-4">
                {/* Dashboard Cards Stacked */}
                <DashboardOverview />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tab Content as Card */}
                <div className="bg-black border border-white/10 rounded-lg p-6">
                  {renderTabContent()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

