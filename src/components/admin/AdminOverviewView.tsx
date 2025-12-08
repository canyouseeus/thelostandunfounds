
import { ArrowLeft, BarChart3, Activity, Users, DollarSign, Mail, Bell } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';

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
          <div className="bg-white/5 border border-white/10 p-4 rounded-none">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
              <Users className="w-3 h-3" /> Total Contributors
            </div>
            <div className="text-3xl font-bold text-white">
              <AnimatedNumber value={stats?.totalUsers || 0} />
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-4 rounded-none">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
              <DollarSign className="w-3 h-3" /> Revenue (MRR)
            </div>
            <div className="text-3xl font-bold text-green-400">
              $<AnimatedNumber value={(stats?.activeSubscriptions || 0) * 9.99} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-none">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
              <Activity className="w-3 h-3" /> Tool Usage
            </div>
            <div className="text-3xl font-bold text-white">
              <AnimatedNumber value={stats?.totalToolUsage || 0} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-none">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
              <Mail className="w-3 h-3" /> Newsletter
            </div>
            <div className="text-3xl font-bold text-blue-400">
              <AnimatedNumber value={stats?.newsletterSubscribers || 0} />
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Segments */}
          <div className="border border-white/10 bg-white/[0.02] p-6 rounded-none">
            <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wide border-b border-white/10 pb-2">
              Contributor Segments
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Free Tier</span>
                <span className="text-white font-mono">{stats?.freeUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Premium Tier</span>
                <span className="text-yellow-400 font-mono">{stats?.premiumUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Pro Tier</span>
                <span className="text-purple-400 font-mono">{stats?.proUsers || 0}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-white/40 text-xs">Conversion Rate</span>
                <span className="text-white font-mono text-sm">
                  {stats?.totalUsers ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* System Health & Alerts */}
          <div className="border border-white/10 bg-white/[0.02] p-6 rounded-none">
            <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wide border-b border-white/10 pb-2">
              System Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Health Status</span>
                <span className={`px-2 py-0.5 text-xs border ${
                  stats?.platformHealth === 'healthy' ? 'text-green-400 border-green-400/20 bg-green-400/10' : 'text-red-400 border-red-400/20 bg-red-400/10'
                }`}>
                  {stats?.platformHealth?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Active Alerts</span>
                <span className="text-white font-mono">{alerts.filter(a => !a.read).length}</span>
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
