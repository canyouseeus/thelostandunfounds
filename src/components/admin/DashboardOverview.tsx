/**
 * Enhanced Dashboard Overview Component
 * Comprehensive business metrics and KPIs
 */

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  ShoppingBag,
  FileText,
  CheckSquare,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  AlertCircle
} from 'lucide-react';
import { LoadingSpinner } from '../Loading';

interface DashboardMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  freeUsers: number;
  premiumUsers: number;
  proUsers: number;
  totalToolUsage: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalProducts: number;
  activeProducts: number;
  totalBlogPosts: number;
  publishedPosts: number;
  totalTasks: number;
  completedTasks: number;
  totalIdeas: number;
  activeIdeas: number;
  totalAffiliates: number;
  activeAffiliates: number;
}

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // Load all metrics in parallel
      const [
        subscriptionsData,
        toolUsageCount,
        productsData,
        blogPostsData,
        tasksData,
        ideasData,
        affiliatesData,
      ] = await Promise.all([
        supabase.from('platform_subscriptions').select('tier, status').catch(() => ({ data: [] })),
        supabase.from('tool_usage').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('products').select('status').catch(() => ({ data: [] })),
        supabase.from('blog_posts').select('status').catch(() => ({ data: [] })),
        supabase.from('tasks').select('status').catch(() => ({ data: [] })),
        supabase.from('ideas').select('status').catch(() => ({ data: [] })),
        supabase.from('affiliates').select('status').catch(() => ({ data: [] })),
      ]);

      const subscriptions = subscriptionsData.data || [];
      const activeSubs = subscriptions.filter((s: any) => s.status === 'active');
      const freeCount = activeSubs.filter((s: any) => s.tier === 'free').length;
      const premiumCount = activeSubs.filter((s: any) => s.tier === 'premium').length;
      const proCount = activeSubs.filter((s: any) => s.tier === 'pro').length;

      const products = productsData.data || [];
      const activeProducts = products.filter((p: any) => p.status === 'active').length;

      const blogPosts = blogPostsData.data || [];
      const publishedPosts = blogPosts.filter((p: any) => p.status === 'published').length;

      const tasks = tasksData.data || [];
      const completedTasks = tasks.filter((t: any) => t.status === 'done').length;

      const ideas = ideasData.data || [];
      const activeIdeas = ideas.filter((i: any) => 
        ['considering', 'planned', 'in_progress'].includes(i.status)
      ).length;

      const affiliates = affiliatesData.data || [];
      const activeAffiliates = affiliates.filter((a: any) => a.status === 'active').length;

      setMetrics({
        totalUsers: subscriptions.length,
        activeSubscriptions: activeSubs.length,
        freeUsers: freeCount,
        premiumUsers: premiumCount,
        proUsers: proCount,
        totalToolUsage: (toolUsageCount as any).count || 0,
        totalRevenue: 0, // TODO: Calculate from orders
        monthlyRevenue: 0, // TODO: Calculate from orders this month
        totalProducts: products.length,
        activeProducts,
        totalBlogPosts: blogPosts.length,
        publishedPosts,
        totalTasks: tasks.length,
        completedTasks,
        totalIdeas: ideas.length,
        activeIdeas,
        totalAffiliates: affiliates.length,
        activeAffiliates,
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-white/60">
        Failed to load dashboard metrics
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Users',
      value: metrics.totalUsers,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      change: null,
    },
    {
      title: 'Active Subscriptions',
      value: metrics.activeSubscriptions,
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      change: null,
    },
    {
      title: 'Monthly Revenue',
      value: `$${metrics.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      change: null,
    },
    {
      title: 'Tool Usage',
      value: metrics.totalToolUsage,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      change: null,
    },
  ];

  const statCards = [
    {
      title: 'Products',
      icon: ShoppingBag,
      total: metrics.totalProducts,
      active: metrics.activeProducts,
      color: 'text-orange-400',
    },
    {
      title: 'Blog Posts',
      icon: FileText,
      total: metrics.totalBlogPosts,
      active: metrics.publishedPosts,
      color: 'text-blue-400',
    },
    {
      title: 'Tasks',
      icon: CheckSquare,
      total: metrics.totalTasks,
      active: metrics.completedTasks,
      color: 'text-green-400',
    },
    {
      title: 'Ideas',
      icon: Lightbulb,
      total: metrics.totalIdeas,
      active: metrics.activeIdeas,
      color: 'text-yellow-400',
    },
    {
      title: 'Affiliates',
      icon: Users,
      total: metrics.totalAffiliates,
      active: metrics.activeAffiliates,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
        <p className="text-white/60">Comprehensive view of your platform metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-black border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                {kpi.change !== null && (
                  <div className={`flex items-center gap-1 text-sm ${
                    (kpi.change as number) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(kpi.change as number) >= 0 ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                    {Math.abs(kpi.change as number)}%
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-white mb-1">{kpi.value}</div>
              <div className="text-white/60 text-sm">{kpi.title}</div>
            </div>
          );
        })}
      </div>

      {/* Subscription Breakdown */}
      <div className="bg-black border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Subscription Tiers
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white/60 mb-2">{metrics.freeUsers}</div>
            <div className="text-white/40">Free</div>
            <div className="mt-2 w-full bg-white/5 rounded-full h-2">
              <div
                className="bg-white/60 h-2 rounded-full transition-all"
                style={{
                  width: `${metrics.activeSubscriptions > 0 ? (metrics.freeUsers / metrics.activeSubscriptions * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">{metrics.premiumUsers}</div>
            <div className="text-white/40">Premium</div>
            <div className="mt-2 w-full bg-white/5 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all"
                style={{
                  width: `${metrics.activeSubscriptions > 0 ? (metrics.premiumUsers / metrics.activeSubscriptions * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">{metrics.proUsers}</div>
            <div className="text-white/40">Pro</div>
            <div className="mt-2 w-full bg-white/5 rounded-full h-2">
              <div
                className="bg-purple-400 h-2 rounded-full transition-all"
                style={{
                  width: `${metrics.activeSubscriptions > 0 ? (metrics.proUsers / metrics.activeSubscriptions * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const percentage = stat.total > 0 ? Math.round((stat.active / stat.total) * 100) : 0;
          return (
            <div key={index} className="bg-black border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Icon className={`w-5 h-5 ${stat.color}`} />
                <h4 className="font-medium text-white">{stat.title}</h4>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.total}</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{stat.active} active</span>
                <span className={`${stat.color} font-medium`}>{percentage}%</span>
              </div>
              <div className="mt-2 w-full bg-white/5 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${stat.color.replace('text-', 'bg-')}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-black border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition">
            <FileText className="w-5 h-5 text-white/60 mb-2" />
            <div className="text-white font-medium">New Blog Post</div>
            <div className="text-white/60 text-sm">Create content</div>
          </button>
          <button className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition">
            <ShoppingBag className="w-5 h-5 text-white/60 mb-2" />
            <div className="text-white font-medium">Add Product</div>
            <div className="text-white/60 text-sm">Expand catalog</div>
          </button>
          <button className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition">
            <CheckSquare className="w-5 h-5 text-white/60 mb-2" />
            <div className="text-white font-medium">New Task</div>
            <div className="text-white/60 text-sm">Track work</div>
          </button>
          <button className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition">
            <Lightbulb className="w-5 h-5 text-white/60 mb-2" />
            <div className="text-white font-medium">Capture Idea</div>
            <div className="text-white/60 text-sm">Save thoughts</div>
          </button>
        </div>
      </div>
    </div>
  );
}
