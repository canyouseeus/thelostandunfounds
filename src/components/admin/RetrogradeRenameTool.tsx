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
import { useState } from 'react';
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
}

export default function RetrogradeRenameTool({ librarySlug, libraryName }: { librarySlug: string; libraryName: string }) {
    const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
    const [result, setResult] = useState<RenameResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Set only by a completed dry run, and only for the library it ran against.
    const [previewedSlug, setPreviewedSlug] = useState<string | null>(null);

    const run = async (dryRun: boolean) => {
        setBusy(dryRun ? 'preview' : 'apply');
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('Session expired — sign in again.');

            const res = await fetch('/api/admin/retrograde-rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ librarySlug, dryRun, timeBudgetSeconds: 50 }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);

            setResult(json);
            if (dryRun) setPreviewedSlug(librarySlug);
            else setPreviewedSlug(null); // a commit consumes its approval
        } catch (err: any) {
            setError(err?.message || 'Rename failed');
        } finally {
            setBusy(null);
        }
    };

    const canApply = previewedSlug === librarySlug && !!result?.dryRun && result.skipped > 0;

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

            {error && (
                <div className="flex items-start gap-2 bg-red-500/10 px-4 py-3 mb-4">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-400 text-xs">{error}</p>
                </div>
            )}

            {result?.skippedUnattributed?.includes(librarySlug) && (
                <div className="flex items-start gap-2 bg-amber-500/10 px-4 py-3 mb-4">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">No photographer set</p>
                        <p className="text-white/50 text-xs leading-relaxed">
                            Refusing to rename. The handle in a filename is a photographer credit, and renaming
                            without one would credit the wrong person. Set this library's photographer handle first.
                        </p>
                    </div>
                </div>
            )}

            {result && !result.skippedUnattributed?.includes(librarySlug) && (
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
