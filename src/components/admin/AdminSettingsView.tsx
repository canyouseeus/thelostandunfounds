
import { Link } from 'react-router-dom';
import {
  Settings,
  Shield,
  Activity,
  Users,
  ArrowLeft
} from 'lucide-react';

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
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-black/50 rounded-none p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Admin Settings
        </h2>
        <div className="space-y-6">
          <div className="pb-4">
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
                <span className={`px-2 py-1 rounded text-xs ${stats?.platformHealth === 'healthy' ? 'bg-green-400/20 text-green-400' :
                    stats?.platformHealth === 'warning' ? 'bg-yellow-400/20 text-yellow-400' :
                      'bg-red-400/20 text-red-400'
                  }`}>
                  {stats?.platformHealth === 'healthy' ? 'Healthy' :
                    stats?.platformHealth === 'warning' ? 'Warning' : 'Critical'}
                </span>
              </div>
            </div>
          </div>

          <div className="pb-4">
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

          <div className="pt-4">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




