/**
 * Kattitude — Per-Artist Dashboard
 * Route: /admin/kattitude/artist/:artistId
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { isAdmin } from '../utils/admin';
import { LoadingOverlay } from '../components/Loading';
import { cn } from '../components/ui/utils';

interface Artist {
  id: string;
  name: string;
  bio: string | null;
  specialties: string[];
  instagram_handle: string | null;
  user_email: string | null;
  profile_image_url: string | null;
}

interface Client {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  created_at: string;
}

interface Session {
  id: string;
  client_id: string | null;
  date: string;
  duration_hours: number | null;
  amount: number;
  tip: number;
  type: string;
  status: string;
  notes: string | null;
  client?: Client;
}

type Tab = 'overview' | 'clients' | 'sessions' | 'portfolio';

const SESSION_TYPES = ['consultation', 'session', 'touchup'];
const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'];

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'text-blue-400 bg-blue-400/10',
  completed: 'text-green-400 bg-green-400/10',
  cancelled: 'text-white/30 bg-white/5',
  'no-show': 'text-red-400 bg-red-400/10',
};

export default function AdminKattitudeArtist() {
  const { artistId } = useParams<{ artistId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [artist, setArtist] = useState<Artist | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Modals
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);

  // Add client form
  const [clientForm, setClientForm] = useState({ client_name: '', client_email: '', client_phone: '', notes: '' });
  const [savingClient, setSavingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Add session form
  const [sessionForm, setSessionForm] = useState({
    client_id: '',
    date: new Date().toISOString().split('T')[0],
    duration_hours: '',
    amount: '',
    tip: '',
    type: 'session',
    status: 'scheduled',
    notes: '',
  });
  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (!user) { navigate('/'); return; }
      const ok = await isAdmin().catch(() => false);
      if (!ok) { navigate('/'); return; }
      setAuthorized(true);
    })();
  }, [user, authLoading]);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authorized || !artistId) return;
    loadAll();
  }, [authorized, artistId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: artistData, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .maybeSingle();

      if (error || !artistData) { navigate('/admin/kattitude'); return; }
      setArtist(artistData);

      const [{ data: clientData }, { data: sessionData }] = await Promise.all([
        supabase
          .from('artist_clients')
          .select('*')
          .eq('artist_id', artistId)
          .order('created_at', { ascending: false }),
        supabase
          .from('artist_sessions')
          .select('*')
          .eq('artist_id', artistId)
          .order('date', { ascending: false }),
      ]);

      const clientMap = new Map((clientData || []).map(c => [c.id, c]));
      const enrichedSessions: Session[] = (sessionData || []).map(s => ({
        ...s,
        client: s.client_id ? clientMap.get(s.client_id) : undefined,
      }));

      setClients(clientData || []);
      setSessions(enrichedSessions);
    } catch (err) {
      console.error('[ArtistDashboard] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Revenue stats ─────────────────────────────────────────────────────────
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const totalRevenue = completedSessions.reduce((s, x) => s + Number(x.amount || 0) + Number(x.tip || 0), 0);
  const totalTips = completedSessions.reduce((s, x) => s + Number(x.tip || 0), 0);

  const upcomingSessions = sessions
    .filter(s => s.status === 'scheduled' && s.date >= new Date().toISOString().split('T')[0])
    .slice(0, 5);

  // ── Add client ────────────────────────────────────────────────────────────
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setSavingClient(true);
    try {
      const { error } = await supabase.from('artist_clients').insert({
        artist_id: artistId,
        client_name: clientForm.client_name.trim(),
        client_email: clientForm.client_email.trim().toLowerCase() || null,
        client_phone: clientForm.client_phone.trim() || null,
        notes: clientForm.notes.trim() || null,
      });
      if (error) throw error;
      setShowAddClient(false);
      setClientForm({ client_name: '', client_email: '', client_phone: '', notes: '' });
      await loadAll();
    } catch (err: any) {
      setClientError(err.message || 'Failed to add client.');
    } finally {
      setSavingClient(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Delete this client and their session history?')) return;
    await supabase.from('artist_clients').delete().eq('id', id);
    await loadAll();
  };

  // ── Add session ───────────────────────────────────────────────────────────
  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);
    setSavingSession(true);
    try {
      const { error } = await supabase.from('artist_sessions').insert({
        artist_id: artistId,
        client_id: sessionForm.client_id || null,
        date: sessionForm.date,
        duration_hours: sessionForm.duration_hours ? Number(sessionForm.duration_hours) : null,
        amount: Number(sessionForm.amount) || 0,
        tip: Number(sessionForm.tip) || 0,
        type: sessionForm.type,
        status: sessionForm.status,
        notes: sessionForm.notes.trim() || null,
      });
      if (error) throw error;
      setShowAddSession(false);
      setSessionForm({
        client_id: '', date: new Date().toISOString().split('T')[0],
        duration_hours: '', amount: '', tip: '', type: 'session', status: 'scheduled', notes: '',
      });
      await loadAll();
    } catch (err: any) {
      setSessionError(err.message || 'Failed to add session.');
    } finally {
      setSavingSession(false);
    }
  };

  const handleUpdateSessionStatus = async (id: string, status: string) => {
    await supabase.from('artist_sessions').update({ status }).eq('id', id);
    await loadAll();
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    await supabase.from('artist_sessions').delete().eq('id', id);
    await loadAll();
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading || authorized === null || loading) return <LoadingOverlay />;
  if (!artist) return null;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'clients', label: 'Clients', count: clients.length },
    { id: 'sessions', label: 'Sessions', count: sessions.length },
    { id: 'portfolio', label: 'Portfolio' },
  ];

  return (
    <div className="min-h-screen bg-black text-white max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/admin/kattitude"
            className="p-2 border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Link>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-0.5">
              Kattitude Tattoo Studio
            </p>
            <h1 className="font-black text-white uppercase text-2xl sm:text-3xl leading-none">
              {artist.name}
            </h1>
          </div>
        </div>

        {artist.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {artist.specialties.map(s => (
              <span key={s} className="text-[8px] font-black uppercase tracking-widest px-2 py-1 border border-white/10 text-white/40">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Clients', value: clients.length, icon: <UsersIcon className="w-5 h-5" /> },
          { label: 'Completed Sessions', value: completedSessions.length, icon: <CheckCircleIcon className="w-5 h-5" /> },
          { label: 'Total Earned', value: `$${totalRevenue.toLocaleString()}`, icon: <CurrencyDollarIcon className="w-5 h-5" />, green: true },
          { label: 'Tips', value: `$${totalTips.toLocaleString()}`, icon: <CurrencyDollarIcon className="w-5 h-5" /> },
        ].map(c => (
          <div key={c.label} className="bg-white/5 p-4">
            <div className="flex items-center gap-2 text-white/30 mb-3">
              {c.icon}
              <span className="text-[9px] font-black uppercase tracking-widest">{c.label}</span>
            </div>
            <p className={cn('text-2xl font-black', c.green ? 'text-green-400' : 'text-white')}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 p-1 bg-white/5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
              activeTab === tab.id ? 'bg-white text-black' : 'text-white/40 hover:text-white'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 text-[8px] opacity-60">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}

      {/* ── Overview Tab ────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Upcoming sessions */}
          <div className="bg-white/5 p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Upcoming Appointments
            </h2>
            {upcomingSessions.length === 0 ? (
              <p className="text-white/30 text-sm">No upcoming appointments.</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <p className="font-bold text-white text-sm">
                        {s.client?.client_name || 'Walk-in'}
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest">
                        {s.type} · {s.duration_hours ? `${s.duration_hours}h` : 'TBD'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{s.date}</p>
                      <p className="text-[9px] text-white/30">${Number(s.amount).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bio */}
          {artist.bio && (
            <div className="bg-white/5 p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-white/50 mb-3">Bio</h2>
              <p className="text-white/70 text-sm leading-relaxed">{artist.bio}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Clients Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'clients' && (
        <motion.div key="clients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/50">
              {clients.length} Client{clients.length !== 1 ? 's' : ''}
            </h2>
            <button
              onClick={() => setShowAddClient(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add Client
            </button>
          </div>

          {/* Add client form */}
          <AnimatePresence>
            {showAddClient && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/5 border border-white/10 p-6"
              >
                <h3 className="text-sm font-black uppercase tracking-widest mb-4">New Client</h3>
                <form onSubmit={handleAddClient} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Name *</label>
                      <input
                        required
                        value={clientForm.client_name}
                        onChange={e => setClientForm(f => ({ ...f, client_name: e.target.value }))}
                        placeholder="Client name"
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Email</label>
                      <input
                        type="email"
                        value={clientForm.client_email}
                        onChange={e => setClientForm(f => ({ ...f, client_email: e.target.value }))}
                        placeholder="client@email.com"
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={clientForm.client_phone}
                        onChange={e => setClientForm(f => ({ ...f, client_phone: e.target.value }))}
                        placeholder="(512) 555-0100"
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Notes</label>
                      <input
                        value={clientForm.notes}
                        onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Preferences, allergies, etc."
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      />
                    </div>
                  </div>
                  {clientError && <p className="text-red-400 text-xs">{clientError}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={savingClient}
                      className="px-6 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 transition-colors">
                      {savingClient ? 'Saving…' : 'Add Client'}
                    </button>
                    <button type="button" onClick={() => setShowAddClient(false)}
                      className="px-6 py-2 border border-white/20 text-white/50 font-black text-[10px] uppercase tracking-widest hover:text-white hover:border-white/40 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Client list */}
          {clients.length === 0 ? (
            <div className="py-16 text-center border border-white/10">
              <UsersIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm uppercase tracking-widest font-bold">No clients yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map(c => {
                const clientSessions = sessions.filter(s => s.client_id === c.id);
                const clientRevenue = clientSessions
                  .filter(s => s.status === 'completed')
                  .reduce((sum, s) => sum + Number(s.amount || 0) + Number(s.tip || 0), 0);
                return (
                  <div key={c.id} className="bg-white/5 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-xs font-black text-white/50 flex-shrink-0">
                        {c.client_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate">{c.client_name}</p>
                        <p className="text-[9px] text-white/30 truncate">
                          {c.client_email || c.client_phone || 'No contact info'}
                        </p>
                        {c.notes && (
                          <p className="text-[9px] text-white/20 italic truncate">{c.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-400">${clientRevenue.toLocaleString()}</p>
                        <p className="text-[9px] text-white/30">{clientSessions.length} sessions</p>
                      </div>
                      <button onClick={() => handleDeleteClient(c.id)}
                        className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Sessions Tab ────────────────────────────────────────────────── */}
      {activeTab === 'sessions' && (
        <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/50">
              {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
            </h2>
            <button
              onClick={() => setShowAddSession(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Log Session
            </button>
          </div>

          {/* Add session form */}
          <AnimatePresence>
            {showAddSession && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/5 border border-white/10 p-6"
              >
                <h3 className="text-sm font-black uppercase tracking-widest mb-4">Log Session</h3>
                <form onSubmit={handleAddSession} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Client</label>
                      <select
                        value={sessionForm.client_id}
                        onChange={e => setSessionForm(f => ({ ...f, client_id: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      >
                        <option value="">Walk-in / no client</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.client_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={sessionForm.date}
                        onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Type</label>
                      <select
                        value={sessionForm.type}
                        onChange={e => setSessionForm(f => ({ ...f, type: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      >
                        {SESSION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Status</label>
                      <select
                        value={sessionForm.status}
                        onChange={e => setSessionForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      >
                        {SESSION_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Amount ($)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={sessionForm.amount}
                        onChange={e => setSessionForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Tip ($)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={sessionForm.tip}
                        onChange={e => setSessionForm(f => ({ ...f, tip: e.target.value }))}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Duration (hours)</label>
                      <input
                        type="number" min="0" step="0.5"
                        value={sessionForm.duration_hours}
                        onChange={e => setSessionForm(f => ({ ...f, duration_hours: e.target.value }))}
                        placeholder="2.5"
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Notes</label>
                      <input
                        value={sessionForm.notes}
                        onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Design, placement, etc."
                        className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                      />
                    </div>
                  </div>
                  {sessionError && <p className="text-red-400 text-xs">{sessionError}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={savingSession}
                      className="px-6 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 transition-colors">
                      {savingSession ? 'Saving…' : 'Log Session'}
                    </button>
                    <button type="button" onClick={() => setShowAddSession(false)}
                      className="px-6 py-2 border border-white/20 text-white/50 font-black text-[10px] uppercase tracking-widest hover:text-white hover:border-white/40 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Session list */}
          {sessions.length === 0 ? (
            <div className="py-16 text-center border border-white/10">
              <CalendarIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm uppercase tracking-widest font-bold">No sessions logged</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id} className="bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={cn(
                          'text-[8px] font-black uppercase tracking-widest px-2 py-0.5',
                          STATUS_COLORS[s.status] || 'text-white/40 bg-white/5'
                        )}>
                          {s.status}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                          {s.type}
                        </span>
                      </div>
                      <p className="font-bold text-white text-sm">
                        {s.client?.client_name || 'Walk-in'}
                      </p>
                      <p className="text-[9px] text-white/30">
                        {s.date}
                        {s.duration_hours ? ` · ${s.duration_hours}h` : ''}
                        {s.notes ? ` · ${s.notes}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-green-400 text-sm">
                          ${(Number(s.amount) + Number(s.tip)).toLocaleString()}
                        </p>
                        {Number(s.tip) > 0 && (
                          <p className="text-[9px] text-white/30">+${Number(s.tip)} tip</p>
                        )}
                      </div>
                      {s.status === 'scheduled' && (
                        <button
                          onClick={() => handleUpdateSessionStatus(s.id, 'completed')}
                          className="p-1.5 text-white/30 hover:text-green-400 transition-colors"
                          title="Mark completed"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Portfolio Tab ────────────────────────────────────────────────── */}
      {activeTab === 'portfolio' && (
        <motion.div key="portfolio" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="py-16 text-center border border-white/10">
            <PhotoIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/30 text-sm uppercase tracking-widest font-bold mb-2">Portfolio Upload</p>
            <p className="text-white/20 text-xs max-w-xs mx-auto">
              Photo portfolio management coming soon — upload tattoo photos to showcase on the public site.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
