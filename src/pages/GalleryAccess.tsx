/**
 * Gallery access — /gallery/:slug/access
 *
 * Where an invited client lands from the invite email. A private gallery is
 * gated on photo_libraries.invited_emails, matched against the signed-in user's
 * email, so proving the address is the whole of what access requires. This page
 * asks for that address and nothing else: no password, no signup, no Google,
 * none of the platform chrome. It is deliberately NOT the site's sign-in modal —
 * that modal serves visitors and the owner, and its options are noise to a
 * client who was handed a link to their own photos.
 *
 * A wrong address is not treated as an error and never says whether it was
 * invited: the link simply does not open the gallery. Saying otherwise would
 * make this an invitee oracle for anyone holding the slug.
 *
 * The link is emailed by our server (/api/gallery/access-link), from our own
 * mail, not by Supabase's built-in mailer: that one allows a few emails an hour
 * for the whole project, and a client was locked out by it on 2026-11-01.
 * Turnstile guards the form (TURNSTILE RULE), action 'gallery-access'.
 *
 * Normally nobody types anything: the invite's button carries the client's own
 * key (#k=, never sent to a server in the URL), and this page trades it at
 * /api/gallery/invite-open for a one-time sign-in link that lands them in the
 * gallery. The email form below is the fallback (deleted invite, revoked key).
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import TurnstileField, { turnstileRequired } from '../components/TurnstileField';

interface AccessInfo {
    name: string;
    slug: string;
    isPrivate: boolean;
}

export default function GalleryAccess() {
    const { slug } = useParams<{ slug: string }>();
    const { user } = useAuth();

    const [info, setInfo] = useState<AccessInfo | null>(null);
    const [infoLoading, setInfoLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Single-use: remounted after every attempt.
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileKey, setTurnstileKey] = useState(0);

    const galleryUrl = `/gallery/${slug}`;

    // The invite's own key, read once and wiped from the address bar so it
    // isn't left in history or copied along with the URL.
    const [inviteKey] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        const k = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('k');
        if (k) window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return k;
    });
    const [opening, setOpening] = useState(Boolean(inviteKey));

    useEffect(() => {
        if (!inviteKey) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/gallery/invite-open', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug, key: inviteKey }),
                });
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (res.ok && data.link) {
                    // Signs them in and lands in the gallery.
                    window.location.replace(data.link);
                    return;
                }
                setError(data.error || 'This invite link no longer works. Enter your email below and we\'ll send you a new one.');
            } catch {
                if (!cancelled) setError('We could not reach the server. Check your connection and try again.');
            }
            if (!cancelled) setOpening(false);
        })();
        return () => { cancelled = true; };
    }, [inviteKey, slug]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/gallery/access-info?slug=${encodeURIComponent(slug || '')}`);
                if (cancelled) return;
                if (!res.ok) {
                    setNotFound(true);
                    return;
                }
                setInfo(await res.json());
            } catch {
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setInfoLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed || !trimmed.includes('@')) {
            setError('Enter the email address your invite was sent to.');
            return;
        }
        if (turnstileRequired() && !turnstileToken) {
            setError('Please complete the security check.');
            return;
        }
        setError(null);
        setSending(true);
        try {
            const res = await fetch('/api/gallery/access-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, email: trimmed, turnstileToken }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || 'We could not send the email just now. Please try again in a minute.');
                return;
            }
            setSent(true);
        } catch {
            setError('We could not reach the server. Check your connection and try again.');
        } finally {
            setSending(false);
            setTurnstileToken(null);
            setTurnstileKey(k => k + 1);
        }
    };

    const heading = info?.name || 'YOUR GALLERY';

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-20">
            <Helmet>
                <title>THE LOST+UNFOUNDS | Gallery Access</title>
                <meta
                    name="description"
                    content="Open your private gallery from THE LOST+UNFOUNDS. Enter the email address your invite was sent to and we'll email you a sign-in link — no password required."
                />
                <meta name="robots" content="noindex" />
            </Helmet>

            <div className="w-full max-w-md space-y-10">
                <div className="space-y-3 text-center">
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
                        Private Gallery
                    </p>
                    <h1 className="text-white text-2xl font-black uppercase tracking-widest break-words">
                        {infoLoading ? 'Loading…' : notFound ? 'Gallery Not Found' : heading}
                    </h1>
                </div>

                {opening ? (
                    <p className="text-white/50 text-sm text-center">Opening your gallery…</p>
                ) : notFound ? (
                    <div className="space-y-6 text-center">
                        <p className="text-white/50 text-sm leading-relaxed">
                            This gallery link is no longer active. If you were sent it recently,
                            reply to the invite email and we'll re-send it.
                        </p>
                        <Link
                            to="/gallery"
                            className="inline-flex items-center px-8 py-4 bg-white/5 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-colors"
                        >
                            Browse Public Galleries
                        </Link>
                    </div>
                ) : user && !error ? (
                    // Already signed in — no reason to email anybody a link.
                    <div className="space-y-6 text-center">
                        <p className="text-white/50 text-sm leading-relaxed">
                            You're signed in as <span className="text-white">{user.email}</span>.
                        </p>
                        <Link
                            to={galleryUrl}
                            className="inline-flex items-center px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-95"
                        >
                            Open Gallery
                        </Link>
                    </div>
                ) : sent ? (
                    <div className="space-y-5 bg-white/[0.03] px-6 py-8 text-center">
                        <CheckCircleIcon className="w-10 h-10 text-white/70 mx-auto" />
                        <p className="text-white text-xs font-black uppercase tracking-[0.2em]">
                            Check Your Email
                        </p>
                        <p className="text-white/50 text-sm leading-relaxed">
                            If <span className="text-white">{email.trim()}</span> is on the invite list
                            for this gallery, a sign-in link is on its way. Open it on this device and
                            you'll land straight in the gallery — no password needed. It comes from
                            THE LOST+UNFOUNDS; if it isn't in your inbox, check spam.
                        </p>
                        <button
                            type="button"
                            onClick={() => { setSent(false); setError(null); }}
                            className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                        >
                            Use a different email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="space-y-5">
                        <p className="text-white/50 text-sm leading-relaxed text-center">
                            Enter the email address your invite was sent to. We'll email you a link
                            that opens the gallery — there's no password to create.
                        </p>

                        <div>
                            <label htmlFor="invite-email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                                Email
                            </label>
                            <input
                                id="invite-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                autoFocus
                                className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:bg-white/10 transition-colors"
                                placeholder="your@email.com"
                            />
                        </div>

                        <TurnstileField
                            action="gallery-access"
                            resetKey={turnstileKey}
                            onToken={setTurnstileToken}
                            className=""
                        />

                        {error && (
                            <div className="px-4 py-2 bg-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full px-4 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        >
                            <EnvelopeIcon className="w-4 h-4" />
                            {sending ? 'Sending…' : 'Email Me My Gallery Link'}
                        </button>

                        <p className="text-white/25 text-[10px] leading-relaxed text-center">
                            Wrong address? Reach us at media@thelostandunfounds.com.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
