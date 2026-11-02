/**
 * The Cloudflare Turnstile widget for a public form (TURNSTILE RULE, CLAUDE.md).
 *
 * Renders on production hosts only, matching the server
 * (lib/api-handlers/_turnstile.ts): the widget's domain list doesn't cover
 * localhost or *.vercel.app previews, and the server skips the check there.
 *
 * The parent keeps the token, sends it as `turnstileToken`, and bumps
 * `resetKey` after every submit: a token is single-use.
 *
 * Look: `appearance="interaction-only"` keeps Cloudflare's box off the page
 * unless it actually needs the visitor to click (most people never see it),
 * and the wrapper takes no space until then. When it does show, it is
 * `size="flexible"`, so it runs the full width of the form's inputs and
 * buttons instead of sitting there as a fixed 300px box.
 */

import { useState } from 'react';
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
    const [interactive, setInteractive] = useState(false);
    if (!turnstileRequired()) return null;
    return (
        <div
            className={interactive ? `w-full ${className}` : 'w-full'}
            // Collapsed (no height, no inherited space-y margin) while the check runs unseen.
            style={interactive ? undefined : { height: 0, margin: 0, overflow: 'hidden' }}
        >
            <Turnstile
                key={resetKey}
                sitekey={SITE_KEY}
                action={action}
                theme="dark"
                size="flexible"
                appearance="interaction-only"
                onBeforeInteractive={() => setInteractive(true)}
                onAfterInteractive={() => setInteractive(false)}
                onLoad={() => setInteractive(false)}
                onSuccess={token => onToken(token)}
                onExpire={() => onToken(null)}
                onError={() => { onToken(null); onFailed?.(); }}
            />
        </div>
    );
}
