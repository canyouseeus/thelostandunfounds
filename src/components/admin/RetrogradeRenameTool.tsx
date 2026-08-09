/**
 * Retrograde rename — brings a library's Drive filenames up to the current
 * claptrop convention (see scripts/claptrop-namer.ts).
 *
 * The filename is not decoration. Sync derives photos.title from it on every
 * pass, and that title is the alt text on every gallery image, so a rename is
 * the only durable way to change what Google reads. Editing the database
 * directly is reverted within two minutes.
 *
 * This exists as a button rather than a curl because the endpoint is
 * admin-gated: driving it by hand meant someone copying a live access token
 * around. Here the browser's own session supplies it and no credential is
 * ever handled manually.
 *
 * Preview is mandatory. Committing is only possible after a dry run of the
 * same library has returned, and any change to the selection clears that
 * permission — so "apply" can never act on a preview you didn't see.
 */
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface RenameResult {
    renamed: number;
    skipped: number;
    failed: number;
    remaining: number;
    dryRun: boolean;
    librariesProcessed: string[];
    preview: Array<{ from: string; to: string }>;
    skippedUnattributed: string[];
    authError?: string;
}

export default function RetrogradeRenameTool({ librarySlug, libraryName }: { librarySlug?: string; libraryName: string }) {
    // No slug means every library. The endpoint already worked this way — it
    // filters by slug only when one is given — but the UI only ever offered
    // one gallery at a time, which turned a single job into eight.
    const scopeKey = librarySlug ?? '__all__';
    const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
    const [result, setResult] = useState<RenameResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Set only by a completed dry run, and only for the library it ran against.
    const [previewedSlug, setPreviewedSlug] = useState<string | null>(null);

    // Cumulative totals across passes, and a cancel flag the loop checks.
    const [totalRenamed, setTotalRenamed] = useState(0);
    const [passes, setPasses] = useState(0);
    const cancelled = useRef(false);

    /**
     * vercel.json allows this function 300s. The UI was asking for 50, so every
     * pass did a sixth of the work it could and handed the rest back to whoever
     * was holding the phone. 270 leaves headroom under the platform limit.
     */
    const TIME_BUDGET_SECONDS = 270;
    /** Backstop so a bug cannot spin forever against the Drive API. */
    const MAX_PASSES = 60;

    const callRename = async (dryRun: boolean): Promise<RenameResult> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Session expired — sign in again.');
        const res = await fetch('/api/admin/retrograde-rename', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ ...(librarySlug ? { librarySlug } : {}), dryRun, timeBudgetSeconds: TIME_BUDGET_SECONDS }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
        return json;
    };

    const run = async (dryRun: boolean) => {
        setBusy(dryRun ? 'preview' : 'apply');
        setError(null);
        cancelled.current = false;
        if (!dryRun) { setTotalRenamed(0); setPasses(0); }

        try {
            if (dryRun) {
                const json = await callRename(true);
                setResult(json);
                setPreviewedSlug(scopeKey);
                return;
            }

            // Keep going until the library is done. A pass ends at the function's
            // time budget, not at the end of the work, so stopping after one pass
            // just moved the loop into the operator's thumb.
            let carried = 0;
            for (let i = 0; i < MAX_PASSES; i++) {
                const json = await callRename(false);
                carried += json.renamed;
                setResult({ ...json, renamed: carried });
                setTotalRenamed(carried);
                setPasses(i + 1);

                if (json.authError) break;          // credentials — retrying cannot help
                if (json.remaining === 0) break;    // done
                if (cancelled.current) break;
                // No progress and nothing failed means the run is stuck rather
                // than slow; another identical pass would not change that.
                if (json.renamed === 0 && json.failed === 0) break;
            }
            setPreviewedSlug(null); // a commit consumes its approval
        } catch (err: any) {
            setError(err?.message || 'Rename failed');
        } finally {
            setBusy(null);
        }
    };

    const [diag, setDiag] = useState<any>(null);
    // A run can occupy up to its full time budget with no network chatter, so
    // without this the page looks frozen and there is no way to tell a working
    // run from a hung one. Counting up is the only honest signal available:
    // the request is a single call, so real per-file progress is not knowable
    // client-side.
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!busy) { setElapsed(0); return; }
        const t0 = Date.now();
        const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
        return () => clearInterval(id);
    }, [busy]);
    const diagnose = async () => {
        setBusy('preview'); setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/google-oauth-check', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.access_token || ''}` },
            });
            setDiag(await res.json());
        } catch (err: any) {
            setError(err?.message || 'Diagnostic failed');
        } finally { setBusy(null); }
    };

    const canApply = previewedSlug === scopeKey && !!result?.dryRun && result.skipped > 0;

    return (
        <div className="bg-white/[0.03] p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-1">Retrograde Rename</p>
            <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">{libraryName}</h3>
            <p className="text-white/40 text-xs leading-relaxed mb-5">
                Renames Drive files to the current naming convention. Filenames become the alt text on
                every gallery image, so this is what search engines read. Preview first — nothing changes
                until you apply.
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
                <button
                    onClick={() => run(true)}
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                >
                    {busy === 'preview' && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                    {busy === 'preview' ? 'Previewing' : 'Preview Rename'}
                </button>

                <button
                    onClick={() => run(false)}
                    disabled={busy !== null || !canApply}
                    title={canApply ? undefined : 'Run a preview for this library first'}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black"
                >
                    {busy === 'apply' && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                    {busy === 'apply' ? 'Renaming' : 'Apply Rename'}
                </button>
            </div>

            {busy && (
                <div className="flex items-center gap-2 bg-white/[0.03] px-4 py-3 mb-4">
                    <ArrowPathIcon className="w-4 h-4 text-white/40 animate-spin shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-white/60 text-xs">
                            {busy === 'apply'
                                ? `Renaming — ${totalRenamed} done, pass ${passes + 1}, ${elapsed}s elapsed.`
                                : `Working — ${elapsed}s elapsed.`}
                        </p>
                        {busy === 'apply' && (
                            <p className="text-white/30 text-[11px] mt-1">
                                Runs to completion on its own. A pass ends at the function's 270s limit, then the next one starts.
                            </p>
                        )}
                    </div>
                    {busy === 'apply' && (
                        <button
                            onClick={() => { cancelled.current = true; }}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors shrink-0"
                        >
                            Stop after this pass
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-start gap-2 bg-red-500/10 px-4 py-3 mb-4">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-400 text-xs">{error}</p>
                </div>
            )}

            {result?.authError && (
                <div className="flex items-start gap-2 bg-red-500/10 px-4 py-3 mb-4">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1">Google rejected the credentials</p>
                        <p className="text-white/50 text-xs leading-relaxed">{result.authError}</p>
                        <p className="text-white/30 text-[11px] leading-relaxed mt-2">
                            Nothing was renamed. Fix the credentials, then preview again.
                        </p>
                        <button
                            onClick={diagnose}
                            disabled={busy !== null}
                            className="mt-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                        >
                            Diagnose credentials
                        </button>
                        {diag && (
                            <pre className="mt-3 text-[10px] text-white/60 whitespace-pre-wrap break-all bg-black/40 p-3">
{JSON.stringify(diag, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )}

            {!!result?.skippedUnattributed?.length && (
                <div className="flex items-start gap-2 bg-amber-500/10 px-4 py-3 mb-4">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">No photographer set</p>
                        <p className="text-white/50 text-xs leading-relaxed">
                            Refusing to rename {result?.skippedUnattributed?.join(', ')}. The handle in a filename is a
                            photographer credit, and renaming without one would credit the wrong person. Set the
                            photographer handle first. Any other library in this run was processed normally.
                        </p>
                    </div>
                </div>
            )}

            {result && !result.skippedUnattributed?.length && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-6">
                        <Stat label={result.dryRun ? 'Would rename' : 'Renamed'} value={result.dryRun ? result.skipped : result.renamed} />
                        <Stat label="Remaining" value={result.remaining} />
                        <Stat label="Failed" value={result.failed} accent={result.failed > 0 ? 'text-red-400' : undefined} />
                    </div>

                    {result.dryRun && result.skipped === 0 && (
                        <div className="flex items-center gap-2 bg-white/[0.03] px-4 py-3">
                            <CheckCircleIcon className="w-4 h-4 text-green-400 shrink-0" />
                            <p className="text-white/60 text-xs">Every file already matches the current convention.</p>
                        </div>
                    )}

                    {result.preview.length > 0 && (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3">
                                Proposed · showing {result.preview.length} of {result.skipped}
                            </p>
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {result.preview.map((p, i) => (
                                    <div key={i} className="bg-white/[0.02] px-4 py-3">
                                        <p className="text-white/30 text-[11px] font-mono break-all">{p.from}</p>
                                        <p className="text-white text-[11px] font-mono break-all mt-1">→ {p.to}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!result.dryRun && result.remaining > 0 && (
                        <p className="text-white/40 text-xs">
                            {result.remaining} left — the run stops at its time budget. Apply again to continue.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
    return (
        <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">{label}</p>
            <p className={`text-2xl font-black ${accent || 'text-white'}`}>{value}</p>
        </div>
    );
}
