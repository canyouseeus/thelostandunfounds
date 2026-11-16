/**
 * Google Drive connection — Admin → Gallery, above the tabs.
 *
 * Every gallery upload writes to Drive with the owner's OAuth refresh token.
 * When Google refuses it (`invalid_grant`), uploads fail with "Could not create
 * the gallery's Google Drive folder". This panel checks the token on load and,
 * when it is dead, walks the owner through reconnecting from any device:
 *   1. CONNECT opens Google's consent screen in a new tab.
 *   2. Google then sends the browser to a localhost page that will not load —
 *      that is expected. Its address carries the one-time code.
 *   3. Paste that address here; SAVE stores the new token (server-side only).
 * Admin-only: the endpoint checks the signed-in admin session.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type Status =
    | { state: 'checking' }
    | { state: 'ok'; source: string | null }
    | { state: 'broken'; reason: string };

async function call(body?: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/google-oauth-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify(body || {}),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
}

export default function GoogleDriveConnection() {
    const [status, setStatus] = useState<Status>({ state: 'checking' });
    const [open, setOpen] = useState(false);
    const [authUrl, setAuthUrl] = useState<string | null>(null);
    const [pasted, setPasted] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedAs, setSavedAs] = useState<string | null>(null);

    const check = useCallback(async () => {
        setStatus({ state: 'checking' });
        try {
            const { ok, json } = await call();
            if (!ok) { setStatus({ state: 'broken', reason: json.error || 'Check failed' }); return; }
            const ex = json.tokenExchange || {};
            if (ex.ok) setStatus({ state: 'ok', source: json.refreshTokenSource || null });
            else setStatus({ state: 'broken', reason: ex.error === 'invalid_grant'
                ? 'Google revoked or expired the Drive sign-in. Uploads will fail until you reconnect.'
                : (ex.errorDescription || ex.error || ex.reason || 'Drive credentials are not working.') });
        } catch (err: any) {
            setStatus({ state: 'broken', reason: err?.message || 'Check failed' });
        }
    }, []);

    useEffect(() => { check(); }, [check]);

    // Fetch the consent link up front so CONNECT is a plain link: a new tab
    // opened after an await is blocked as a pop-up on iPhone.
    useEffect(() => {
        if (!open || authUrl) return;
        call({ action: 'auth_url' }).then(({ json }) => setAuthUrl(json.url || null)).catch(() => {});
    }, [open, authUrl]);

    useEffect(() => { if (status.state === 'broken') setOpen(true); }, [status.state]);

    const save = async () => {
        setSaving(true); setError(null);
        try {
            const { ok, json } = await call({ action: 'connect', callbackUrl: pasted });
            if (!ok) { setError(json.error || 'Could not connect'); return; }
            setSavedAs(json.accountEmail || 'your Google account');
            setPasted(''); setOpen(false);
            await check();
        } catch (err: any) {
            setError(err?.message || 'Could not connect');
        } finally { setSaving(false); }
    };

    if (status.state === 'checking' && !open) {
        return (
            <div className="shrink-0 flex items-center gap-2 py-2 px-3 mb-2 bg-white/[0.03] text-white/40 text-xs">
                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Checking Google Drive…
            </div>
        );
    }

    return (
        <div data-tour="google-drive-connection" className="shrink-0 mb-2">
            {status.state === 'ok' && !open && (
                <div className="flex items-center gap-2 py-2 px-3 bg-green-500/10 text-green-400 text-xs">
                    <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">Google Drive connected{savedAs ? ` as ${savedAs}` : ''}.</span>
                    <button data-tour="google-drive-reconnect" onClick={() => setOpen(true)} className="text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white">
                        Reconnect
                    </button>
                </div>
            )}

            {(status.state === 'broken' || open) && (
                <div className="bg-red-500/10 p-4 text-xs text-white/70 space-y-3">
                    <div className="flex items-start gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold uppercase tracking-widest text-white text-[11px]">
                                {status.state === 'broken' ? 'Google Drive disconnected' : 'Reconnect Google Drive'}
                            </p>
                            {status.state === 'broken' && <p className="mt-1 text-white/60">{status.reason}</p>}
                        </div>
                    </div>

                    <ol className="list-decimal pl-5 space-y-2 text-white/60">
                        <li>
                            Tap CONNECT and sign in with the Google account that owns the gallery Drive. Allow every permission.
                            <div className="mt-2">
                                <a
                                    data-tour="google-drive-connect"
                                    href={authUrl || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-disabled={!authUrl}
                                    className={`inline-block px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${authUrl ? 'bg-white text-black hover:bg-white/80' : 'bg-white/10 text-white/30 pointer-events-none'}`}
                                >
                                    Connect
                                </a>
                            </div>
                        </li>
                        <li>Google then opens a page that won't load ("can't connect to localhost"). That is expected. Copy that page's whole address from the address bar.</li>
                        <li>
                            Paste it here and tap SAVE.
                            <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                <input
                                    data-tour="google-drive-paste"
                                    value={pasted}
                                    onChange={(e) => setPasted(e.target.value)}
                                    placeholder="http://localhost:9999/oauth2callback?code=…"
                                    className="flex-1 min-w-0 bg-black/40 px-3 py-2 text-white placeholder:text-white/20 outline-none focus:bg-black/60"
                                    autoCapitalize="off" autoCorrect="off" spellCheck={false}
                                />
                                <button
                                    data-tour="google-drive-save"
                                    onClick={save}
                                    disabled={saving || !pasted.trim()}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white text-black disabled:opacity-30"
                                >
                                    {saving && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                                    {saving ? 'Saving' : 'Save'}
                                </button>
                            </div>
                        </li>
                    </ol>

                    {error && <p className="text-red-400">{error}</p>}

                    <div className="flex gap-4">
                        <button onClick={check} className="text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white">Check again</button>
                        {status.state === 'ok' && (
                            <button onClick={() => { setOpen(false); setError(null); }} className="text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white">Close</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
