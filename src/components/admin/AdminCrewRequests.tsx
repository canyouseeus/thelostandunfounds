import { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

/**
 * What the roster has asked for.
 *
 * The counterpart to the ask-box on the photographer dashboard. A reply typed
 * here shows up on the asker's own dashboard next to what they asked, which is
 * the whole reason the request is a row rather than an email: an email answer
 * is visible to exactly one person until somebody forwards it.
 *
 * Open first, deliberately: the queue is only useful if the unanswered end of
 * it is the end you land on.
 */

interface CrewRequest {
  id: string;
  photographer_id: string | null;
  name: string | null;
  email: string | null;
  kind: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  page_url: string | null;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  question: 'Question',
  feature: 'Feature request',
  issue: 'Something broken',
  gear: 'Gear',
  booking: 'Scheduling',
  payment: 'Getting paid',
  other: 'Other',
};

const STATUS_TONE: Record<string, string> = {
  open: 'text-amber-400',
  in_progress: 'text-blue-400',
  answered: 'text-green-400',
  closed: 'text-white/30',
};

const FILTERS = ['open', 'in_progress', 'answered', 'closed', 'all'] as const;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AdminCrewRequests({ adminEmail }: { adminEmail?: string }) {
  const [requests, setRequests] = useState<CrewRequest[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(adminEmail ? { 'x-admin-email': adminEmail } : {}),
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = filter === 'all' ? '' : `&status=${filter}`;
      const res = await fetch(`/api/crew/requests?admin=1${query}`, { headers });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || 'Could not load requests.');
        return;
      }
      setRequests(payload.requests || []);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, adminEmail]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/crew/requests', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error || 'Could not update that request.');
        return;
      }
      setReplyFor(null);
      setReplyText('');
      await load();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="text-white">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {FILTERS.map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
              filter === option ? 'bg-white text-black' : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
            }`}
            style={{ borderRadius: 0 }}
          >
            {option.replace('_', ' ')}
          </button>
        ))}
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors ml-auto"
          style={{ borderRadius: 0 }}
        >
          <ArrowPathIcon className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-6 text-left">{error}</div>}
      {loading && <div className="text-xs uppercase tracking-[0.3em] text-white/40">Loading requests…</div>}
      {!loading && !requests.length && (
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">
          {filter === 'open' ? 'Nothing waiting on you.' : 'Nothing here.'}
        </div>
      )}

      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="bg-white/5 p-5 text-left" style={{ borderRadius: 0 }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight">
                  {request.name || 'Unknown'}
                </h3>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {KIND_LABEL[request.kind] || request.kind} · {when(request.created_at)}
                  {request.email ? ` · ${request.email}` : ''}
                </p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${STATUS_TONE[request.status] || 'text-white/40'}`}>
                {request.status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-sm text-white/80 mt-3 whitespace-pre-wrap">{request.message}</p>

            {request.page_url && (
              <p className="text-[10px] text-white/25 mt-2 break-all">{request.page_url}</p>
            )}

            {request.admin_reply && (
              <div className="mt-3 bg-white/5 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
                  Your reply{request.replied_at ? ` · ${when(request.replied_at)}` : ''}
                </p>
                <p className="text-sm text-white/80 whitespace-pre-wrap">{request.admin_reply}</p>
              </div>
            )}

            {replyFor === request.id ? (
              <div className="mt-4 space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="They'll see this on their dashboard."
                  className="w-full bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none resize-y"
                  style={{ borderRadius: 0 }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => patch(request.id, { reply: replyText })}
                    disabled={saving || !replyText.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/80 transition-colors disabled:opacity-40"
                    style={{ borderRadius: 0 }}
                  >
                    <CheckIcon className="w-3 h-3" />
                    {saving ? 'Saving…' : 'Send Reply'}
                  </button>
                  <button
                    onClick={() => { setReplyFor(null); setReplyText(''); }}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white/10 text-white/60 hover:bg-white hover:text-black transition-colors"
                    style={{ borderRadius: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => { setReplyFor(request.id); setReplyText(request.admin_reply || ''); }}
                  className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  {request.admin_reply ? 'Edit Reply' : 'Reply'}
                </button>
                {request.status !== 'in_progress' && (
                  <button
                    onClick={() => patch(request.id, { status: 'in_progress' })}
                    disabled={saving}
                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-white/10 text-white/60 hover:bg-white hover:text-black transition-colors disabled:opacity-40"
                    style={{ borderRadius: 0 }}
                  >
                    On It
                  </button>
                )}
                {request.status !== 'closed' && (
                  <button
                    onClick={() => patch(request.id, { status: 'closed' })}
                    disabled={saving}
                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-white/10 text-white/60 hover:bg-white hover:text-black transition-colors disabled:opacity-40"
                    style={{ borderRadius: 0 }}
                  >
                    Close
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
