// Cloudflare Turnstile — the one server-side check for every public form.
// See TURNSTILE RULE in CLAUDE.md: any endpoint that accepts a submission from
// someone who isn't signed in, and especially one that sends email because of
// it, verifies a Turnstile token here first.
//
// Fails CLOSED in production. The newsletter's old inline check skipped
// verification whenever TURNSTILE_SECRET_KEY was unset, and the secret was in
// fact never set in Vercel, so the check had silently never run. A missing
// secret in production is now a refusal and a loud log line, not a pass.
//
// Outside production (local dev, Vercel previews) the check is skipped: the
// widget's domain allowlist doesn't cover preview URLs, and previews carry no
// secret.

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult =
    | { ok: true; skipped?: boolean }
    | { ok: false; status: number; error: string };

export function turnstileEnforced(): boolean {
    return process.env.VERCEL_ENV === 'production';
}

export async function verifyTurnstile(token: unknown, remoteIp?: string): Promise<TurnstileResult> {
    if (!turnstileEnforced()) return { ok: true, skipped: true };

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        console.error('[turnstile] TURNSTILE_SECRET_KEY is not set in production — refusing the submission.');
        return { ok: false, status: 503, error: 'Security check is not configured. Please email support@thelostandunfounds.com.' };
    }
    if (typeof token !== 'string' || !token) {
        return { ok: false, status: 400, error: 'Security verification required. Please refresh and try again.' };
    }

    // Siteverify takes form-encoded, not JSON.
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);
    try {
        const res = await fetch(SITEVERIFY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        const data: any = await res.json().catch(() => ({}));
        if (data?.success) return { ok: true };
        console.warn('[turnstile] Verification failed:', data?.['error-codes']);
        return { ok: false, status: 400, error: 'Security verification failed. Please try again.' };
    } catch (err: any) {
        console.error('[turnstile] Siteverify unreachable:', err?.message);
        return { ok: false, status: 503, error: 'Security check is unavailable right now. Please try again in a minute.' };
    }
}

/** The caller's IP as Vercel reports it, for siteverify's optional remoteip. */
export function clientIp(headers: Record<string, string | string[] | undefined>): string | undefined {
    const fwd = headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim();
    return first || undefined;
}
