/**
 * Analytics Carousel Component
 * Displays different performance metrics in a carousel format
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Users, DollarSign, TrendingUp, Activity, BarChart3 } from 'lucide-react';

interface AnalyticsData {
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

interface AnalyticsCarouselProps {
  data: AnalyticsData;
}

type ChartType = 'users' | 'revenue' | 'traffic' | 'subscriptions' | 'products' | 'content';

export default function AnalyticsCarousel({ data }: AnalyticsCarouselProps) {
  const [currentChart, setCurrentChart] = useState<ChartType>('users');

  const charts: { id: ChartType; label: string; icon: any }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: Activity },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'traffic', label: 'Traffic', icon: TrendingUp },
    { id: 'products', label: 'Products', icon: BarChart3 },
    { id: 'content', label: 'Content', icon: BarChart3 },
  ];

  const currentIndex = charts.findIndex(chart => chart.id === currentChart);

  const nextChart = () => {
    const nextIndex = (currentIndex + 1) % charts.length;
    setCurrentChart(charts[nextIndex].id);
  };

  const prevChart = () => {
    const prevIndex = (currentIndex - 1 + charts.length) % charts.length;
    setCurrentChart(charts[prevIndex].id);
  };

  const renderChart = () => {
    switch (currentChart) {
      case 'users':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{data.totalUsers}</div>
              <div className="text-white/60">Total Users</div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white/60">{data.freeUsers}</div>
                <div className="text-sm text-white/40">Free</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{data.premiumUsers}</div>
                <div className="text-sm text-white/40">Premium</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{data.proUsers}</div>
                <div className="text-sm text-white/40">Pro</div>
              </div>
            </div>
            {/* Simple bar chart visualization */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-sm text-white/60 w-16">Free</div>
                <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-white/60 h-full rounded-full transition-all"
                    style={{ width: `${data.totalUsers > 0 ? (data.freeUsers / data.totalUsers * 100) : 0}%` }}
                  />
                </div>
                <div className="text-sm text-white/60 w-12 text-right">{data.freeUsers}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-white/60 w-16">Premium</div>
                <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-yellow-400 h-full rounded-full transition-all"
                    style={{ width: `${data.totalUsers > 0 ? (data.premiumUsers / data.totalUsers * 100) : 0}%` }}
                  />
                </div>
                <div className="text-sm text-white/60 w-12 text-right">{data.premiumUsers}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-white/60 w-16">Pro</div>
                <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-purple-400 h-full rounded-full transition-all"
                    style={{ width: `${data.totalUsers > 0 ? (data.proUsers / data.totalUsers * 100) : 0}%` }}
                  />
                </div>
                <div className="text-sm text-white/60 w-12 text-right">{data.proUsers}</div>
              </div>
            </div>
          </div>
        );

      case 'subscriptions':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{data.activeSubscriptions}</div>
              <div className="text-white/60">Active Subscriptions</div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Subscription Breakdown</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm">Free Tier</span>
                    <span className="text-white/60 text-sm">{data.freeUsers}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3">
                    <div 
                      className="bg-white/60 h-3 rounded-full transition-all"
                      style={{ width: `${data.activeSubscriptions > 0 ? (data.freeUsers / data.activeSubscriptions * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm">Premium</span>
                    <span className="text-white/60 text-sm">{data.premiumUsers}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3">
                    <div 
                      className="bg-yellow-400 h-3 rounded-full transition-all"
                      style={{ width: `${data.activeSubscriptions > 0 ? (data.premiumUsers / data.activeSubscriptions * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm">Pro</span>
                    <span className="text-white/60 text-sm">{data.proUsers}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3">
                    <div 
                      className="bg-purple-400 h-3 rounded-full transition-all"
                      style={{ width: `${data.activeSubscriptions > 0 ? (data.proUsers / data.activeSubscriptions * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'revenue':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">
                ${(data.totalRevenue || 0).toLocaleString()}
              </div>
              <div className="text-white/60">Total Revenue</div>
            </div>
            {data.monthlyRevenue !== undefined && (
              <div className="text-center mt-4">
                <div className="text-2xl font-bold text-green-400">
                  ${data.monthlyRevenue.toLocaleString()}
                </div>
                <div className="text-white/60 text-sm">This Month</div>
              </div>
            )}
            {/* Simple revenue chart */}
            <div className="mt-6">
              <div className="flex items-end justify-between h-32 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const height = Math.random() * 80 + 20; // Simulated data
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-green-400 rounded-t transition-all hover:bg-green-300"
                        style={{ height: `${height}%` }}
                        title={`Day ${day}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-white/40">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        );

      case 'traffic':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{data.totalToolUsage}</div>
              <div className="text-white/60">Tool Usage</div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Total Interactions</span>
                <span className="text-white font-bold">{data.totalToolUsage}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Active Users</span>
                <span className="text-white font-bold">{data.totalUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Avg per User</span>
                <span className="text-white font-bold">
                  {data.totalUsers > 0 ? Math.round(data.totalToolUsage / data.totalUsers) : 0}
                </span>
              </div>
            </div>
            {/* Traffic visualization */}
            <div className="mt-6">
              <div className="grid grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const value = Math.random() * 100; // Simulated data
                  return (
                    <div key={day} className="flex flex-col items-center">
                      <div className="w-full bg-white/5 rounded-t overflow-hidden" style={{ height: '60px' }}>
                        <div 
                          className="w-full bg-blue-400 transition-all"
                          style={{ height: `${value}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/40 mt-1">{day}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{data.totalProducts || 0}</div>
              <div className="text-white/60">Total Products</div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-2xl font-bold text-white/60 mb-1">Store Status</div>
              <div className="text-white/40 text-sm">Product management dashboard</div>
            </div>
          </div>
        );

      case 'content':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{data.totalBlogPosts || 0}</div>
              <div className="text-white/60">Blog Posts</div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-2xl font-bold text-white/60 mb-1">Content Library</div>
              <div className="text-white/40 text-sm">Manage your blog posts</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const CurrentIcon = charts[currentIndex].icon;

  return (
    <div className="bg-black border border-white/10 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CurrentIcon className="w-6 h-6 text-white" />
          <h3 className="text-xl font-bold text-white">{charts[currentIndex].label}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevChart}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition"
            aria-label="Previous chart"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-white/60 text-sm">
            {currentIndex + 1} / {charts.length}
          </div>
          <button
            onClick={nextChart}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition"
            aria-label="Next chart"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chart Indicators */}
      <div className="flex gap-2 mb-6 justify-center">
        {charts.map((chart) => {
          const Icon = chart.icon;
          return (
            <button
              key={chart.id}
              onClick={() => setCurrentChart(chart.id)}
              className={`p-2 rounded transition ${
                currentChart === chart.id
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
              title={chart.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Chart Content */}
      <div className="min-h-[300px] flex items-center justify-center">
        {renderChart()}
      </div>
    </div>
  );
}
