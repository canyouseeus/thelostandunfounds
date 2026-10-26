/**
 * One support ticket's conversation, reached by its private link
 * (/support/ticket/<access key>) from the email or the dashboard. Works with
 * or without an account: the key is the credential.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { STATUS_LABEL, SupportStatus, ThreadMessage, formatWhen, supportFetch } from '../lib/support';

const surface = { borderRadius: 0 } as const;

interface Thread {
    ticket: {
        ref: string;
        subject: string;
        category: string | null;
        status: SupportStatus;
        name: string | null;
        description: string;
        created_at: string;
    };
    messages: ThreadMessage[];
}

export default function SupportTicket() {
    const { key = '' } = useParams();
    const [thread, setThread] = useState<Thread | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);

    useEffect(() => {
        supportFetch<Thread>(`thread?key=${encodeURIComponent(key)}`)
            .then(setThread)
            .catch(err => setError(err.message));
    }, [key]);

    async function send(e: React.FormEvent) {
        e.preventDefault();
        if (!reply.trim() || sending) return;
        setSending(true);
        setReplyError(null);
        try {
            setThread(await supportFetch<Thread>('reply', { method: 'POST', body: JSON.stringify({ key, message: reply }) }));
            setReply('');
        } catch (err: any) {
            setReplyError(err.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <>
            <Helmet>
                <title>THE LOST+UNFOUNDS | Support Ticket</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
                <Link to="/support" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors mb-6">
                    <ArrowLeftIcon className="w-3 h-3" /> Support
                </Link>

                {error ? (
                    <div className="bg-white/5 p-6" style={surface}>
                        <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-2">TICKET NOT FOUND</h1>
                        <p className="text-sm text-white/60">Check the link in your email, or open a new ticket from the Support page.</p>
                    </div>
                ) : !thread ? (
                    <p className="text-sm text-white/40">Loading…</p>
                ) : (
                    <>
                        <div className="mb-6">
                            <p className="text-[10px] font-black tracking-widest text-white/40 mb-2">
                                {thread.ticket.ref} · {STATUS_LABEL[thread.ticket.status] || thread.ticket.status}
                                {thread.ticket.category ? ` · ${thread.ticket.category.toUpperCase()}` : ''}
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">{thread.ticket.subject}</h1>
                        </div>

                        <div className="space-y-2 mb-6">
                            <Bubble
                                who={thread.ticket.name || 'You'}
                                when={thread.ticket.created_at}
                                text={thread.ticket.description}
                                fromUs={false}
                            />
                            {thread.messages.map(m => (
                                <Bubble
                                    key={m.id}
                                    who={m.author === 'admin' ? 'THE LOST+UNFOUNDS' : (m.author_name || 'You')}
                                    when={m.created_at}
                                    text={m.message}
                                    fromUs={m.author === 'admin'}
                                />
                            ))}
                        </div>

                        {thread.ticket.status === 'closed' ? (
                            <p className="text-sm text-white/60">
                                This ticket is closed. <Link to="/support" className="underline hover:text-white">Open a new one</Link> and mention {thread.ticket.ref}.
                            </p>
                        ) : (
                            <form onSubmit={send} className="space-y-3">
                                <label htmlFor="ticket-reply" className="block text-[10px] font-black uppercase tracking-widest text-white/50">
                                    {thread.ticket.status === 'resolved' ? 'Still not fixed? Reply and it reopens' : 'Reply'}
                                </label>
                                <textarea
                                    id="ticket-reply"
                                    rows={4}
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                    className="w-full bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:outline-none resize-y"
                                    style={surface}
                                />
                                {replyError && <p className="text-sm text-red-400">{replyError}</p>}
                                <button
                                    type="submit"
                                    disabled={sending || !reply.trim()}
                                    className="px-4 py-2 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                                    style={surface}
                                >
                                    {sending ? 'Sending…' : 'Send Reply'}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

function Bubble({ who, when, text, fromUs }: { who: string; when: string; text: string; fromUs: boolean }) {
    return (
        <div className={`p-4 ${fromUs ? 'bg-white/10' : 'bg-white/5'}`} style={surface}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
                {who} · {formatWhen(when)}
            </p>
            <p className="text-sm text-white/90 whitespace-pre-wrap break-words">{text}</p>
        </div>
    );
}
