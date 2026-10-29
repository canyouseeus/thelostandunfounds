// The terms gate: nobody publishes to the site without having agreed to the
// Photographer Terms (/terms/photographers), and the agreement is on record.
//
// The record is terms_acceptances — service role only (RLS on, no policies),
// so the browser can neither forge an acceptance nor read anyone else's. The
// gate is enforced here, server-side, on every upload call; the checkbox in
// the UI only collects the agreement.
//
// Bump PHOTOGRAPHER_TERMS_VERSION when the terms change materially: everyone
// then has to agree again before their next upload. The browser never holds
// its own copy: it agrees to whatever version the server reports. Change the
// "Last updated" date in src/pages/docs/PhotographerTerms.tsx at the same time.
import type { VercelRequest } from '@vercel/node';
import type { ServiceSupabaseClient } from './_supabase-admin-client.js';

export const PHOTOGRAPHER_TERMS_KEY = 'photographer';
export const PHOTOGRAPHER_TERMS_VERSION = '2026-10-29.3';

/** Who is agreeing: a signed-in user, or the holder of a gallery upload link. */
export type TermsParty = { userId: string } | { ingestKeyId: string };

export const TERMS_REQUIRED_MESSAGE =
    'Agree to the Photographer Terms before uploading: https://www.thelostandunfounds.com/terms/photographers';

/** The agreement was made against a version of the terms that is no longer current. */
export class TermsVersionError extends Error {
    constructor() {
        super('These terms have been updated. Reload the page and review them again.');
    }
}

function partyColumn(party: TermsParty): ['user_id' | 'ingest_key_id', string] {
    return 'userId' in party ? ['user_id', party.userId] : ['ingest_key_id', party.ingestKeyId];
}

export async function hasAcceptedPhotographerTerms(
    supabase: ServiceSupabaseClient,
    party: TermsParty,
): Promise<boolean> {
    const [column, value] = partyColumn(party);
    const { data, error } = await supabase
        .from('terms_acceptances')
        .select('id')
        .eq(column, value)
        .eq('terms_key', PHOTOGRAPHER_TERMS_KEY)
        .eq('version', PHOTOGRAPHER_TERMS_VERSION)
        .limit(1);
    // Fail closed: if we cannot read the record, nobody uploads.
    if (error) throw new Error(`Could not check terms acceptance: ${error.message}`);
    return (data?.length ?? 0) > 0;
}

function clientIp(req: VercelRequest): string | null {
    const fwd = req.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim();
    return first || (typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'] : null);
}

/**
 * Record an agreement. The caller must send the version they were shown; an
 * old tab agreeing to old terms is refused rather than recorded as current.
 */
export async function recordPhotographerTerms(
    supabase: ServiceSupabaseClient,
    req: VercelRequest,
    party: TermsParty,
    body: { version?: unknown; name?: unknown; email?: unknown },
): Promise<{ version: string }> {
    if (body.version !== PHOTOGRAPHER_TERMS_VERSION) {
        throw new TermsVersionError();
    }
    if (await hasAcceptedPhotographerTerms(supabase, party)) return { version: PHOTOGRAPHER_TERMS_VERSION };

    const [column, value] = partyColumn(party);
    const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
    const { error } = await supabase.from('terms_acceptances').insert({
        terms_key: PHOTOGRAPHER_TERMS_KEY,
        version: PHOTOGRAPHER_TERMS_VERSION,
        [column]: value,
        name: text(body.name, 120),
        email: text(body.email, 200),
        ip: clientIp(req),
        user_agent: text(req.headers['user-agent'], 400),
    });
    if (error) throw new Error(`Could not record terms acceptance: ${error.message}`);
    return { version: PHOTOGRAPHER_TERMS_VERSION };
}
