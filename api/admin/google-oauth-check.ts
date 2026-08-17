/**
 * Diagnose the Google OAuth credentials the retrograde rename depends on.
 *
 * The rename failed 418 times with `invalid_client` and the panel could only
 * repeat what Google said. That is a dead end: invalid_client means the
 * client_id and client_secret are not a valid pair, or the refresh token was
 * issued by a different client, and none of those are distinguishable from
 * the error alone. This endpoint performs the token exchange in isolation and
 * reports which of the three is at fault.
 *
 * NEVER returns the client secret or the refresh token, only their lengths and
 * a fingerprint of the last four characters, which is enough to tell "the
 * value changed" from "the value is the same as before" without disclosing it.
 * The client_id is deliberately returned in full; it is public by design,
 * shipped in every browser OAuth flow, and comparing it against Google Cloud
 * Console is the entire point.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdminUser } from '../../lib/api-handlers/_gallery-admin-ops.js';

/** The client that issued the original refresh token; see scripts/setup-google-oauth.ts. */
const EXPECTED_CLIENT_ID = '817758642642-j65tb1kscmmaiaocg5jg1qc4qbu4rsbt.apps.googleusercontent.com';

const fingerprint = (v: string | undefined) =>
    v
        ? {
            present: true,
            length: v.length,
            // GOCSPX- is Google's public prefix for a client secret, not part of
            // the entropy, so showing it is safe and tells us the value is the
            // right shape rather than, say, a pasted client id.
            startsWith: v.slice(0, 7),
            endsWith: v.slice(-4),
            hasWhitespace: v !== v.trim(),
        }
        : { present: false, length: 0, startsWith: null, endsWith: null, hasWhitespace: false };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const admin = await requireAdminUser(req);
    if (!admin) return res.status(401).json({ error: 'Not authorized' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    const report: Record<string, unknown> = {
        // Which deployment answered, and which environment's variables it holds.
        // A secret that "was updated" but still reads the same value means the
        // function never received it: set on the wrong environment, or a
        // redeploy that reused an earlier build's env snapshot. Without this
        // the report cannot tell those apart from a genuinely wrong secret.
        deployment: {
            vercelEnv: process.env.VERCEL_ENV || null,
            commitSha: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
            deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
            region: process.env.VERCEL_REGION || null,
        },
        clientId: clientId || null,
        clientIdMatchesRepoScript: clientId === EXPECTED_CLIENT_ID,
        expectedClientIdFromRepo: EXPECTED_CLIENT_ID,
        clientSecret: fingerprint(clientSecret),
        refreshToken: fingerprint(refreshToken),
    };

    if (!clientId || !clientSecret || !refreshToken) {
        return res.status(200).json({ ...report, tokenExchange: { attempted: false, reason: 'one or more variables missing' } });
    }

    // Exchange the refresh token directly. Google's error body distinguishes
    // the cases the Drive client collapses into a single opaque failure.
    try {
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });
        const r = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        const json: any = await r.json().catch(() => ({}));

        if (r.ok) {
            return res.status(200).json({
                ...report,
                tokenExchange: {
                    attempted: true,
                    ok: true,
                    // Scope decides whether a rename is even permitted. A token
                    // that refreshes fine can still be read-only.
                    scope: json.scope || null,
                    hasDriveWriteScope: typeof json.scope === 'string'
                        && /drive(\.file)?(\s|$)/.test(json.scope)
                        && !/drive\.readonly/.test(json.scope),
                },
            });
        }

        return res.status(200).json({
            ...report,
            tokenExchange: {
                attempted: true,
                ok: false,
                status: r.status,
                error: json.error || null,
                errorDescription: json.error_description || null,
                meaning: json.error === 'invalid_client'
                    ? 'Google does not recognise this client_id + client_secret pair. Either the client_id is not a real client (deleted, or from a different project), or the secret does not belong to it.'
                    : json.error === 'invalid_grant'
                        ? 'The client is valid, but the refresh token is not; revoked, expired, or issued by a different client_id.'
                        : null,
            },
        });
    } catch (err: any) {
        return res.status(200).json({ ...report, tokenExchange: { attempted: true, ok: false, networkError: err?.message } });
    }
}
