
import { Link } from 'react-router-dom';
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  BoltIcon,
  UsersIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

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

interface AdminSettingsViewProps {
  stats: DashboardStats | null;
  onBack: () => void;
}

export default function AdminSettingsView({ stats, onBack }: AdminSettingsViewProps) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white/5 backdrop-blur-sm p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Cog6ToothIcon className="w-5 h-5" />
          Admin Settings
        </h2>
        <div className="space-y-6">
          <div className="pb-4">
            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4" />
              Platform Configuration
            </h3>
            <p className="text-white/60 text-sm mb-4">Manage platform-wide settings and policies</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-white/5">
                <span className="text-white/80 text-sm uppercase tracking-wide">Platform Status</span>
                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] uppercase tracking-wider font-bold">Operational</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5">
                <span className="text-white/80 text-sm uppercase tracking-wide">Database Connection</span>
                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] uppercase tracking-wider font-bold">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5">
                <span className="text-white/80 text-sm uppercase tracking-wide">Platform Health</span>
                <span className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider font-bold ${stats?.platformHealth === 'healthy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  stats?.platformHealth === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                  {stats?.platformHealth === 'healthy' ? 'Healthy' :
                    stats?.platformHealth === 'warning' ? 'Warning' : 'Critical'}
                </span>
              </div>
            </div>
          </div>

          <div className="pb-4">
            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
              <BoltIcon className="w-4 h-4" />
              Tool Management
            </h3>
            <p className="text-white/60 text-sm mb-4">Configure tool usage limits and policies</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-white/5">
                <span className="text-white/80 text-sm uppercase tracking-wide">Total Tool Usage</span>
                <span className="text-white font-mono font-bold text-sm">{stats?.totalToolUsage || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5">
                <span className="text-white/80 text-sm uppercase tracking-wide">Tool Status</span>
                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] uppercase tracking-wider font-bold">Active</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              User Management
            </h3>
            <p className="text-white/60 text-sm mb-4">Advanced user management features</p>
            <p className="text-white/40 text-sm">Additional configuration options coming soon...</p>
          </div>

          <div className="pt-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Cog6ToothIcon className="w-4 h-4" />
              Quick Navigation
            </h3>
            <p className="text-white/60 text-sm mb-4">Access admin tools and resources</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/sagemode"
                className="px-4 py-4 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>SAGE MODE</span>
                <span className="text-yellow-400/60">→</span>
              </Link>
              <Link
                to="/designsystem"
                className="px-4 py-4 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>Design System</span>
                <span className="text-white/60">→</span>
              </Link>
              <Link
                to="/qr"
                className="px-4 py-4 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>QR Codes</span>
                <span className="text-white/60">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




