/**
 * User Profile Page - Site-Wide Dashboard
 * View and manage account information across all apps
 * Styled to match the admin dashboard
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
  User, Mail, Key, BookOpen, FileText, ExternalLink, Copy, Check,
  HelpCircle, TrendingUp, Camera, RefreshCw, Settings, ChevronRight,
  Image as ImageIcon, DollarSign, Info, Clock, Users, ChevronDown, ChevronUp, Wallet, CreditCard, Share2, ArrowLeft
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import AdminGalleryView from '../components/admin/AdminGalleryView';
import { LoadingSpinner, SkeletonCard } from '../components/Loading';
import { SubscriptionTier } from '../types/index';
import { isAdmin } from '../utils/admin';
import { supabase } from '../lib/supabase';
import { AdminBentoCard, AdminBentoRow } from '../components/ui/admin-bento-card';
import { ClockWidget } from '../components/ui/clock-widget';
import { CalendarWidget } from '../components/ui/calendar-widget';
import { RevenueTracker } from '../components/ui/revenue-tracker';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  published_at: string | null;
  subdomain: string | null;
}

interface UserGallery {
  id: string;
  name: string;
  slug: string;
  photo_count?: number;
  google_drive_folder_id?: string;
}

interface AffiliateData {
  id: string;
  code: string;
  status: string;
  total_earnings: number;
  total_clicks: number;
  total_conversions: number;
  commission_rate: number;
  network_size?: number;
}

export default function Profile() {
  const { user, tier, signOut, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  // Core state
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev => {
      const isOpening = !prev[section];
      const newState = { ...prev, [section]: isOpening };

      // If opening, scroll to section
      if (isOpening) {
        setTimeout(() => {
          sectionRefs.current[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        // Only scroll to top if NO sections are open
        const hasOpenSections = Object.values(newState).some(isOpen => isOpen);
        if (!hasOpenSections) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      return newState;
    });
  };
  const [loading, setLoading] = useState(false);

  // App-specific data
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [userPosts, setUserPosts] = useState<BlogPost[]>([]);
  const [userGalleries, setUserGalleries] = useState<UserGallery[]>([]);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);

  // Loading states
  const [loadingGalleries, setLoadingGalleries] = useState(false);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [syncingGallery, setSyncingGallery] = useState<string | null>(null);

  // UI state
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const admin = await isAdmin();
        setUserIsAdmin(admin);
      }
    };
    checkAdminStatus();
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;

    await Promise.all([
      loadUserSubdomain(),
      loadUserGalleries(),
      loadUserPosts(),
      checkAffiliateStatus(),
    ]);
  };

  const loadUserSubdomain = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_subdomains')
        .select('subdomain, blog_title, blog_title_display')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setUserSubdomain(data.subdomain || null);
        setBlogTitle(data.blog_title_display || data.blog_title || '');
      }
    } catch (err) {
      console.warn('Error loading subdomain:', err);
    }
  };

  const loadUserGalleries = async () => {
    if (!user?.id) return;

    setLoadingGalleries(true);
    try {
      const { data: galleries, error } = await supabase
        .from('photo_libraries')
        .select('id, name, slug, google_drive_folder_id')
        .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading galleries:', error);
        return;
      }

      if (galleries && galleries.length > 0) {
        const galleriesWithCounts = await Promise.all(
          galleries.map(async (gallery) => {
            const { count } = await supabase
              .from('photos')
              .select('*', { count: 'exact', head: true })
              .eq('library_id', gallery.id);
            return { ...gallery, photo_count: count || 0 };
          })
        );
        setUserGalleries(galleriesWithCounts);
      } else {
        setUserGalleries([]);
      }
    } catch (err) {
      console.error('Error loading galleries:', err);
    } finally {
      setLoadingGalleries(false);
    }
  };

  const checkAffiliateStatus = async () => {
    if (!user?.id) return;

    setLoadingAffiliate(true);
    try {
      const { data: affiliate, error } = await supabase
        .from('affiliates')
        .select('id, code, status, total_earnings, total_clicks, total_conversions, commission_rate')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking affiliate status:', error);
      } else if (affiliate) {
        // Fetch MLM/Network data
        let networkSize = 0;
        try {
          const mlmRes = await fetch(`/api/affiliates/mlm-dashboard?affiliate_id=${affiliate.id}`);
          if (mlmRes.ok) {
            const mlmJson = await mlmRes.json();
            networkSize = mlmJson.network?.total_network || 0;
          }
        } catch (mlmErr) {
          console.warn('Failed to fetch MLM network data:', mlmErr);
        }

        setAffiliateData({ ...affiliate, network_size: networkSize });
      }
    } catch (err) {
      console.error('Error checking affiliate status:', err);
    } finally {
      setLoadingAffiliate(false);
    }
  };



  const loadUserPosts = async () => {
    if (!user) return;

    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, published, published_at, subdomain')
        .or(`author_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('published_at', { ascending: false })
        .limit(5);

      if (!error) {
        setUserPosts(data || []);
      }
    } catch (err) {
      console.error('Error loading user posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };



  const handleSyncGallery = async (galleryId: string) => {
    setSyncingGallery(galleryId);
    try {
      const response = await fetch('/api/gallery/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryId: galleryId })
      });

      if (!response.ok) throw new Error('Sync failed');

      success('Gallery synced successfully!');
      await loadUserGalleries();
    } catch (err: any) {
      showError(err.message || 'Failed to sync gallery');
    } finally {
      setSyncingGallery(null);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(label);
      success(`${label} copied!`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      showError('Failed to copy');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/60">Please sign in to view your profile.</p>
      </div>
    );
  }

  // Determine which apps the user has access to
  // If admin, show all apps for testing purposes
  const hasGallery = userGalleries.length > 0 || userIsAdmin;
  const hasBookClub = !!userSubdomain || userIsAdmin;
  const hasAffiliate = !!affiliateData || userIsAdmin;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <div className="max-w-7xl mx-auto p-4">

        {/* Main Grid Layout - 12 Columns */}
        <div className="grid grid-cols-12 gap-4 auto-rows-min">

          {/* Header Card */}
          <div className="col-span-12 bg-[#0a0a0a] p-6 flex flex-col justify-between relative overflow-hidden group">
            {/* Background Gradient */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white text-black flex items-center justify-center font-black text-3xl">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-black uppercase tracking-tighter">My Dashboard</h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-sm font-mono uppercase">{user.email}</span>
                    <div className="flex gap-1">
                      <span className={`text-[10px] px-1.5 py-0.5 ${tier === 'pro' ? 'text-purple-400' : tier === 'premium' ? 'text-yellow-500' : 'text-white/40'} uppercase font-bold`}>
                        {tier || 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/settings"
                  className="p-3 hover:bg-white hover:text-black transition-all group/settings"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 group-hover/settings:rotate-90 transition-transform duration-500" />
                </Link>
                <button
                  onClick={() => signOut()}
                  className="p-3 hover:bg-red-500 hover:text-white transition-all"
                  title="Sign Out"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6 text-sm font-mono text-white/40">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>SYSTEM ONLINE</span>
              </div>
              <span>•</span>
              <span>ID: {user.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>

          {/* Revenue & Widgets Row */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 lg:col-span-9">
              {(hasAffiliate || hasGallery) && (
                <RevenueTracker
                  affiliateRevenue={parseFloat(String(affiliateData?.total_earnings || 0))}
                  galleryRevenue={0} // TODO: Calculate gallery revenue
                  subscriberRevenue={0}
                  galleryPhotoCount={userGalleries.length}
                  usersCount={0} // Not relevant for user profile
                  stats={{
                    revenue: parseFloat(String(affiliateData?.total_earnings || 0)),
                    newsletter: 0,
                    affiliates: parseFloat(String(affiliateData?.total_earnings || 0))
                  }}
                />
              )}
            </div>
            <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4">
              <ClockWidget className="flex-1" />
              <CalendarWidget className="flex-1 min-h-[300px]" />
            </div>
          </div>

          {/* Console / My Apps Tab Bar */}
          <div className="col-span-12 flex flex-col items-center pt-8">
            <div className="relative group">
              <h2 className="text-[10px] font-black text-white/40 tracking-[0.4em] uppercase mb-4 text-center">Platform Console</h2>
              <div className="flex items-center gap-2 p-1.5 bg-white/5 backdrop-blur-xl rounded-full">
                {[
                  { id: 'gallery', icon: Camera, title: 'The Gallery', show: hasGallery },
                  { id: 'writer', icon: BookOpen, title: 'Writer', show: hasBookClub },
                  { id: 'affiliate', icon: TrendingUp, title: 'Affiliate', show: hasAffiliate },
                  { id: 'settings', icon: Settings, title: 'Account', show: true }
                ].filter(app => app.show).map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleSectionToggle(app.id)}
                    className={cn(
                      "relative p-3 transition-all duration-300 rounded-full group/btn",
                      expandedSections[app.id] ? "bg-white text-black scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                    title={app.title}
                  >
                    <app.icon className="w-5 h-5" />
                    {/* Tooltip */}
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {app.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Expanded App Sections */}
          <div className="col-span-12 space-y-12 pb-24">
            {/* Gallery Section */}
            {hasGallery && expandedSections['gallery'] && (
              <div ref={el => sectionRefs.current['gallery'] = el} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col px-0 py-2 mb-8 items-start">
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-white/40" />
                    <h2 className="text-lg font-black text-white tracking-widest uppercase">The Gallery</h2>
                  </div>
                  <button onClick={() => handleSectionToggle('gallery')} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-tighter">Close Console</button>
                </div>
                <div className="p-1 bg-black overflow-hidden max-h-[800px] overflow-y-auto custom-scrollbar">
                  <AdminGalleryView
                    onBack={() => { }}
                    isPhotographerView={true}
                  />
                </div>
              </div>
            )}

            {/* Writer Section */}
            {hasBookClub && expandedSections['writer'] && (
              <div ref={el => sectionRefs.current['writer'] = el} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col px-0 py-2 mb-8 items-start">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-white/40" />
                    <h2 className="text-lg font-black text-white tracking-widest uppercase">Writer Dashboard</h2>
                  </div>
                  <button onClick={() => handleSectionToggle('writer')} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-tighter">Close Console</button>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-black p-4">
                      <AdminBentoRow
                        label="Author Profile"
                        value={blogTitle || user.user_metadata?.author_name || 'Not Set'}
                      />
                    </div>
                    <div className="bg-black p-4">
                      <AdminBentoRow
                        label="Domain"
                        value={<span className="text-green-400 font-mono text-[10px]">{userSubdomain}.thelostandunfounds.com</span>}
                      />
                    </div>
                    <div className="bg-black p-4">
                      <AdminBentoRow
                        label="Total Articles"
                        value={userPosts.length}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Link
                      to="/submit-article"
                      className="flex-1 bg-white text-black py-3 px-4 font-black text-[10px] uppercase text-center hover:bg-white/80 transition"
                    >
                      Create New Article
                    </Link>
                    <Link
                      to={`/blog/${userSubdomain}`}
                      className="flex-1 bg-white/10 py-3 px-4 font-black text-[10px] uppercase text-center hover:bg-white/20 transition"
                    >
                      View Public Blog
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Affiliate Section */}
            {hasAffiliate && expandedSections['affiliate'] && (
              <div ref={el => sectionRefs.current['affiliate'] = el} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col px-0 py-2 mb-8 items-start">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-white/40" />
                    <h2 className="text-lg font-black text-white tracking-widest uppercase">Affiliate App</h2>
                  </div>
                  <button onClick={() => handleSectionToggle('affiliate')} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-tighter">Close Console</button>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-black p-4 flex flex-col justify-between h-24">
                      <span className="text-[10px] uppercase text-white/30 font-bold tracking-widest">Description</span>
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-[10px] uppercase text-white/30 font-bold block mb-1">Clicks</span>
                          <span className="text-xl font-mono text-white leading-none">{affiliateData?.total_clicks || 0}</span>
                        </div>
                        <TrendingUp className="w-4 h-4 text-white/20 mb-1" />
                      </div>
                    </div>

                    <div className="bg-black p-4 flex flex-col justify-between h-24">
                      <div className="flex items-end justify-between h-full">
                        <div>
                          <span className="text-[10px] uppercase text-white/30 font-bold block mb-1">Earnings</span>
                          <span className="text-xl font-mono text-green-400 leading-none">${parseFloat(String(affiliateData?.total_earnings || 0)).toFixed(2)}</span>
                        </div>
                        <DollarSign className="w-4 h-4 text-green-400/20 mb-1" />
                      </div>
                    </div>

                    <div className="bg-black p-4 flex flex-col justify-between h-24">
                      <div className="flex items-end justify-between h-full">
                        <div>
                          <span className="text-[10px] uppercase text-white/30 font-bold block mb-1">Network</span>
                          <span className="text-xl font-mono text-purple-400 leading-none">{affiliateData?.network_size || 0}</span>
                        </div>
                        <Users className="w-4 h-4 text-purple-400/20 mb-1" />
                      </div>
                    </div>

                    <div
                      className="bg-black p-4 flex flex-col justify-between h-24 cursor-pointer hover:bg-white/5 transition-colors group"
                      onClick={() => copyToClipboard(affiliateData?.code || '', 'Code')}
                    >
                      <div className="flex items-end justify-between h-full">
                        <div className="w-full">
                          <span className="text-[10px] uppercase text-white/30 font-bold block mb-1">Affiliate Code</span>
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-xl font-mono text-white truncate leading-none">
                              {affiliateData?.code || <span className="text-white/20 text-sm">NO CODE</span>}
                            </span>
                          </div>
                        </div>
                        <Copy className="w-4 h-4 text-white/20 group-hover:text-white transition-colors mb-1" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Link
                      to="/affiliate/dashboard"
                      className="flex-1 bg-white text-black py-3 px-4 font-black text-[10px] uppercase text-center hover:bg-white/80 transition"
                    >
                      View Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        if (affiliateData?.code) {
                          const inviteLink = `${window.location.origin}/join?ref=${affiliateData.code}`;
                          copyToClipboard(inviteLink, 'Invite Link');
                        } else {
                          showError('No affiliate code available');
                        }
                      }}
                      className="flex-1 bg-white/10 py-3 px-4 font-black text-[10px] uppercase text-center hover:bg-white/20 transition text-white"
                    >
                      Invite Affiliate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Section */}
            {expandedSections['settings'] && (
              <div ref={el => sectionRefs.current['settings'] = el} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col px-0 py-2 mb-8 items-start">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-white/40" />
                    <h2 className="text-lg font-black text-white tracking-widest uppercase">Account Settings</h2>
                  </div>
                  <button onClick={() => handleSectionToggle('settings')} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-tighter">Close Console</button>
                </div>
                <div className="bg-[#0a0a0a] p-6">
                  <div className="space-y-4 max-w-2xl">
                    <AdminBentoRow label="Tier" value={tier || 'Free'} />
                    <AdminBentoRow label="Status" value={<span className="text-green-500">Active</span>} />
                    <AdminBentoRow label="Invites" value="0 Available" />
                    <div className="pt-4">
                      <Link
                        to="/settings"
                        className="flex items-center justify-between text-xs uppercase font-bold text-white/50 hover:text-white transition bg-black p-4"
                      >
                        Manage Details <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Support CTA */}
        <div className="mt-8 bg-[#050505] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider">Need help with your apps?</h3>
            <p className="text-xs text-white/40">Check out our contributor guides or reach out to support.</p>
          </div>
          <div className="flex gap-4">
            <Link to="/docs" className="text-[10px] uppercase font-bold text-white/60 hover:text-white underline underline-offset-4">Read Docs</Link>
            <Link to="/support" className="text-[10px] uppercase font-bold text-white/60 hover:text-white underline underline-offset-4">Get Support</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
