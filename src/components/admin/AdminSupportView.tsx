/**
 * Support — admin panel.
 *
 * Every technical support ticket from affiliates, photographers, clients and
 * the contact form. Pick a ticket, read the thread, reply (the person gets it
 * by email), and set its status. An internal note stays in the dashboard and
 * is never emailed or shown to the person.
 *
 * A ticket can arrive from the "open in the dashboard" button in the
 * notification email as ?ticket=<id>.
 */

import { useEffect, useState } from 'react';
import { ArrowPathIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { logApiCall, logError } from '../../lib/adminErrorLog';
import { STATUS_LABEL, SupportStatus, ThreadMessage, formatWhen } from '../../lib/support';

const surface = { borderRadius: 0 } as const;

interface TicketRow {
    id: string;
    ref: string;
    name: string | null;
    email: string | null;
    role: string | null;
    category: string | null;
    subject: string;
    status: SupportStatus;
    created_at: string;
    last_message_at: string;
    last_message_by: 'user' | 'admin';
}

interface TicketDetail extends TicketRow {
    description: string;
    page_url: string | null;
    user_agent: string | null;
    access_key: string;
}

const FILTERS = [
    { id: 'active', label: 'Active' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'closed', label: 'Closed' },
    { id: 'all', label: 'All' },
] as const;

const STATUSES: SupportStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const method = init.method || 'GET';
    const res = await fetch(`/api/support/${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    logApiCall(method, `/api/support/${path.split('?')[0]}`, res.status, res.ok ? 'ok' : body?.error || 'failed');
    if (!res.ok) throw new Error(body?.error || 'Request failed');
    return body as T;
}

export default function AdminSupportView({ onCountChange }: { onCountChange?: (n: number) => void }) {
    const [filter, setFilter] = useState<string>('active');
    const [tickets, setTickets] = useState<TicketRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [openId, setOpenId] = useState<string | null>(null);
    const [detail, setDetail] = useState<{ ticket: TicketDetail; messages: ThreadMessage[] } | null>(null);
    const [reply, setReply] = useState('');
    const [replyStatus, setReplyStatus] = useState<'' | SupportStatus>('');
    const [internal, setInternal] = useState(false);
    const [sending, setSending] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);

    useEffect(() => { load(filter); }, [filter]);

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('ticket');
        if (id) openTicket(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function load(f: string) {
        setLoading(true);
        setError(null);
        try {
            const body = await api<{ tickets: TicketRow[] }>(`admin-list?status=${f}`);
            setTickets(body.tickets || []);
            if (f === 'active') onCountChange?.(body.tickets.filter(t => t.last_message_by === 'user').length);
        } catch (err: any) {
            setError(err.message);
            logError(`Support list failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    async function openTicket(id: string) {
        setOpenId(id);
        setDetail(null);
        setReply('');
        setReplyStatus('');
        setInternal(false);
        try {
            setDetail(await api(`admin-thread?id=${id}`));
        } catch (err: any) {
            setError(err.message);
            logError(`Support thread failed: ${err.message}`);
        }
    }

    async function sendReply() {
        if (!detail || !reply.trim() || sending) return;
        setSending(true);
        setError(null);
        try {
            const body = await api('admin-reply', {
                method: 'POST',
                body: JSON.stringify({ id: detail.ticket.id, message: reply, status: replyStatus || undefined, internal }),
            });
            setDetail(body);
            setReply('');
            setReplyStatus('');
            setFlash(internal ? 'Note saved' : body.emailed ? `Reply emailed to ${detail.ticket.email}` : 'Reply saved, but the email did not send');
            setTimeout(() => setFlash(null), 4000);
            load(filter);
        } catch (err: any) {
            setError(err.message);
            logError(`Support reply failed: ${err.message}`);
        } finally {
            setSending(false);
        }
    }

    async function setStatus(status: SupportStatus) {
        if (!detail) return;
        try {
            setDetail(await api('admin-status', { method: 'POST', body: JSON.stringify({ id: detail.ticket.id, status }) }));
            load(filter);
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (openId) {
        const t = detail?.ticket;
        return (
            <div className="space-y-4 text-left">
                <button
                    onClick={() => { setOpenId(null); setDetail(null); }}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors"
                >
                    <ArrowLeftIcon className="w-3 h-3" /> All Tickets
                </button>

                {error && <p className="text-sm text-red-400">{error}</p>}
                {!t ? (
                    <p className="text-sm text-white/40">Loading…</p>
                ) : (
                    <>
                        <div className="bg-[#0a0a0a] p-4" style={surface}>
                            <p className="text-[10px] font-black tracking-widest text-white/40 mb-1">
                                {t.ref} · {(t.role || 'other').toUpperCase()}{t.category ? ` · ${t.category.toUpperCase()}` : ''}
                            </p>
                            <h3 className="text-lg font-black uppercase tracking-tight text-white">{t.subject}</h3>
                            <p className="text-sm text-white/60 mt-1">
                                {t.name ? `${t.name} · ` : ''}<a href={`mailto:${t.email}`} className="underline hover:text-white">{t.email}</a>
                            </p>
                            {t.page_url && <p className="text-xs text-white/40 mt-2 break-all">From: {t.page_url}</p>}
                            {t.user_agent && <p className="text-xs text-white/30 mt-1 break-all">{t.user_agent}</p>}

                            <div data-tour="support-status" className="flex flex-wrap gap-1 mt-4">
                                {STATUSES.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${t.status === s ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                                        style={surface}
                                    >
                                        {STATUS_LABEL[s]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Message who={t.name || t.email || 'User'} when={t.created_at} text={t.description} tone="user" />
                            {detail!.messages.map(m => (
                                <Message
                                    key={m.id}
                                    who={m.is_internal ? 'INTERNAL NOTE' : m.author === 'admin' ? 'YOU' : (m.author_name || 'User')}
                                    when={m.created_at}
                                    text={m.message}
                                    tone={m.is_internal ? 'note' : m.author === 'admin' ? 'admin' : 'user'}
                                />
                            ))}
                        </div>

                        <div data-tour="support-reply" className="bg-white/5 p-4 space-y-3" style={surface}>
                            <textarea
                                rows={5}
                                value={reply}
                                onChange={e => setReply(e.target.value)}
                                placeholder={internal ? 'Note to yourself. Never emailed or shown to them.' : `Reply to ${t.name || t.email}. They get it by email.`}
                                className="w-full bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:outline-none resize-y"
                                style={surface}
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 text-xs text-white/60">
                                    <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} />
                                    Internal note
                                </label>
                                {!internal && (
                                    <select
                                        value={replyStatus}
                                        onChange={e => setReplyStatus(e.target.value as SupportStatus | '')}
                                        className="bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none"
                                        style={surface}
                                    >
                                        <option value="" className="bg-black">Keep status</option>
                                        <option value="resolved" className="bg-black">Reply and resolve</option>
                                        <option value="in_progress" className="bg-black">Reply, still in progress</option>
                                    </select>
                                )}
                                <button
                                    onClick={sendReply}
                                    disabled={sending || !reply.trim()}
                                    className="ml-auto px-4 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                                    style={surface}
                                >
                                    {sending ? 'Sending…' : internal ? 'Save Note' : 'Send Reply'}
                                </button>
                            </div>
                            {flash && <p className="text-xs text-green-400">{flash}</p>}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4 text-left">
            <div className="flex items-center justify-between gap-3">
                <div data-tour="support-filters" className="flex bg-[#0a0a0a] w-fit">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${filter === f.id ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => load(filter)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                    style={surface}
                >
                    <ArrowPathIcon className="w-3 h-3" /> Refresh
                </button>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div data-tour="support-list">
                {loading ? (
                    <p className="text-sm text-white/40">Loading tickets…</p>
                ) : tickets.length === 0 ? (
                    <p className="text-sm text-white/50 bg-white/5 p-4" style={surface}>
                        {filter === 'active' ? 'No open tickets. Nobody is waiting on you.' : 'No tickets here.'}
                    </p>
                ) : (
                    <ul className="space-y-1">
                        {tickets.map(t => (
                            <li key={t.id}>
                                <button
                                    onClick={() => openTicket(t.id)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
                                    style={surface}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm text-white truncate">
                                            <span className="text-white/40 mr-2">{t.ref}</span>{t.subject}
                                        </p>
                                        <p className="text-[11px] text-white/40 mt-0.5 truncate">
                                            {(t.role || 'other').toUpperCase()} · {t.name || t.email} · {formatWhen(t.last_message_at)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {t.last_message_by === 'user' && t.status !== 'resolved' && t.status !== 'closed' && (
                                            <span className="px-2 py-0.5 bg-amber-400 text-black text-[10px] font-black">NEEDS REPLY</span>
                                        )}
                                        <span className="text-[10px] font-black tracking-widest text-white/50">{STATUS_LABEL[t.status] || t.status}</span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function Message({ who, when, text, tone }: { who: string; when: string; text: string; tone: 'user' | 'admin' | 'note' }) {
    const bg = tone === 'admin' ? 'bg-white/10' : tone === 'note' ? 'bg-amber-400/10' : 'bg-white/5';
    return (
        <div className={`p-4 ${bg}`} style={surface}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">{who} · {formatWhen(when)}</p>
            <p className="text-sm text-white/90 whitespace-pre-wrap break-words">{text}</p>
        </div>
    );
}
