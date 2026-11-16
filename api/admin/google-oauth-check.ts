/**
 * Diagnose the Google OAuth credentials the retrograde rename depends on.
 *
 * The rename failed 418 times with `invalid_client` and the panel could only
 * repeat what Google said. That is a dead end: invalid_client means the
 * client_id and client_secret are not a valid pair, or the refresh token was
 * issued by a different client — and none of those are distinguishable from
 * the error alone. This endpoint performs the token exchange in isolation and
 * reports which of the three is at fault.
 *
 * NEVER returns the client secret or the refresh token, only their lengths and
 * a fingerprint of the last four characters, which is enough to tell "the
 * value changed" from "the value is the same as before" without disclosing it.
 * The client_id is deliberately returned in full — it is public by design,
 * shipped in every browser OAuth flow, and comparing it against Google Cloud
 * Console is the entire point.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdminUser } from '../../lib/api-handlers/_gallery-admin-ops.js';
import {
    getGoogleRefreshToken, clearGoogleTokenCache, DRIVE_CREDENTIAL_KEY,
    GOOGLE_DRIVE_REDIRECT_URI, GOOGLE_DRIVE_SCOPES,
} from '../../lib/api-handlers/_google-oauth.js';
import { createServiceSupabaseClient } from '../../lib/api-handlers/_supabase-admin-client.js';

/*
 * Reconnect Google Drive (POST {action:'auth_url'} then {action:'connect'}).
 *
 * When Google refuses the refresh token (`invalid_grant`), every Drive upload
 * fails. The owner reconnects from Admin → Gallery → Google Drive:
 *   1. auth_url — the Google consent link. It returns to the redirect the
 *      OAuth client already lists (http://localhost:9999/oauth2callback), so no
 *      Cloud Console change is needed. On a phone that page "can't connect";
 *      its address still carries the one-time code.
 *   2. connect — the owner pastes that address. We exchange the code, prove the
 *      new token can reach the client-galleries folder, then store it in
 *      google_oauth_credentials (service role only). Every Drive writer reads
 *      it through lib/api-handlers/_google-oauth.ts. The token is never returned.
 */
function driveAuthUrl(): string {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || EXPECTED_CLIENT_ID,
        redirect_uri: GOOGLE_DRIVE_REDIRECT_URI,
        response_type: 'code',
        scope: GOOGLE_DRIVE_SCOPES.join(' '),
        access_type: 'offline',
        // consent forces Google to issue a fresh refresh token every time.
        prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function extractCode(input: string): string | null {
    const text = (input || '').trim();
    if (!text) return null;
    try {
        const u = new URL(text);
        return u.searchParams.get('code');
    } catch {
        // A bare code pasted on its own (they start "4/").
        return /^4\/[\w-]+$/.test(text) ? text : null;
    }
}

async function connectDrive(req: VercelRequest, res: VercelResponse, adminId: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set in Vercel.' });
    }
    const code = extractCode(String(req.body?.callbackUrl || ''));
    if (!code) {
        return res.status(400).json({ error: 'Paste the whole address of the page Google sent you to — it contains "code=".' });
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code, client_id: clientId, client_secret: clientSecret,
            redirect_uri: GOOGLE_DRIVE_REDIRECT_URI, grant_type: 'authorization_code',
        }),
    });
    const tokens: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
        const why = tokens.error === 'invalid_grant'
            ? 'That code was already used or has expired (they last a few minutes). Tap CONNECT again and paste the new address.'
            : `${tokens.error || tokenRes.status}${tokens.error_description ? ` — ${tokens.error_description}` : ''}`;
        return res.status(400).json({ error: `Google refused the code: ${why}` });
    }
    if (!tokens.refresh_token) {
        return res.status(400).json({ error: 'Google did not issue a refresh token. Tap CONNECT again and approve every permission.' });
    }
    if (typeof tokens.scope !== 'string' || !tokens.scope.split(' ').includes('https://www.googleapis.com/auth/drive')) {
        return res.status(400).json({ error: 'Full Google Drive access was not granted. Tap CONNECT again and tick the Drive permission.' });
    }

    // Prove the new token is the right account before replacing the old one:
    // it must see the folder client galleries are created in.
    const auth = { Authorization: `Bearer ${tokens.access_token}` };
    const about: any = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', { headers: auth })
        .then((r) => r.json()).catch(() => ({}));
    const accountEmail: string | null = about?.user?.emailAddress || null;
    const folderId = process.env.CLIENT_GALLERIES_DRIVE_FOLDER_ID;
    if (folderId) {
        const f = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,capabilities(canAddChildren)&supportsAllDrives=true`, { headers: auth });
        const folder: any = await f.json().catch(() => ({}));
        if (!f.ok || !folder?.capabilities?.canAddChildren) {
            return res.status(400).json({
                error: `Signed in as ${accountEmail || 'an unknown account'}, which cannot add to the client galleries folder. Sign in with the Google account that owns the gallery Drive.`,
            });
        }
    }

    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.from('google_oauth_credentials').upsert({
        key: DRIVE_CREDENTIAL_KEY,
        refresh_token: tokens.refresh_token,
        account_email: accountEmail,
        scope: tokens.scope,
        updated_by: adminId,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    if (error) return res.status(500).json({ error: `Could not save the new connection: ${error.message}` });
    clearGoogleTokenCache();
    return res.status(200).json({ ok: true, accountEmail });
}

/** The client that issued the original refresh token — see scripts/setup-google-oauth.ts. */
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

    const action = req.method === 'POST' ? (req.body?.action as string | undefined) : undefined;
    if (action === 'auth_url') return res.status(200).json({ url: driveAuthUrl() });
    if (action === 'connect') return connectDrive(req, res, admin.id);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const { token: storedOrEnvToken, source: refreshTokenSource } = await getGoogleRefreshToken();
    const refreshToken = storedOrEnvToken || undefined;

    const report: Record<string, unknown> = {
        // Which deployment answered, and which environment's variables it holds.
        // A secret that "was updated" but still reads the same value means the
        // function never received it — set on the wrong environment, or a
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
        // 'database' = reconnected from the admin panel; 'env' = the Vercel variable.
        refreshTokenSource,
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
                        ? 'The client is valid, but the refresh token is not — revoked, expired, or issued by a different client_id.'
                        : null,
            },
        });
    } catch (err: any) {
        return res.status(200).json({ ...report, tokenExchange: { attempted: true, ok: false, networkError: err?.message } });
    }
}
