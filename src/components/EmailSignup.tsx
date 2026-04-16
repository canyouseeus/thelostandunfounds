import { useState, useRef } from 'react';
import Turnstile from 'react-turnstile';
import { CheckIcon } from '@heroicons/react/24/outline';

interface EmailSignupProps {
    onSuccess?: () => void;
}

export default function EmailSignup({ onSuccess }: EmailSignupProps = {}) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [venue, setVenue] = useState('');
    const [newsletter, setNewsletter] = useState(true);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileKey, setTurnstileKey] = useState(0);

    const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
    const isDev =
        import.meta.env.DEV ||
        (typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.endsWith('.local') ||
            window.location.hostname.endsWith('.vercel.app')
        ));
    const requiresTurnstile = turnstileSiteKey && !isDev;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (requiresTurnstile && !turnstileToken) {
            alert('Please complete the security verification');
            return;
        }

        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    name: name.trim() || undefined,
                    venue: venue.trim() || undefined,
                    newsletter,
                    source: 'gallery_photo_signup',
                    turnstileToken,
                }),
            });

            if (!response.ok && response.status === 404) {
                throw new Error('API endpoint not found.');
            }

            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Server error: ${text || 'Empty response'}`);
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Submission failed');

            setSuccess(true);
            setEmail(''); setName(''); setVenue('');
            onSuccess?.();
            setTurnstileKey(prev => prev + 1);
            setTurnstileToken(null);
        } catch (error: any) {
            console.error('Signup error:', error);
            alert(error.message || 'Something went wrong. Please try again.');
            setTurnstileKey(prev => prev + 1);
            setTurnstileToken(null);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full bg-black border border-white/10 p-8">
                <div className="text-center space-y-4">
                    <div className="w-10 h-10 bg-white flex items-center justify-center mx-auto">
                        <CheckIcon className="w-5 h-5 text-black stroke-[3]" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">You're in.</h3>
                    <p className="text-white/40 text-xs leading-relaxed">
                        We'll let you know when new albums drop from your venue.
                        Follow <span className="text-white font-bold">@tlau.photos</span> for the latest.
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/50 transition-colors"
                    >
                        Submit another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-black border border-white/10 p-8">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3">
                @tlau.photos
            </p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                Did I take your photo?
            </h2>
            <p className="text-white/40 text-[11px] leading-relaxed mb-6">
                Drop your info and we'll notify you when new albums go up from your venue.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name */}
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">
                        Your Name
                    </label>
                    <input
                        type="text"
                        placeholder="First & last name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-50"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">
                        Email *
                    </label>
                    <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-50"
                    />
                </div>

                {/* Venue */}
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">
                        Where were you? (Venue / Event)
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Stubb's, Empire, Emo's..."
                        value={venue}
                        onChange={e => setVenue(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-50"
                    />
                </div>

                {/* Newsletter opt-in */}
                <label className="flex items-start gap-3 cursor-pointer group pt-1">
                    <div className="relative flex-shrink-0 mt-0.5">
                        <input
                            type="checkbox"
                            checked={newsletter}
                            onChange={e => setNewsletter(e.target.checked)}
                            className="sr-only"
                        />
                        <div className={`w-4 h-4 border transition-colors ${newsletter ? 'bg-white border-white' : 'bg-transparent border-white/30 group-hover:border-white/50'}`}>
                            {newsletter && <CheckIcon className="w-3 h-3 text-black mx-auto mt-0.5" />}
                        </div>
                    </div>
                    <span className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors leading-relaxed">
                        Notify me when new albums drop & send occasional updates
                    </span>
                </label>

                {/* Turnstile */}
                {requiresTurnstile && (
                    <div className="flex justify-center pt-1">
                        <Turnstile
                            sitekey={turnstileSiteKey}
                            onSuccess={token => setTurnstileToken(token)}
                            onError={() => setTurnstileToken(null)}
                            onExpire={() => setTurnstileToken(null)}
                            key={turnstileKey}
                            theme="dark"
                        />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || (requiresTurnstile && !turnstileToken)}
                    className="w-full py-3.5 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Sending...' : 'Notify Me'}
                </button>

                {!requiresTurnstile && isDev && (
                    <p className="text-[9px] text-white/20 text-center">Security check disabled in dev.</p>
                )}
            </form>
        </div>
    );
}
