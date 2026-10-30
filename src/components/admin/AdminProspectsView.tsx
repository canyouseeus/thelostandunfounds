/**
 * Prospects — admin panel.
 *
 * Leads the client-hunter agent found, each with the reason it thinks they
 * need us (and the page that says so) and a drafted first email. Nothing is
 * sent until you open one, read it, edit it if you like, and tap SEND. Mail
 * goes from media@ with media@ on CC, capped per day by the server.
 */

import { useEffect, useState } from 'react';
import { ArrowPathIcon, ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { logApiCall, logError } from '../../lib/adminErrorLog';

const surface = { borderRadius: 0 } as const;

type Status = 'new' | 'sending' | 'sent' | 'replied' | 'won' | 'pass' | 'opted_out' | 'failed';

interface Prospect {
  id: string;
  segment: 'photography' | 'agency';
  business_name: string;
  domain: string;
  website: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  email_source_url: string | null;
  location: string | null;
  signal: string;
  signal_url: string;
  fit_score: number;
  draft_subject: string | null;
  draft_body: string | null;
  status: Status;
  send_error: string | null;
  notes: string | null;
  created_at: string;
  sent_at: string | null;
}

interface ListResponse {
  prospects: Prospect[];
  sentToday: number;
  dailyCap: number;
  canSend: boolean;
}

const FILTERS = [
  { id: 'new', label: 'To Review' },
  { id: 'sent', label: 'Sent' },
  { id: 'all', label: 'All' },
] as const;

const STATUS_LABEL: Record<Status, string> = {
  new: 'To review',
  sending: 'Sending…',
  sent: 'Sent',
  replied: 'Replied',
  won: 'Won',
  pass: 'Passed',
  opted_out: 'Opted out',
  failed: 'Send failed',
};

async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method || 'GET';
  const res = await fetch(`/api/admin/prospects${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  logApiCall(method, '/api/admin/prospects', res.status, res.ok ? 'ok' : body?.error || 'failed');
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' }) : '—');

export function AdminProspectsView({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('new');
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Prospect | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const d = await api<ListResponse>(`?status=${filter}`);
      setData(d);
      if (filter === 'new') onCountChange?.(d.prospects.filter(p => p.status === 'new').length);
    } catch (e: any) {
      setErr(e.message);
      logError(`Prospects: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => {
    const t = setInterval(() => { if (!open) load(); }, 30_000);
    return () => clearInterval(t);
  }, [filter, open]);

  const openProspect = (p: Prospect) => {
    setOpen(p);
    setSubject(p.draft_subject || '');
    setBody(p.draft_body || '');
    setFlash(null);
    setErr(null);
  };

  const act = async (action: string) => {
    if (!open) return;
    if (action === 'send' && !window.confirm(`Send this email to ${open.contact_email}?`)) return;
    setBusy(action);
    setErr(null);
    try {
      const r = await api<{ prospect: Prospect }>('', {
        method: 'POST',
        body: JSON.stringify({ id: open.id, action, subject, body }),
      });
      setOpen(r.prospect);
      setFlash(action === 'send' ? `Sent to ${open.contact_email}, CC media@.` : `Marked ${STATUS_LABEL[r.prospect.status].toLowerCase()}.`);
      load();
    } catch (e: any) {
      setErr(e.message);
      logError(`Prospects ${action}: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const btn = 'px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-30';
  const field = 'w-full bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:bg-white/10 transition-colors';

  if (open) {
    const reviewing = open.status === 'new' || open.status === 'failed';
    const capReached = !!data && data.sentToday >= data.dailyCap;
    return (
      <div className="space-y-4 pb-12 text-left">
        <button onClick={() => { setOpen(null); load(); }} className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 hover:text-white">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>

        <div className="bg-white/5 p-4 space-y-2" style={surface}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">{open.business_name}</h2>
            <span className="shrink-0 text-xs font-bold text-white/60">FIT {open.fit_score}/10</span>
          </div>
          <p className="text-xs uppercase tracking-widest text-white/40">
            {open.segment === 'photography' ? 'Photography' : 'Agency / Ops'} · {open.location || 'Location unknown'} · {STATUS_LABEL[open.status]}
          </p>
          {open.website && (
            <a href={open.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-white/60 underline hover:text-white">
              {open.domain} <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </a>
          )}
        </div>

        <div data-tour="prospect-signal" className="bg-white/5 p-4 space-y-2" style={surface}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Why Them</h3>
          <p className="text-sm text-white/80 leading-relaxed">{open.signal}</p>
          <a href={open.signal_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-white/60 underline hover:text-white">
            Source <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          </a>
        </div>

        <div className="bg-white/5 p-4 space-y-1" style={surface}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Contact</h3>
          <p className="text-sm text-white">{[open.contact_name, open.contact_role].filter(Boolean).join(', ') || 'No name found'}</p>
          <p className="text-sm text-white/70">{open.contact_email || 'No email found'}</p>
          {open.email_source_url && (
            <a href={open.email_source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-white/60 underline hover:text-white">
              Where the email was found <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </a>
          )}
        </div>

        <div data-tour="prospect-draft" className="bg-white/5 p-4 space-y-3" style={surface}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">The Email</h3>
          <input value={subject} onChange={e => setSubject(e.target.value)} disabled={!reviewing} placeholder="Subject" className={field} style={surface} />
          <textarea value={body} onChange={e => setBody(e.target.value)} disabled={!reviewing} rows={12} className={`${field} leading-relaxed`} style={surface} />
          <p className="text-[11px] text-white/30">Sent from media@ with media@ on CC. An opt-out line and the business mailing address are added below your text.</p>
        </div>

        {open.send_error && <p className="text-sm text-red-400">Last send failed: {open.send_error}</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        {flash && <p className="text-sm text-green-400">{flash}</p>}

        {reviewing ? (
          <div className="flex flex-wrap gap-2">
            <button
              data-tour="prospect-send"
              onClick={() => act('send')}
              disabled={!!busy || !open.contact_email || !data?.canSend || capReached}
              className={`${btn} bg-white text-black hover:bg-white/80`}
              style={surface}
            >
              {busy === 'send' ? 'Sending…' : 'Send'}
            </button>
            <button onClick={() => act('save')} disabled={!!busy} className={`${btn} bg-white/10 text-white hover:bg-white/20`} style={surface}>
              {busy === 'save' ? 'Saving…' : 'Save Edits'}
            </button>
            <button data-tour="prospect-pass" onClick={() => act('pass')} disabled={!!busy} className={`${btn} bg-white/10 text-white hover:bg-white/20`} style={surface}>
              Pass
            </button>
            {!data?.canSend && <p className="w-full text-xs text-amber-400">Sending is off until OUTREACH_POSTAL_ADDRESS is set in Vercel. Cold email must carry a mailing address.</p>}
            {capReached && <p className="w-full text-xs text-amber-400">Today's cap of {data?.dailyCap} is used. Send more tomorrow.</p>}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(['replied', 'won', 'opted_out', 'pass'] as const).filter(s => s !== open.status).map(s => (
              <button key={s} onClick={() => act(s)} disabled={!!busy} className={`${btn} bg-white/10 text-white hover:bg-white/20`} style={surface}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div data-tour="prospects-filters" className="flex bg-[#0a0a0a] w-fit">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${filter === f.id ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
              style={surface}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span data-tour="prospects-cap" className="text-xs font-bold uppercase tracking-widest text-white/50">
              Sent today {data.sentToday}/{data.dailyCap}
            </span>
          )}
          <button onClick={load} className="p-2 text-white/50 hover:text-white" aria-label="Refresh">
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <div data-tour="prospects-list" className="space-y-px">
        {data && data.prospects.length === 0 && !loading && (
          <p className="py-8 text-xs uppercase tracking-widest text-white/30">
            {filter === 'new' ? 'Nothing to review. The agent adds new leads every weekday.' : 'None yet.'}
          </p>
        )}
        {data?.prospects.map((p, i) => (
          <button
            key={p.id}
            data-tour={i === 0 ? 'prospect-row' : undefined}
            onClick={() => openProspect(p)}
            className="w-full bg-white/5 hover:bg-white/10 p-4 text-left transition-colors"
            style={surface}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-white truncate">{p.business_name}</p>
                <p className="text-xs text-white/50 mt-1 line-clamp-2">{p.signal}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-bold text-white">{p.fit_score}/10</p>
                <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">{p.segment === 'photography' ? 'Photo' : 'Agency'}</p>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mt-2">
              {STATUS_LABEL[p.status]} · {p.status === 'new' ? `Found ${day(p.created_at)}` : `Sent ${day(p.sent_at)}`}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
