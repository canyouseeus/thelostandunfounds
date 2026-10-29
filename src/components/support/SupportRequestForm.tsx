/**
 * Open a support ticket. Used on /support, /contact and the affiliate and
 * photographer dashboards. Signed in, the ticket is tied to the account and
 * the server works out whether they're an affiliate or photographer, so the
 * form only asks for name, email and role when nobody is signed in.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Turnstile from 'react-turnstile';
import { useAuth } from '../../contexts/AuthContext';
import { SUPPORT_CATEGORIES, SUPPORT_ROLES, supportFetch } from '../../lib/support';

const surface = { borderRadius: 0 } as const;
const field = 'w-full bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:outline-none';
const label = 'block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5';

// Turnstile runs on production only, matching the server (lib/api-handlers/_turnstile.ts):
// the widget's domain list doesn't cover localhost or *.vercel.app previews.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
function turnstileOnThisHost(): boolean {
    if (import.meta.env.DEV || typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return !(h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || h.endsWith('.vercel.app'));
}

interface Props {
    defaultCategory?: string;
    defaultRole?: string;
    /** Called once the ticket exists, e.g. to refresh a ticket list. */
    onCreated?: () => void;
}

export default function SupportRequestForm({ defaultCategory, defaultRole, onCreated }: Props) {
    const { user } = useAuth();
    const [form, setForm] = useState({
        name: '',
        email: '',
        role: defaultRole || 'other',
        category: defaultCategory || SUPPORT_CATEGORIES[0],
        subject: '',
        description: '',
        website: '', // honeypot
    });
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<{ ref: string; key: string } | null>(null);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    // Bumped to remount the widget: a token is single-use.
    const [turnstileKey, setTurnstileKey] = useState(0);
    // Signed-in people skip it; the server does the same.
    const needsTurnstile = !user && !!TURNSTILE_SITE_KEY && turnstileOnThisHost();

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm({ ...form, [k]: e.target.value });

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (sending) return;
        if (needsTurnstile && !turnstileToken) {
            setError('Please complete the security check.');
            return;
        }
        setSending(true);
        setError(null);
        try {
            const body = await supportFetch<{ ticket?: { ref: string; key: string } }>('tickets', {
                method: 'POST',
                body: JSON.stringify({ ...form, page_url: window.location.href, turnstileToken }),
            });
            if (body.ticket) setCreated(body.ticket);
            onCreated?.();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSending(false);
            setTurnstileToken(null);
            setTurnstileKey(k => k + 1);
        }
    }

    if (created) {
        return (
            <div className="bg-white/5 p-6 text-left" style={surface}>
                <CheckCircleIcon className="w-8 h-8 text-green-400 mb-3" />
                <h3 className="text-lg font-black uppercase tracking-widest text-white mb-2">Ticket {created.ref} Is Open</h3>
                <p className="text-sm text-white/70 mb-4">
                    We emailed you a copy. Replies come by email, and the whole conversation stays on the ticket page.
                </p>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to={`/support/ticket/${created.key}`}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
                        style={surface}
                    >
                        View Ticket
                    </Link>
                    <button
                        onClick={() => { setCreated(null); setForm({ ...form, subject: '', description: '' }); }}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                        style={surface}
                    >
                        Open Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="bg-white/5 p-4 sm:p-6 space-y-4 text-left" style={surface}>
            {!user && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={label} htmlFor="support-name">Name</label>
                        <input id="support-name" value={form.name} onChange={set('name')} className={field} style={surface} autoComplete="name" />
                    </div>
                    <div>
                        <label className={label} htmlFor="support-email">Email *</label>
                        <input id="support-email" type="email" required value={form.email} onChange={set('email')} className={field} style={surface} autoComplete="email" />
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 ${user ? '' : 'sm:grid-cols-2'} gap-3`}>
                {!user && (
                    <div>
                        <label className={label} htmlFor="support-role">I am a</label>
                        <select id="support-role" value={form.role} onChange={set('role')} className={field} style={surface}>
                            {SUPPORT_ROLES.map(r => <option key={r.value} value={r.value} className="bg-black">{r.label}</option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label className={label} htmlFor="support-category">What it's about</label>
                    <select id="support-category" value={form.category} onChange={set('category')} className={field} style={surface}>
                        {SUPPORT_CATEGORIES.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className={label} htmlFor="support-subject">Subject *</label>
                <input id="support-subject" required maxLength={160} value={form.subject} onChange={set('subject')} placeholder="One line: what's wrong" className={field} style={surface} />
            </div>

            <div>
                <label className={label} htmlFor="support-description">Details *</label>
                <textarea
                    id="support-description"
                    required
                    minLength={10}
                    rows={6}
                    value={form.description}
                    onChange={set('description')}
                    placeholder="What were you trying to do, what happened instead, and any error message you saw."
                    className={`${field} resize-y`}
                    style={surface}
                />
            </div>

            {/* Honeypot: hidden from people, filled by bots. */}
            <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.website}
                onChange={set('website')}
                className="absolute -left-[9999px] w-px h-px opacity-0"
            />

            {needsTurnstile && (
                <Turnstile
                    key={turnstileKey}
                    sitekey={TURNSTILE_SITE_KEY}
                    theme="dark"
                    onSuccess={token => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => {
                        setTurnstileToken(null);
                        setError('The security check failed to load. Refresh the page, or email support@thelostandunfounds.com.');
                    }}
                />
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
                type="submit"
                disabled={sending || (needsTurnstile && !turnstileToken)}
                className="px-4 py-2 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                style={surface}
            >
                {sending ? 'Sending…' : 'Open Ticket'}
            </button>
        </form>
    );
}
