
import { useState } from 'react';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  StopIcon,
  UserIcon,
  CalendarIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  BookOpenIcon,
  PhotoIcon as ImageIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/components/Toast';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';

interface RecentUser {
  id: string;
  email: string;
  username: string | null;
  tier: string;
  isAdmin: boolean;
  created_at: string;
  resources?: {
    hasBlog: boolean;
    galleries: Array<{ id: string; name: string }>;
  };
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
  onNavigateToSection?: (section: string) => void;
}

export default function AdminUsersView({ users: allUsers, stats, onNavigateToSection }: AdminUsersViewProps) {
  const { success } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'free' | 'premium' | 'pro'>('all');
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admin' | 'user'>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

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
    <div className="bg-black/50 rounded-none p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-white uppercase">
          CONTRIBUTOR MANAGEMENT
        </h2>
        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-none text-white text-xs sm:text-sm transition">
          Export Users
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        <div className="bg-white/5 rounded-none p-2.5 sm:p-4">
          <div className="text-white/60 text-[10px] sm:text-sm mb-1 truncate">Total Contributors</div>
          <div className="text-lg sm:text-2xl font-bold text-white">
            {allUsers.length > 0 ? allUsers.length : (stats?.totalUsers || 0)}
          </div>
        </div>
        <div className="bg-white/5 rounded-none p-2.5 sm:p-4">
          <div className="text-white/60 text-[10px] sm:text-sm mb-1 truncate">Active Users</div>
          <div className="text-lg sm:text-2xl font-bold text-green-400">
            {allUsers.length > 0 ? allUsers.filter(u => u.tier !== 'inactive').length : (stats?.activeSubscriptions || 0)}
          </div>
        </div>
        <div className="bg-white/5 rounded-none p-2.5 sm:p-4">
          <div className="text-white/60 text-[10px] sm:text-sm mb-1 truncate">Premium Users</div>
          <div className="text-lg sm:text-2xl font-bold text-yellow-400">
            {allUsers.length > 0
              ? allUsers.filter(u => u.tier === 'premium' || u.tier === 'pro').length
              : ((stats?.premiumUsers || 0) + (stats?.proUsers || 0))}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by email, username, or resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/50 rounded-none text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value as any)}
              className="px-4 py-2 bg-black/50 rounded-none text-white focus:outline-none focus:bg-white/10 transition-colors"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="pro">Pro</option>
            </select>
            <select
              value={filterAdmin}
              onChange={(e) => setFilterAdmin(e.target.value as any)}
              className="px-4 py-2 bg-black/50 rounded-none text-white focus:outline-none focus:bg-white/10 transition-colors"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins</option>
              <option value="user">Regular Users</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.size > 0 && (
          <div className="bg-white/5 rounded-none p-4 flex items-center justify-between">
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
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 rounded-none text-red-500 text-sm transition"
              >
                Ban Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="space-y-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const hasResources = user.resources?.hasBlog || (user.resources?.galleries && user.resources.galleries.length > 0);

                return (
                  <div
                    key={user.id}
                    className="flex items-stretch gap-1 bg-black/30"
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
                      className="flex-shrink-0 flex items-center px-3"
                    >
                      {selectedUsers.has(user.id) ? (
                        <CheckCircleIcon className="w-5 h-5 text-white" />
                      ) : (
                        <StopIcon className="w-5 h-5 text-white/40" />
                      )}
                    </button>

                    <ExpandableScreen
                      isOpen={expandedUserId === user.id}
                      onOpenChange={(open) => setExpandedUserId(open ? user.id : null)}
                    >
                      <ExpandableScreenTrigger className="flex-1 flex items-center gap-4 py-4 pr-4 text-left min-w-0">
                        <div className="w-10 h-10 bg-white/10 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-white/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-white font-medium truncate">{user.username || user.email}</span>
                            {user.isAdmin && (
                              <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 font-black tracking-tighter">
                                ADMIN
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-[10px] font-black tracking-tighter ${user.tier === 'free' ? 'bg-white/5 text-white/60' :
                              user.tier === 'premium' ? 'bg-yellow-400/10 text-yellow-400' :
                                'bg-purple-400/10 text-purple-400'
                              }`}>
                              {user.tier.toUpperCase()}
                            </span>

                            {/* Resource Badges (informational — open the card for actions) */}
                            {user.resources?.hasBlog && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black tracking-tighter">
                                <BookOpenIcon className="w-2.5 h-2.5" />
                                BLOG
                              </span>
                            )}
                            {user.resources?.galleries && user.resources.galleries.length > 0 && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-tighter">
                                <ImageIcon className="w-2.5 h-2.5" />
                                {user.resources.galleries.length === 1 ? '1 GALLERY' : `${user.resources.galleries.length} GALLERIES`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span className="font-mono truncate">{user.email}</span>
                            {user.created_at && (
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <CalendarIcon className="w-3 h-3" />
                                {new Date(user.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </ExpandableScreenTrigger>

                      <ExpandableScreenContent>
                        <div className="flex-1 min-h-0 overflow-y-auto">
                          <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-16 pb-10 flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-white/10 flex items-center justify-center flex-shrink-0">
                                <UserIcon className="w-8 h-8 text-white/60" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xl font-black uppercase tracking-wide text-white truncate">
                                  {user.username || 'No Username'}
                                </h3>
                                <p className="text-white/60 font-mono text-sm truncate">{user.email}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white/5 p-4">
                                <div className="text-[9px] text-white/40 mb-1 uppercase tracking-widest font-black">Tier</div>
                                <div className="text-lg font-bold text-white capitalize">{user.tier}</div>
                              </div>
                              <div className="bg-white/5 p-4">
                                <div className="text-[9px] text-white/40 mb-1 uppercase tracking-widest font-black">Status</div>
                                <div className="text-lg font-bold text-green-400">ACTIVE</div>
                              </div>
                            </div>

                            <div className="bg-white/5 p-4">
                              <div className="text-[9px] text-white/40 mb-1 uppercase tracking-widest font-black">Admin Status</div>
                              <div className="text-lg font-bold text-white">{user.isAdmin ? 'ADMIN' : 'USER'}</div>
                            </div>

                            <div className="bg-white/5 p-4">
                              <div className="text-[9px] text-white/40 mb-1 uppercase tracking-widest font-black">User ID</div>
                              <div className="font-mono text-xs text-white/80 break-all">{user.id}</div>
                            </div>

                            <div className="bg-white/5 p-4">
                              <div className="text-[9px] text-white/40 mb-1 uppercase tracking-widest font-black">Joined Date</div>
                              <div className="text-white/80 text-sm">
                                {user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
                              </div>
                            </div>

                            {hasResources && (
                              <div className="flex gap-3 flex-wrap">
                                {user.resources?.hasBlog && (
                                  <button
                                    onClick={() => onNavigateToSection?.('blog')}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-colors"
                                  >
                                    <BookOpenIcon className="w-3.5 h-3.5" />
                                    View Blog
                                  </button>
                                )}
                                {user.resources?.galleries && user.resources.galleries.length > 0 && (
                                  <button
                                    onClick={() => onNavigateToSection?.('gallery')}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    {user.resources.galleries.length === 1 ? '1 Gallery' : `${user.resources.galleries.length} Galleries`}
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={() => success('User edit feature coming soon')}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-white/90 transition-colors"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                                Edit User
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Ban user ${user.email}?`)) {
                                    success(`User ${user.email} banned`);
                                    setExpandedUserId(null);
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-500 font-black uppercase tracking-widest text-xs hover:bg-red-500/30 transition-colors"
                              >
                                <NoSymbolIcon className="w-4 h-4" />
                                Ban User
                              </button>
                            </div>
                          </div>
                        </div>
                      </ExpandableScreenContent>
                    </ExpandableScreen>

                    <button
                      onClick={() => {
                        if (confirm(`Ban user ${user.email}?`)) {
                          success(`User ${user.email} banned`);
                        }
                      }}
                      className="flex-shrink-0 flex items-center px-3 text-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Ban User"
                    >
                      <NoSymbolIcon className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-white/60">
                <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
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
  );
}
