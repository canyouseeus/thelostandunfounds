/**
 * The Cloudflare Turnstile widget for a public form (TURNSTILE RULE, CLAUDE.md).
 *
 * Renders on production hosts only, matching the server
 * (lib/api-handlers/_turnstile.ts): the widget's domain list doesn't cover
 * localhost or *.vercel.app previews, and the server skips the check there.
 *
 * The parent keeps the token, sends it as `turnstileToken`, and bumps
 * `resetKey` after every submit: a token is single-use.
 */

import Turnstile from 'react-turnstile';

export type TurnstileAction = 'support' | 'contact' | 'newsletter' | 'booking' | 'gallery-access';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

/** Whether this page must send a Turnstile token at all. */
export function turnstileRequired(): boolean {
    if (!SITE_KEY || import.meta.env.DEV || typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return !(h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || h.endsWith('.vercel.app'));
}

interface Props {
    action: TurnstileAction;
    resetKey: number;
    onToken: (token: string | null) => void;
    onFailed?: () => void;
    className?: string;
}

export default function TurnstileField({ action, resetKey, onToken, onFailed, className = 'mb-4' }: Props) {
    if (!turnstileRequired()) return null;
    return (
        <div className={className}>
            <Turnstile
                key={resetKey}
                sitekey={SITE_KEY}
                action={action}
                theme="dark"
                onSuccess={token => onToken(token)}
                onExpire={() => onToken(null)}
                onError={() => { onToken(null); onFailed?.(); }}
            />
        </div>
    );
}
