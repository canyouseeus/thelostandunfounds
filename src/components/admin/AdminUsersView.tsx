
import { useState } from 'react';
import {
  Users,
  Search,
  CheckSquare,
  Square,
  User,
  Calendar,
  Eye,
  Edit,
  Ban,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/components/Toast';

interface RecentUser {
  id: string;
  email: string;
  username: string | null;
  tier: string;
  isAdmin: boolean;
  created_at: string;
}

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

interface AdminUsersViewProps {
  users: RecentUser[];
  stats: DashboardStats | null;
  onSelectUser: (user: RecentUser) => void;
  onBack: () => void;
}

export default function AdminUsersView({ users: allUsers, stats, onSelectUser, onBack }: AdminUsersViewProps) {
  const { success } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'free' | 'premium' | 'pro'>('all');
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admin' | 'user'>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Filter users
  const filteredUsers = allUsers.filter(user => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase()));

    // Tier filter
    const matchesTier = filterTier === 'all' || user.tier === filterTier;

    // Admin filter
    const matchesAdmin = filterAdmin === 'all' ||
      (filterAdmin === 'admin' && user.isAdmin) ||
      (filterAdmin === 'user' && !user.isAdmin);

    return matchesSearch && matchesTier && matchesAdmin;
  });

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-black/50 rounded-none p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white uppercase">
            CONTRIBUTOR MANAGEMENT
          </h2>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-none text-white text-sm transition">
            Export Users
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-none p-4">
            <div className="text-white/60 text-sm mb-1">Total Contributors</div>
            <div className="text-2xl font-bold text-white">
              {allUsers.length > 0 ? allUsers.length : (stats?.totalUsers || 0)}
            </div>
          </div>
          <div className="bg-white/5 rounded-none p-4">
            <div className="text-white/60 text-sm mb-1">Active Users</div>
            <div className="text-2xl font-bold text-green-400">
              {allUsers.length > 0 ? allUsers.filter(u => u.tier !== 'inactive').length : (stats?.activeSubscriptions || 0)}
            </div>
          </div>
          <div className="bg-white/5 rounded-none p-4">
            <div className="text-white/60 text-sm mb-1">Premium Users</div>
            <div className="text-2xl font-bold text-yellow-400">
              {allUsers.length > 0
                ? allUsers.filter(u => u.tier === 'premium' || u.tier === 'pro').length
                : ((stats?.premiumUsers || 0) + (stats?.proUsers || 0))}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by email or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value as any)}
                className="px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
              >
                <option value="all">All Tiers</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="pro">Pro</option>
              </select>
              <select
                value={filterAdmin}
                onChange={(e) => setFilterAdmin(e.target.value as any)}
                className="px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
              >
                <option value="all">All Users</option>
                <option value="admin">Admins</option>
                <option value="user">Regular Users</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.size > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-none p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white/80 text-sm">
                  {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedUsers(new Set())}
                  className="text-white/60 hover:text-white text-sm"
                >
                  Clear Selection
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    success(`Bulk action performed on ${selectedUsers.size} users`);
                    setSelectedUsers(new Set());
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-none text-white text-sm transition"
                >
                  Export Selected
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Ban ${selectedUsers.size} selected users?`)) {
                      success(`Banned ${selectedUsers.size} users`);
                      setSelectedUsers(new Set());
                    }
                  }}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-none text-red-400 text-sm transition"
                >
                  Ban Selected
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="border-t border-white/10 pt-4">
          <div className="space-y-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-4 bg-black/30 rounded-none hover:bg-white/5 transition"
                >
                  <button
                    onClick={() => {
                      const newSelected = new Set(selectedUsers);
                      if (newSelected.has(user.id)) {
                        newSelected.delete(user.id);
                      } else {
                        newSelected.add(user.id);
                      }
                      setSelectedUsers(newSelected);
                    }}
                    className="flex-shrink-0"
                  >
                    {selectedUsers.has(user.id) ? (
                      <CheckSquare className="w-5 h-5 text-white" />
                    ) : (
                      <Square className="w-5 h-5 text-white/40" />
                    )}
                  </button>
                  <div className="w-10 h-10 bg-white/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium truncate">{user.username || user.email}</span>
                      {user.isAdmin && (
                        <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          ADMIN
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] border ${user.tier === 'free' ? 'bg-white/5 text-white/60 border-white/10' :
                          user.tier === 'premium' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
                            'bg-purple-400/10 text-purple-400 border-purple-400/20'
                        }`}>
                        {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <span className="font-mono truncate">{user.email}</span>
                      {user.created_at && (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectUser(user)}
                      className="p-2 hover:bg-white/10 transition rounded-none"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={() => onSelectUser(user)}
                      className="p-2 hover:bg-white/10 transition rounded-none"
                      title="Edit User"
                    >
                      <Edit className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Ban user ${user.email}?`)) {
                          success(`User ${user.email} banned`);
                        }
                      }}
                      className="p-2 hover:bg-red-500/20 transition rounded-none"
                      title="Ban User"
                    >
                      <Ban className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-white/60">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No users found</p>
                {searchQuery || filterTier !== 'all' || filterAdmin !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterTier('all');
                      setFilterAdmin('all');
                    }}
                    className="mt-2 text-white/80 hover:text-white underline text-sm"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




