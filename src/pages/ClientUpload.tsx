/**
 * Client Upload — /upload/:token
 *
 * A client opens this from a link in an email. No account, no sign-in: the
 * token in the URL is the whole credential. They drop files, the files go
 * straight to storage via signed URLs, and the server mirrors them into the
 * Drive folder cut for that client.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    ArrowUpTrayIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

interface LinkMeta {
    client_name: string;
    project_name: string | null;
    intro: string | null;
    max_files: number;
    max_file_mb: number;
    remaining: number;
}

type FileState = 'queued' | 'uploading' | 'done' | 'error';

interface QueuedFile {
    file: File;
    state: FileState;
    error?: string;
    path?: string;
    name?: string;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientUpload() {
    const { token = '' } = useParams();
    const [meta, setMeta] = useState<LinkMeta | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [queue, setQueue] = useState<QueuedFile[]>([]);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState<number | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/client-uploads/link?token=${encodeURIComponent(token)}`);
                const body = await res.json();
                if (cancelled) return;
                if (!res.ok) setLoadError(body?.error || 'This upload link is not valid.');
                else setMeta(body);
            } catch {
                if (!cancelled) setLoadError('We could not reach the server. Try again in a moment.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const addFiles = useCallback((files: FileList | null) => {
        if (!files?.length) return;
        setSendError(null);
        setQueue(prev => {
            const existing = new Set(prev.map(q => `${q.file.name}:${q.file.size}`));
            const additions = Array.from(files)
                .filter(f => !existing.has(`${f.name}:${f.size}`))
                .map(file => ({ file, state: 'queued' as FileState }));
            return [...prev, ...additions];
        });
    }, []);

    function removeAt(index: number) {
        setQueue(prev => prev.filter((_, i) => i !== index));
    }

    async function handleSend() {
        if (!queue.length || sending) return;
        setSending(true);
        setSendError(null);

        try {
            const pending = queue.filter(q => q.state !== 'done');

            const signRes = await fetch('/api/client-uploads/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    files: pending.map(q => ({ name: q.file.name, size: q.file.size, type: q.file.type })),
                }),
            });
            const signed = await signRes.json();
            if (!signRes.ok) throw new Error(signed?.error || 'Upload could not be started.');

            setQueue(prev => prev.map(q => (q.state === 'done' ? q : { ...q, state: 'uploading' })));

            const uploaded: Array<{ path: string; name: string; size: number; type: string }> = [];
            for (const [index, item] of pending.entries()) {
                const target = signed.files[index];
                const { error } = await supabase.storage
                    .from(signed.bucket)
                    .uploadToSignedUrl(target.path, target.token, item.file);

                setQueue(prev =>
                    prev.map(q =>
                        q.file === item.file
                            ? { ...q, state: error ? 'error' : 'done', error: error?.message, path: target.path }
                            : q
                    )
                );
                if (!error) {
                    uploaded.push({
                        path: target.path,
                        name: target.name,
                        size: item.file.size,
                        type: item.file.type,
                    });
                }
            }

            if (!uploaded.length) throw new Error('None of the files finished uploading. Please try again.');

            const recordRes = await fetch('/api/client-uploads/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, batch_id: signed.batch_id, note, files: uploaded }),
            });
            const recorded = await recordRes.json();
            if (!recordRes.ok) throw new Error(recorded?.error || 'Upload finished but could not be filed.');

            setSent(recorded.received);
        } catch (err: any) {
            setSendError(err?.message || 'Something went wrong. Please try again.');
        } finally {
            setSending(false);
        }
    }

    const shell = 'min-h-screen bg-black text-white px-4 sm:px-6 py-16';

    if (loading) {
        return (
            <div className={shell}>
                <p className="max-w-2xl mx-auto text-white/40 text-sm uppercase tracking-[0.3em]">Loading…</p>
            </div>
        );
    }

    if (loadError || !meta) {
        return (
            <div className={shell}>
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl font-black uppercase tracking-widest mb-4" style={{ borderRadius: 0 }}>
                        LINK UNAVAILABLE
                    </h1>
                    <p className="text-white/60 text-base leading-relaxed">{loadError}</p>
                    <p className="text-white/40 text-sm mt-6">
                        Reply to the email you got this from and we'll send you a fresh one.
                    </p>
                </div>
            </div>
        );
    }

    const title = meta.project_name ? `${meta.client_name} — ${meta.project_name}` : meta.client_name;

    if (sent !== null) {
        return (
            <div className={shell}>
                <div className="max-w-2xl mx-auto">
                    <CheckCircleIcon className="w-12 h-12 text-white mb-6" />
                    <h1 className="text-4xl font-black uppercase tracking-widest mb-4">GOT THEM</h1>
                    <p className="text-white/70 text-base leading-relaxed mb-8">
                        {sent} file{sent === 1 ? '' : 's'} received. We'll take it from here — you'll hear from us once
                        they're in the build.
                    </p>
                    <button
                        onClick={() => { setSent(null); setQueue([]); setNote(''); }}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-[0.3em] transition-colors"
                        style={{ borderRadius: 0 }}
                    >
                        Send more
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={shell}>
            <Helmet>
                <title>THE LOST+UNFOUNDS | Upload Your Assets</title>
                <meta
                    name="description"
                    content="A private upload link for sending photos, logos, and brand assets to THE LOST+UNFOUNDS."
                />
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>

            <div className="max-w-2xl mx-auto">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-3">
                    THE LOST+UNFOUNDS
                </p>
                <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-widest mb-6">UPLOAD YOUR ASSETS</h1>
                <p className="text-white/70 text-base leading-relaxed mb-2">{title}</p>
                <p className="text-white/60 text-base leading-relaxed mb-10">
                    {meta.intro ||
                        `Drop in anything you've got — photos, your logo, brand colors, a mood board, screenshots of work you like. If there's content sitting on your phone or a hard drive that never made it onto a site, send that too. We can work it into the build.`}
                </p>

                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                    onClick={() => inputRef.current?.click()}
                    className={`${dragging ? 'bg-white/10' : 'bg-white/5'} hover:bg-white/10 transition-colors cursor-pointer px-6 py-16 text-center`}
                    style={{ borderRadius: 0 }}
                >
                    <ArrowUpTrayIcon className="w-8 h-8 mx-auto text-white/60 mb-4" />
                    <p className="text-white text-sm font-bold uppercase tracking-[0.2em]">Drop files here</p>
                    <p className="text-white/40 text-xs mt-2">
                        or tap to choose · up to {meta.remaining} files · {meta.max_file_mb}MB each
                    </p>
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,application/pdf,.zip"
                        className="hidden"
                        onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
                    />
                </div>

                {queue.length > 0 && (
                    <ul className="mt-6 space-y-1">
                        {queue.map((item, index) => (
                            <li
                                key={`${item.file.name}-${index}`}
                                className="flex items-center gap-3 bg-white/5 px-4 py-3"
                                style={{ borderRadius: 0 }}
                            >
                                <span className="flex-1 min-w-0 truncate text-sm text-white">{item.file.name}</span>
                                <span className="text-xs text-white/40 tabular-nums">{formatSize(item.file.size)}</span>
                                {item.state === 'done' && <CheckCircleIcon className="w-4 h-4 text-green-400 shrink-0" />}
                                {item.state === 'error' && (
                                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
                                )}
                                {item.state === 'uploading' && (
                                    <span className="text-[10px] uppercase tracking-widest text-white/40">Sending</span>
                                )}
                                {item.state === 'queued' && !sending && (
                                    <button
                                        onClick={e => { e.stopPropagation(); removeAt(index); }}
                                        className="text-white/40 hover:text-white transition-colors"
                                        aria-label={`Remove ${item.file.name}`}
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={3}
                    placeholder="Anything we should know about these? (optional)"
                    className="mt-6 w-full bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:outline-none transition-colors resize-none"
                    style={{ borderRadius: 0 }}
                />

                {sendError && <p className="mt-4 text-sm text-red-400">{sendError}</p>}

                <button
                    onClick={handleSend}
                    disabled={!queue.length || sending}
                    className="mt-6 w-full px-6 py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
                    style={{ borderRadius: 0 }}
                >
                    {sending ? 'Sending…' : `Send ${queue.length || ''} file${queue.length === 1 ? '' : 's'}`.trim()}
                </button>

                <p className="mt-6 text-xs text-white/30 leading-relaxed">
                    This link is private to you. Files go straight to our working folder for this project — they're
                    never published anywhere without your say-so.
                </p>
            </div>
        </div>
    );
}
