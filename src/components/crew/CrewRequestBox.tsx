import { useCallback, useEffect, useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

/**
 * Ask for anything, from the page you're already on.
 *
 * The owner's version of this is SAGE MODE, which opens a GitHub issue on the
 * spot. This is the crew-facing shape of the same idea and deliberately stops
 * short of the repo: it files a row, emails the owner, and shows the reply back
 * here. A question typed on Tuesday is then a thing with a status instead of a
 * text message somebody has to remember.
 *
 * The history below the box is the point as much as the box is. Without it,
 * sending is indistinguishable from shouting into a void; you can't tell
 * whether it arrived, whether it was read, or whether you already asked.
 */

const KINDS: Array<{ value: string; label: string }> = [
    { value: 'question', label: 'Question' },
    { value: 'feature', label: 'Feature request' },
    { value: 'issue', label: 'Something broken' },
    { value: 'gear', label: 'Gear' },
    { value: 'booking', label: 'Scheduling' },
    { value: 'payment', label: 'Getting paid' },
    { value: 'other', label: 'Other' },
];

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
    open: { label: 'Sent', tone: 'text-amber-400' },
    in_progress: { label: 'Being looked at', tone: 'text-blue-400' },
    answered: { label: 'Answered', tone: 'text-green-400' },
    closed: { label: 'Closed', tone: 'text-white/30' },
};

interface CrewRequest {
    id: string;
    kind: string;
    message: string;
    status: string;
    admin_reply: string | null;
    replied_at: string | null;
    created_at: string;
}

const when = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function CrewRequestBox() {
    const [kind, setKind] = useState('question');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<CrewRequest[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const authHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
        };
    };

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch('/api/crew/requests', { headers: await authHeaders() });
            if (res.ok) {
                const payload = await res.json();
                setHistory(payload.requests || []);
            }
        } catch {
            /* history is supporting detail: the box still works without it */
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const send = async () => {
        if (!message.trim()) return;
        setSending(true);
        setError(null);
        setSent(false);
        try {
            const res = await fetch('/api/crew/requests', {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify({ kind, message, pageUrl: window.location.href }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(payload?.error || 'Could not send that.');
                return;
            }
            setMessage('');
            setSent(true);
            await loadHistory();
        } catch {
            setError('Could not reach the server.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-white/5 p-5 sm:p-6 text-white" style={{ borderRadius: 0 }}>
            <div className="mb-5 text-left">
                <h2 className="text-lg font-black uppercase tracking-tight">Ask For Anything</h2>
                <p className="text-xs text-white/40 mt-1">
                    A question, something that isn't working, or a feature you want built;
                    type it here and it goes straight to the studio.
                </p>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
                {KINDS.map(option => (
                    <button
                        key={option.value}
                        onClick={() => setKind(option.value)}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                            kind === option.value
                                ? 'bg-white text-black'
                                : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                        }`}
                        style={{ borderRadius: 0 }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <textarea
                value={message}
                onChange={e => { setMessage(e.target.value); setSent(false); }}
                rows={4}
                maxLength={4000}
                placeholder="What do you need? Be as specific as you like; nobody is grading it."
                className="w-full bg-white/5 px-3 py-3 text-sm text-white placeholder-white/25 focus:outline-none resize-y text-left"
                style={{ borderRadius: 0 }}
            />

            <div className="flex flex-wrap items-center gap-3 mt-3">
                <button
                    onClick={send}
                    disabled={sending || !message.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/80 transition-colors disabled:opacity-40"
                    style={{ borderRadius: 0 }}
                >
                    <PaperAirplaneIcon className="w-3 h-3" />
                    {sending ? 'Sending…' : 'Send It'}
                </button>
                {sent && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                        Sent: you'll get a reply by email.
                    </span>
                )}
                {error && <span className="text-xs text-red-300">{error}</span>}
            </div>

            <div className="mt-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3 text-left">
                    What You've Asked
                </h3>
                {loadingHistory ? (
                    <p className="text-xs uppercase tracking-[0.3em] text-white/30 text-left">Loading…</p>
                ) : history.length === 0 ? (
                    <p className="text-sm text-white/40 text-left">Nothing yet.</p>
                ) : (
                    <ul className="space-y-px">
                        {history.map(request => {
                            const status = STATUS_LABEL[request.status] || STATUS_LABEL.open;
                            return (
                                <li key={request.id} className="bg-white/5 px-3 py-3 text-left">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                                            {KINDS.find(k => k.value === request.kind)?.label || request.kind} · {when(request.created_at)}
                                        </span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${status.tone}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/80 mt-2 whitespace-pre-wrap">{request.message}</p>
                                    {request.admin_reply && (
                                        <div className="mt-3 bg-white/5 px-3 py-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
                                                Reply{request.replied_at ? ` · ${when(request.replied_at)}` : ''}
                                            </p>
                                            <p className="text-sm text-white/80 whitespace-pre-wrap">{request.admin_reply}</p>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
