
import { ArrowLeft, BarChart3, Activity, Users, DollarSign, Mail, Bell, FileText, TrendingUp, Eye, ChevronRight } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useState } from 'react';

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
  // New blog-specific stats
  blogWriters?: number;
  totalBlogPosts?: number;
  publishedThisMonth?: number;
  affiliateRevenue?: number;
  galleryRevenue?: number;
  // Contributor details
  contributorDetails?: Array<{
    authorId: string;
    authorName: string;
    email: string;
    postCount: number;
    latestPost: string;
  }>;
}

interface Alert {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  time: string;
  read: boolean;
}

interface AdminOverviewViewProps {
  stats: DashboardStats | null;
  alerts: Alert[];
  onBack: () => void;
}

export default function AdminOverviewView({ stats, alerts, onBack }: AdminOverviewViewProps) {
  const [showContributors, setShowContributors] = useState(false);

  // Calculate content health based on blog activity instead of subscription ratio
  const getContentHealth = (): { status: 'healthy' | 'warning' | 'critical'; label: string } => {
    const publishedThisMonth = stats?.publishedThisMonth || 0;
    const totalPosts = stats?.totalBlogPosts || 0;

    if (publishedThisMonth >= 4) return { status: 'healthy', label: 'ACTIVE' };
    if (publishedThisMonth >= 2 || totalPosts >= 10) return { status: 'warning', label: 'MODERATE' };
    return { status: 'critical', label: 'NEEDS CONTENT' };
  };

  const contentHealth = getContentHealth();
  const totalRevenue = (stats?.affiliateRevenue || 0) + (stats?.galleryRevenue || 0);

  if (showContributors) {
    return (
      <div className="space-y-6">
        <button onClick={() => setShowContributors(false)} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Platform Report
        </button>

        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5" />
            BLOG CONTRIBUTORS ({stats?.blogWriters || 0})
          </h2>

          <div className="space-y-3">
            {stats?.contributorDetails && stats.contributorDetails.length > 0 ? (
              stats.contributorDetails.map((contributor, idx) => (
                <div key={contributor.authorId || idx} className="bg-white/5 border border-white/10 p-4 rounded-none hover:bg-white/10 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-1">{contributor.authorName || 'Unknown Author'}</h3>
                      <p className="text-white/60 text-sm mb-2">{contributor.email}</p>
                      <div className="flex gap-4 text-xs text-white/40">
                        <span>{contributor.postCount} post{contributor.postCount !== 1 ? 's' : ''}</span>
                        <span>Latest: {new Date(contributor.latestPost).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{contributor.postCount}</div>
                      <div className="text-[10px] text-white/40 uppercase">Posts</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-white/40 text-center py-8">No contributors found</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-black/50 border border-white/10 rounded-none p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          PLATFORM REPORT
        </h2>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setShowContributors(true)}
            className="bg-white/5 border border-white/10 p-4 rounded-none hover:bg-white/10 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider">
                <Users className="w-3 h-3" /> Blog Writers
              </div>
              <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
            </div>
            <div className="text-3xl font-bold text-white">
              <AnimatedNumber value={stats?.blogWriters || 0} />
            </div>
            <p className="text-[10px] text-white/40 mt-1">Click to view details</p>
          </button>

          <div className="bg-white/5 border border-white/10 p-4 rounded-none">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
              <DollarSign className="w-3 h-3" /> Total Revenue
            </div>
            <div className="text-3xl font-bold text-green-400">
              $<AnimatedNumber value={totalRevenue} />
            </div>
            <p className="text-[10px] text-white/40 mt-1">Affiliate + Gallery sales</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-none">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
              <FileText className="w-3 h-3" /> Published Posts
            </div>
            <div className="text-3xl font-bold text-white">
              <AnimatedNumber value={stats?.totalBlogPosts || 0} />
            </div>
            <p className="text-[10px] text-white/40 mt-1">{stats?.publishedThisMonth || 0} this month</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-none">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
              <Mail className="w-3 h-3" /> Newsletter
            </div>
            <div className="text-3xl font-bold text-blue-400">
              <AnimatedNumber value={stats?.newsletterSubscribers || 0} />
            </div>
            <p className="text-[10px] text-white/40 mt-1">Verified subscribers</p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div className="border border-white/10 bg-white/[0.02] p-6 rounded-none">
            <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wide border-b border-white/10 pb-2">
              Revenue Streams
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Affiliate Commissions</span>
                <span className="text-green-400 font-mono">${(stats?.affiliateRevenue || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Gallery Sales</span>
                <span className="text-green-400 font-mono">${(stats?.galleryRevenue || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Platform Subscriptions</span>
                <span className="text-white/40 font-mono">$0.00</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-white font-bold text-sm">Total</span>
                <span className="text-green-400 font-mono font-bold">
                  ${totalRevenue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Content Health & Activity */}
          <div className="border border-white/10 bg-white/[0.02] p-6 rounded-none">
            <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wide border-b border-white/10 pb-2">
              Content Health
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Publishing Status</span>
                <span className={`px-2 py-0.5 text-xs border ${contentHealth.status === 'healthy' ? 'text-green-400 border-green-400/20 bg-green-400/10' :
                  contentHealth.status === 'warning' ? 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10' :
                    'text-red-400 border-red-400/20 bg-red-400/10'
                  }`}>
                  {contentHealth.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Active Alerts</span>
                <span className="text-white font-mono">{alerts.filter(a => !a.read).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Recent Activity (24h)</span>
                <span className="text-white font-mono">{stats?.recentActivity || 0}</span>
              </div>

              {alerts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-white/40 uppercase mb-1">Recent Alerts</p>
                  {alerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="text-xs p-2 bg-white/5 border border-white/5 border-l-2 border-l-white/20 text-white/80">
                      {alert.message}
                      <span className="block text-[10px] text-white/30 mt-1">{alert.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




