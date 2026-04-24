/**
 * Kattitude Tattoo Studio — Shop Owner Admin Dashboard
 * Route: /admin/kattitude
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { isAdmin } from '../utils/admin';
import { AnimatedNumber } from '../components/ui/animated-number';
import { LoadingOverlay } from '../components/Loading';
import { cn } from '../components/ui/utils';

interface Artist {
  id: string;
  name: string;
  bio: string | null;
  profile_image_url: string | null;
  specialties: string[];
  instagram_handle: string | null;
  user_email: string | null;
  client_count?: number;
  session_count?: number;
  total_revenue?: number;
}

interface Waiver {
  id: string;
  client_name: string;
  client_email: string;
  newsletter_opt_in: boolean;
  agreed_to_terms: boolean;
  created_at: string;
  artist_id: string | null;
}

interface OverviewStats {
  totalArtists: number;
  totalClients: number;
  totalRevenue: number;
  weekSessions: number;
  totalWaivers: number;
}

interface AddArtistForm {
  name: string;
  bio: string;
  specialties: string;
  instagram_handle: string;
  user_email: string;
}

const EMPTY_ARTIST_FORM: AddArtistForm = {
  name: '', bio: '', specialties: '', instagram_handle: '', user_email: '',
};

export default function AdminKattitude() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [stats, setStats] = useState<OverviewStats>({
    totalArtists: 0, totalClients: 0, totalRevenue: 0, weekSessions: 0, totalWaivers: 0,
  });
  const [artists, setArtists] = useState<Artist[]>([]);
  const [waivers, setWaivers] = useState<Waiver[]>([]);

  const [showAddArtist, setShowAddArtist] = useState(false);
  const [artistForm, setArtistForm] = useState<AddArtistForm>(EMPTY_ARTIST_FORM);
  const [savingArtist, setSavingArtist] = useState(false);
  const [artistError, setArtistError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'artists' | 'waivers'>('overview');

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (!user) { navigate('/'); return; }
      const ok = await isAdmin().catch(() => false);
      if (!ok) { navigate('/'); return; }
      setAuthorized(true);
    })();
  }, [user, authLoading]);

  useEffect(() => {
    if (!authorized) return;
    loadAll();
  }, [authorized]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', 'kattitude')
        .maybeSingle();

      if (!biz) { setLoading(false); return; }
      setBusinessId(biz.id);

      const { data: artistData } = await supabase
        .from('artists')
        .select('id, name, bio, profile_image_url, specialties, instagram_handle, user_email')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: true });

      const enriched: Artist[] = await Promise.all(
        (artistData || []).map(async (a) => {
          const [{ count: clientCount }, { data: sessions }] = await Promise.all([
            supabase.from('artist_clients').select('*', { count: 'exact', head: true }).eq('artist_id', a.id),
            supabase.from('artist_sessions').select('amount, tip, status').eq('artist_id', a.id),
          ]);
          const completed = (sessions || []).filter(s => s.status === 'completed');
          const revenue = completed.reduce((s, x) => s + Number(x.amount || 0) + Number(x.tip || 0), 0);
          return { ...a, client_count: clientCount || 0, session_count: completed.length, total_revenue: revenue };
        })
      );
      setArtists(enriched);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: weekCount } = await supabase
        .from('artist_sessions')
        .select('*', { count: 'exact', head: true })
        .in('artist_id', enriched.map(a => a.id))
        .gte('date', weekAgo.toISOString().split('T')[0]);

      const { data: waiverData } = await supabase
        .from('waivers')
        .select('id, client_name, client_email, newsletter_opt_in, agreed_to_terms, created_at, artist_id')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setWaivers(waiverData || []);

      setStats({
        totalArtists: enriched.length,
        totalClients: enriched.reduce((s, a) => s + (a.client_count || 0), 0),
        totalRevenue: enriched.reduce((s, a) => s + (a.total_revenue || 0), 0),
        weekSessions: weekCount || 0,
        totalWaivers: (waiverData || []).length,
      });
    } catch (err) {
      console.error('[AdminKattitude] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setArtistError(null);
    setSavingArtist(true);
    try {
      const specialties = artistForm.specialties.split(',').map(s => s.trim()).filter(Boolean);
      const { error } = await supabase.from('artists').insert({
        business_id: businessId,
        name: artistForm.name.trim(),
        bio: artistForm.bio.trim() || null,
        specialties,
        instagram_handle: artistForm.instagram_handle.trim() || null,
        user_email: artistForm.user_email.trim().toLowerCase() || null,
      });
      if (error) throw error;
      setShowAddArtist(false);
      setArtistForm(EMPTY_ARTIST_FORM);
      await loadAll();
    } catch (err: any) {
      setArtistError(err.message || 'Failed to add artist.');
    } finally {
      setSavingArtist(false);
    }
  };

  const handleDeleteArtist = async (id: string) => {
    if (!confirm('Delete this artist and all their data? This cannot be undone.')) return;
    await supabase.from('artists').delete().eq('id', id);
    await loadAll();
  };

  if (authLoading || authorized === null || loading) return <LoadingOverlay />;

  const STAT_CARDS = [
    { label: 'Artists', value: stats.totalArtists, icon: <UsersIcon className="w-5 h-5" /> },
    { label: 'Total Clients', value: stats.totalClients, icon: <UsersIcon className="w-5 h-5" /> },
    { label: 'Sessions This Week', value: stats.weekSessions, icon: <CalendarIcon className="w-5 h-5" /> },
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: <CurrencyDollarIcon className="w-5 h-5" />, green: true },
  ];

  return (
    <div className="min-h-screen bg-black text-white max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors">
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-black text-white uppercase text-[clamp(1.25rem,3vw,2rem)] leading-none">KATTITUDE</h1>
              <p className="text-white/30 text-xs uppercase tracking-widest font-bold mt-0.5">Tattoo Studio — Austin, TX</p>
            </div>
          </div>
          <Link to="/kattitude" target="_blank"
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
            <LinkIcon className="w-3 h-3" />
            View Site
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {STAT_CARDS.map(card => (
          <div key={card.label} className="bg-white/5 p-4">
            <div className="flex items-center gap-2 text-white/30 mb-3">
              {card.icon}
              <span className="text-[9px] font-black uppercase tracking-widest">{card.label}</span>
            </div>
            <p className={cn('text-2xl font-black', card.green ? 'text-green-400' : 'text-white')}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-white/5">
        {(['overview', 'artists', 'waivers'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
              activeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white')}>
            {tab}
            {tab === 'waivers' && stats.totalWaivers > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-white/20 text-[8px] rounded-sm">{stats.totalWaivers}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white/5 p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />Artist Roster
            </h2>
            {artists.length === 0 ? (
              <p className="text-white/30 text-sm">No artists added yet.</p>
            ) : (
              <div className="space-y-3">
                {artists.map(a => (
                  <Link key={a.id} to={`/admin/kattitude/artist/${a.id}`}
                    className="flex items-center justify-between py-3 border-b border-white/5 hover:border-white/20 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-xs font-black text-white/50">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{a.name}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-widest">
                          {a.client_count} clients · {a.session_count} sessions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-green-400 font-bold text-sm">${(a.total_revenue || 0).toLocaleString()}</span>
                      <ChevronRightIcon className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {waivers.length > 0 && (
            <div className="bg-white/5 p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-4 h-4" />Recent Waivers
              </h2>
              <div className="space-y-2">
                {waivers.slice(0, 5).map(w => (
                  <div key={w.id} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <p className="text-sm font-bold">{w.client_name}</p>
                      <p className="text-[9px] text-white/30">{w.client_email}</p>
                    </div>
                    <span className="text-[9px] text-white/30 uppercase tracking-widest">
                      {new Date(w.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
              {waivers.length > 5 && (
                <button onClick={() => setActiveTab('waivers')}
                  className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                  View all {waivers.length} waivers →
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Artists Tab */}
      {activeTab === 'artists' && (
        <motion.div key="artists" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/50">
              {artists.length} Artist{artists.length !== 1 ? 's' : ''}
            </h2>
            <button onClick={() => setShowAddArtist(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-colors">
              <PlusIcon className="w-3.5 h-3.5" />Add Artist
            </button>
          </div>

          {showAddArtist && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 p-6">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4">New Artist</h3>
              <form onSubmit={handleAddArtist} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Name *</label>
                    <input required value={artistForm.name} onChange={e => setArtistForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Artist name"
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Login Email</label>
                    <input type="email" value={artistForm.user_email} onChange={e => setArtistForm(f => ({ ...f, user_email: e.target.value }))}
                      placeholder="artist@email.com"
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Specialties (comma-separated)</label>
                    <input value={artistForm.specialties} onChange={e => setArtistForm(f => ({ ...f, specialties: e.target.value }))}
                      placeholder="Traditional, Blackwork, Realism"
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Instagram Handle</label>
                    <input value={artistForm.instagram_handle} onChange={e => setArtistForm(f => ({ ...f, instagram_handle: e.target.value }))}
                      placeholder="artisthandle"
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Bio</label>
                  <textarea rows={3} value={artistForm.bio} onChange={e => setArtistForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Short artist bio…"
                    className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40 resize-none" />
                </div>
                {artistError && <p className="text-red-400 text-xs">{artistError}</p>}
                <div className="flex gap-3">
                  <button type="submit" disabled={savingArtist}
                    className="px-6 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 transition-colors">
                    {savingArtist ? 'Saving…' : 'Add Artist'}
                  </button>
                  <button type="button" onClick={() => { setShowAddArtist(false); setArtistForm(EMPTY_ARTIST_FORM); }}
                    className="px-6 py-2 border border-white/20 text-white/50 font-black text-[10px] uppercase tracking-widest hover:text-white hover:border-white/40 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {artists.length === 0 ? (
            <div className="py-16 text-center border border-white/10">
              <UsersIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm uppercase tracking-widest font-bold">No artists yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {artists.map(a => (
                <div key={a.id} className="bg-white/5 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 flex items-center justify-center text-sm font-black text-white">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{a.name}</h3>
                        {a.user_email && <p className="text-[9px] text-white/30">{a.user_email}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteArtist(a.id)}
                      className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {a.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {a.specialties.map(s => (
                        <span key={s} className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border border-white/10 text-white/40">{s}</span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Clients', val: a.client_count },
                      { label: 'Sessions', val: a.session_count },
                      { label: 'Revenue', val: `$${(a.total_revenue || 0).toLocaleString()}`, green: true },
                    ].map(c => (
                      <div key={c.label} className="text-center p-2 bg-black/30">
                        <p className={cn('text-lg font-black', c.green ? 'text-green-400' : 'text-white')}>{c.val}</p>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest">{c.label}</p>
                      </div>
                    ))}
                  </div>

                  <Link to={`/admin/kattitude/artist/${a.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:border-white/30 transition-colors">
                    View Dashboard <ChevronRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Waivers Tab */}
      {activeTab === 'waivers' && (
        <motion.div key="waivers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/50">
              {waivers.length} Waiver{waivers.length !== 1 ? 's' : ''}
            </h2>
            <Link to="/kattitude/waiver" target="_blank"
              className="flex items-center gap-1.5 px-4 py-2 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:border-white/30 transition-colors">
              <LinkIcon className="w-3 h-3" />Waiver Form
            </Link>
          </div>

          {waivers.length === 0 ? (
            <div className="py-16 text-center border border-white/10">
              <ClipboardDocumentListIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm uppercase tracking-widest font-bold">No waivers yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Client', 'Email', 'Newsletter', 'Terms', 'Date'].map(h => (
                      <th key={h} className="text-left py-3 px-2 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {waivers.map(w => (
                    <tr key={w.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 font-bold text-white">{w.client_name}</td>
                      <td className="py-3 px-2 text-white/50 text-xs">{w.client_email}</td>
                      <td className="py-3 px-2">
                        {w.newsletter_opt_in ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <span className="text-white/20 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-2">
                        {w.agreed_to_terms ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <ExclamationCircleIcon className="w-4 h-4 text-red-400" />}
                      </td>
                      <td className="py-3 px-2 text-white/30 text-xs">
                        {new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
