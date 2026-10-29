// Cloudflare Turnstile — the one server-side check for every public form.
// See TURNSTILE RULE in CLAUDE.md: any endpoint that accepts a submission from
// someone who isn't signed in, and especially one that sends email because of
// it, verifies a Turnstile token here first.
//
// Follows Cloudflare's canonical siteverify (developers.cloudflare.com/turnstile/spin):
// success must be true, the token's action must be the one this form sets on
// its widget, and its hostname must be one of ours. A token from the
// newsletter widget can't be replayed at the ticket form, and a token minted
// on someone else's page can't be used here.
//
// Fails CLOSED in production. The newsletter's old inline check skipped
// verification whenever TURNSTILE_SECRET_KEY was unset, and the secret was in
// fact never set in Vercel, so the check had silently never run. A missing
// secret in production is now a refusal and a loud log line, not a pass.
//
// Outside production (local dev, Vercel previews) the check is skipped: the
// widget's domain list doesn't cover preview URLs, and previews carry no secret.

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// The frontend hostnames a production token may come from. TURNSTILE_HOSTNAMES
// (comma-separated) overrides. Never add localhost here: production only.
const PRODUCTION_HOSTNAMES = ['www.thelostandunfounds.com', 'thelostandunfounds.com'];

/** The `action` each protected form sets on its widget. Server and client import the same names. */
export type TurnstileAction = 'support' | 'contact' | 'newsletter';

export type TurnstileResult =
    | { ok: true; skipped?: boolean }
    | { ok: false; status: number; error: string };

const FAILED: TurnstileResult = { ok: false, status: 403, error: 'Security verification failed. Please refresh and try again.' };

export function turnstileEnforced(): boolean {
    return process.env.VERCEL_ENV === 'production';
}

function expectedHostnames(): Set<string> {
    const fromEnv = (process.env.TURNSTILE_HOSTNAMES || '')
        .split(',')
        .map(h => h.trim())
        .filter(Boolean);
    return new Set(fromEnv.length ? fromEnv : PRODUCTION_HOSTNAMES);
}

/**
 * @param allowedActions the action(s) the calling endpoint accepts. One
 *   endpoint can serve several forms (/api/support/tickets takes both the
 *   support and contact widgets), so this is a list.
 */
export async function verifyTurnstile(
    token: unknown,
    remoteIp: string | undefined,
    allowedActions: TurnstileAction[],
): Promise<TurnstileResult> {
    if (!turnstileEnforced()) return { ok: true, skipped: true };

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        console.error('[turnstile] TURNSTILE_SECRET_KEY is not set in production — refusing the submission.');
        return { ok: false, status: 503, error: 'Security check is not configured. Please email support@thelostandunfounds.com.' };
    }
    if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
        return { ok: false, status: 403, error: 'Security verification required. Please refresh and try again.' };
    }

    // Siteverify takes form-encoded, not JSON.
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    let result: any;
    try {
        const res = await fetch(SITEVERIFY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: AbortSignal.timeout(10_000),
            body,
        });
        if (!res.ok) throw new Error(`siteverify ${res.status}`);
        result = await res.json();
    } catch (err: any) {
        console.error('[turnstile] Siteverify unreachable:', err?.message);
        return FAILED;
    }

    if (!result?.success) {
        // `invalid-input-secret` here means the secret in Vercel is wrong.
        console.warn('[turnstile] Rejected:', result?.['error-codes']);
        return FAILED;
    }
    if (!allowedActions.includes(result.action)) {
        console.warn('[turnstile] Wrong action:', result.action, 'expected one of', allowedActions);
        return FAILED;
    }
    if (!expectedHostnames().has(result.hostname)) {
        console.warn('[turnstile] Wrong hostname:', result.hostname);
        return FAILED;
    }
    return { ok: true };
}

/** The caller's IP as Vercel reports it, for siteverify's optional remoteip. */
export function clientIp(headers: Record<string, string | string[] | undefined>): string | undefined {
    const fwd = headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim();
    return first || undefined;
}
