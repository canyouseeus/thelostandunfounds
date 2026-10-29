/**
 * The support block on the affiliate and photographer dashboards: the
 * person's tickets, newest activity first, and GET HELP to open a new one.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LifebuoyIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import SupportRequestForm from './SupportRequestForm';
import { MyTicket, STATUS_LABEL, formatWhen, supportFetch } from '../../lib/support';

const surface = { borderRadius: 0 } as const;

interface Props {
    role?: 'affiliate' | 'photographer';
    className?: string;
}

export default function MyTickets({ role, className = '' }: Props) {
    const [tickets, setTickets] = useState<MyTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    async function load() {
        try {
            const body = await supportFetch<{ tickets: MyTicket[] }>('mine');
            setTickets(body.tickets || []);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
    const shown = showAll(tickets) ? tickets : open.length ? open : tickets.slice(0, 3);

    return (
        <section data-tour="help-tickets" id="support" className={`bg-white/5 p-4 sm:p-6 text-left ${className}`} style={surface}>
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <LifebuoyIcon className="w-5 h-5 text-white/60" />
                    <h2 className="text-lg font-black uppercase tracking-widest text-white">Support</h2>
                </div>
                <button data-tour="help-get-help"
                    onClick={() => setShowForm(!showForm)}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
                    style={surface}
                >
                    {showForm ? 'Close' : 'Get Help'}
                </button>
            </div>

            {showForm && (
                <div className="mb-4">
                    <SupportRequestForm defaultRole={role} onCreated={load} />
                </div>
            )}

            {loading ? (
                <p className="text-sm text-white/40">Loading your tickets…</p>
            ) : error ? (
                <p className="text-sm text-red-400">{error}</p>
            ) : tickets.length === 0 ? (
                <p className="text-sm text-white/60">
                    Something not working? GET HELP opens a ticket. We reply by email and keep the conversation here.
                </p>
            ) : (
                <ul className="space-y-1">
                    {shown.map(t => (
                        <li key={t.key}>
                            <Link
                                to={`/support/ticket/${t.key}`}
                                className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white/5 hover:bg-white/10 transition-colors"
                                style={surface}
                            >
                                <div className="min-w-0">
                                    <p className="text-sm text-white truncate">
                                        <span className="text-white/40 mr-2">{t.ref}</span>{t.subject}
                                    </p>
                                    <p className="text-[11px] text-white/40 mt-0.5">Last activity {formatWhen(t.last_message_at)}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {t.awaiting_you && (
                                        <span className="px-2 py-0.5 bg-amber-400 text-black text-[10px] font-black">NEW REPLY</span>
                                    )}
                                    <span className="text-[10px] font-black tracking-widest text-white/50">{STATUS_LABEL[t.status] || t.status}</span>
                                    <ChevronRightIcon className="w-4 h-4 text-white/30" />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// A short history is easier to read whole than filtered.
function showAll(tickets: MyTicket[]) {
    return tickets.length <= 5;
}
